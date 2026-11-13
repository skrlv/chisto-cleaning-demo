import { createHash } from "node:crypto";
import { calculate, rubles } from "../lib/calculation.ts";
import { LIMITS, TARIFFS } from "../lib/tariffs.ts";
import { validateLead, type LeadInput } from "../lib/validation.ts";

export interface LeadEnvironment {
  APP_MODE?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  TRUST_PROXY?: string;
}
export interface HandlerDependencies {
  env: () => LeadEnvironment;
  fetch?: typeof globalThis.fetch;
  now?: () => number;
  timeoutMs?: number;
}
type Attempt = {
  fingerprint: string;
  state: "pending" | "sent" | "failed";
  expiresAt: number;
};
const MAX_BODY_BYTES = 16_384;
const CACHE_LIMIT = 1_000;
const ATTEMPT_TTL = 24 * 60 * 60 * 1_000;
const RATE_WINDOW = 60_000;
const RATE_LIMIT = 5;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function json(status: number, body: object, headers?: Record<string, string>) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function hasSameOrigin(request: Request, env: LeadEnvironment) {
  try {
    const requestUrl = new URL(request.url);
    let protocol = requestUrl.protocol;
    const forwardedProtocol = request.headers.get("X-Forwarded-Proto");
    if (env.TRUST_PROXY === "1" && forwardedProtocol !== null) {
      if (forwardedProtocol !== "http" && forwardedProtocol !== "https")
        return false;
      protocol = `${forwardedProtocol}:`;
    }
    if (protocol !== "http:" && protocol !== "https:") return false;
    // Next may reconstruct request.url with "localhost" even when a visitor uses
    // 127.0.0.1. The actual Host header preserves the visitor-facing authority.
    const host = request.headers.get("Host") ?? requestUrl.host;
    if (
      !/^(?:[a-zA-Z0-9.-]+|\[[a-fA-F0-9:.]+\])(?::\d{1,5})?$/.test(host)
    )
      return false;
    const expected = new URL(`${protocol}//${host}`);
    const origin = request.headers.get("Origin");
    if (!origin) return false;
    const parsedOrigin = new URL(origin);
    // Require a serialized HTTP(S) origin, excluding credentials, paths,
    // fragments, multiple origins and opaque values such as "null".
    return parsedOrigin.origin === origin && expected.origin === origin;
  } catch {
    return false;
  }
}

async function boundedBody(request: Request) {
  if (Number(request.headers.get("Content-Length")) > MAX_BODY_BYTES)
    throw new Error("BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_JSON");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } finally {
    reader.releaseLock();
  }
}

function canonicalInput(input: LeadInput): LeadInput {
  const { area, type, windows, fridge, oven } = input.options;
  return {
    contact: input.contact,
    options: { area, type, windows, fridge, oven },
  };
}

function telegramText(input: LeadInput, id: string) {
  const result = calculate(input.options);
  return [
    `Новая заявка «Чисто» · ${id}`,
    `Имя: ${input.contact.name}`,
    `Телефон: ${input.contact.phone}`,
    `Желаемая дата: ${input.contact.date || "не указана"} (не бронирование)`,
    `Уборка: ${TARIFFS[input.options.type].title}`,
    `Площадь: ${input.options.area} м²; тариф: ${rubles(result.rate)}/м²`,
    `Основная уборка: ${rubles(result.base)}${result.minimumApplied ? ` (применён минимум ${rubles(LIMITS.minimum)})` : ""}`,
    ...result.extras.map((extra) => `${extra.label}: ${rubles(extra.price)}`),
    `Предварительный итог: ${rubles(result.total)}`,
    `Комментарий: ${input.contact.comment || "не указан"}`,
    "Окончательный объём и стоимость согласовываются с клиентом.",
  ].join("\n");
}

/** One process only: use shared durable rate/idempotency storage before a real multi-instance deployment. */
export function createLeadHandler(dependencies: HandlerDependencies) {
  const send = dependencies.fetch ?? globalThis.fetch;
  const now = dependencies.now ?? Date.now;
  const attempts = new Map<string, Attempt>();
  const rateBuckets = new Map<string, { count: number; expiresAt: number }>();
  const timeoutMs = dependencies.timeoutMs ?? 8_000;

  return async function handleLead(request: Request): Promise<Response> {
    if (request.method !== "POST")
      return json(
        405,
        { ok: false, error: "Используйте POST." },
        { Allow: "POST" },
      );
    const env = dependencies.env();
    if (!hasSameOrigin(request, env))
      return json(403, {
        ok: false,
        error: "Отправка разрешена только с этого сайта.",
      });
    if (
      !request.headers
        .get("Content-Type")
        ?.toLowerCase()
        .startsWith("application/json")
    )
      return json(415, { ok: false, error: "Ожидается JSON." });
    if (env.APP_MODE !== "telegram")
      return json(503, {
        ok: false,
        error:
          "Реальная отправка отключена. Сайт работает в демонстрационном режиме.",
      });
    if (!env.TELEGRAM_BOT_TOKEN?.trim() || !env.TELEGRAM_CHAT_ID?.trim())
      return json(503, {
        ok: false,
        error: "Отправка не настроена. Заявка не отправлена.",
      });
    const id = request.headers.get("Idempotency-Key") ?? "";
    if (!UUID.test(id))
      return json(400, {
        ok: false,
        error: "Некорректный идентификатор заявки. Обновите страницу.",
      });

    const timestamp = now();
    for (const [key, attempt] of attempts)
      if (attempt.expiresAt <= timestamp) attempts.delete(key);
    for (const [key, bucket] of rateBuckets)
      if (bucket.expiresAt <= timestamp) rateBuckets.delete(key);
    // X-Forwarded-For is ignored unless the operator explicitly trusts an upstream proxy.
    const clientKey =
      env.TRUST_PROXY === "1"
        ? request.headers
            .get("X-Forwarded-For")
            ?.split(",")[0]
            ?.trim()
            .slice(0, 100) || "shared"
        : "shared";
    const bucket = rateBuckets.get(clientKey);
    if (bucket && bucket.count >= RATE_LIMIT)
      return json(
        429,
        { ok: false, error: "Слишком много попыток. Подождите минуту." },
        {
          "Retry-After": String(
            Math.max(1, Math.ceil((bucket.expiresAt - timestamp) / 1000)),
          ),
        },
      );
    if (!bucket && rateBuckets.size >= CACHE_LIMIT)
      return json(503, {
        ok: false,
        error: "Сервис временно занят. Попробуйте позже.",
      });
    if (bucket) bucket.count += 1;
    else
      rateBuckets.set(clientKey, {
        count: 1,
        expiresAt: timestamp + RATE_WINDOW,
      });

    let raw: unknown;
    try {
      raw = await boundedBody(request);
    } catch (error) {
      if (error instanceof Error && error.message === "BODY_TOO_LARGE")
        return json(413, { ok: false, error: "Заявка слишком большая." });
      return json(400, { ok: false, error: "Некорректный JSON." });
    }
    const parsed = validateLead(raw, true, new Date(timestamp));
    if (!parsed.data)
      return json(400, {
        ok: false,
        error: "Проверьте поля заявки.",
        fields: parsed.errors,
      });
    const input = canonicalInput(parsed.data);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const previous = attempts.get(id);
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        return json(409, {
          ok: false,
          error:
            "Этот идентификатор уже использован для другой заявки. Обновите страницу.",
        });
      if (previous.state === "sent") return json(200, { ok: true, id });
      if (previous.state === "pending")
        return json(409, {
          ok: false,
          error: "Эта заявка уже отправляется. Дождитесь результата.",
        });
      return json(409, {
        ok: false,
        error:
          "Предыдущая отправка не подтверждена. Автоматический повтор заблокирован, чтобы избежать дубликата. Проверьте получение заявки перед новой попыткой.",
      });
    }
    if (attempts.size >= CACHE_LIMIT)
      return json(503, {
        ok: false,
        error: "Сервис временно занят. Попробуйте позже.",
      });
    const attempt: Attempt = {
      fingerprint,
      state: "pending",
      expiresAt: timestamp + ATTEMPT_TTL,
    };
    attempts.set(id, attempt);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        send(
          `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN.trim()}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: env.TELEGRAM_CHAT_ID.trim(),
              text: telegramText(input, id),
            }),
            signal: controller.signal,
          },
        ).then(async (response) => ({
          response,
          body: (await response.json()) as {
            ok?: unknown;
            result?: { message_id?: unknown };
          },
        })),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error("TIMEOUT"));
          }, timeoutMs);
        }),
      ]);
      if (
        !result.response.ok ||
        result.body?.ok !== true ||
        typeof result.body.result?.message_id !== "number"
      )
        throw new Error("TELEGRAM_REJECTED");
      attempt.state = "sent";
      return json(200, { ok: true, id });
    } catch {
      // A timeout can occur after delivery: do not automatically send this key again.
      attempt.state = "failed";
      return json(502, {
        ok: false,
        error:
          "Отправка в Telegram не подтверждена. Проверьте получение заявки перед повторной отправкой.",
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}
