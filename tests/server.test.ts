import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createLeadHandler,
  type LeadEnvironment,
} from "../server/lead-handler.ts";

const origin = "http://localhost:3000";
const env: LeadEnvironment = {
  APP_MODE: "telegram",
  TELEGRAM_BOT_TOKEN: "mock-token",
  TELEGRAM_CHAT_ID: "mock-chat",
};
const valid = {
  contact: {
    name: "Демо клиент",
    phone: "+7 (999) 000-00-00",
    date: "",
    comment: "Тест без внешней отправки",
  },
  options: { area: 50, type: "deep", windows: 2, fridge: false, oven: true },
};
function request(
  input: unknown = valid,
  id: string = randomUUID(),
  headers: Record<string, string> = {},
) {
  return new Request(`${origin}/api/leads`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "Idempotency-Key": id,
      ...headers,
    },
    body: JSON.stringify(input),
  });
}
const success = async () =>
  Response.json({ ok: true, result: { message_id: 42 } });
const handler = (
  fetch: typeof globalThis.fetch = success,
  overrides: Partial<LeadEnvironment> = {},
) =>
  createLeadHandler({
    env: () => ({ ...env, ...overrides }),
    fetch,
    now: () => Date.parse("2026-11-13T12:00:00Z"),
  });

test("demo mode and missing credentials never invoke Telegram or confirm success", async () => {
  let calls = 0;
  const mock = async () => {
    calls++;
    return success();
  };
  for (const overrides of [
    { APP_MODE: "demo" },
    { APP_MODE: undefined },
    { TELEGRAM_BOT_TOKEN: "" },
    { TELEGRAM_CHAT_ID: "" },
  ]) {
    const response = await handler(mock, overrides)(request());
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, false);
  }
  assert.equal(calls, 0);
});

test("server validates input and recomputes 8 800 ₽, ignoring a forged browser price", async () => {
  let payload: { chat_id: string; text: string } | undefined;
  const mock: typeof globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.telegram.org/botmock-token/sendMessage");
    payload = JSON.parse(String(init?.body));
    return success();
  };
  const response = await handler(mock)(
    request({ ...valid, total: 1, options: { ...valid.options, total: 2 } }),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  assert.equal(payload?.chat_id, "mock-chat");
  assert.match(payload!.text, /8\s800\s₽/u);
  assert.match(payload!.text, /50 м²/);
  assert.match(payload!.text, /\+79990000000/);
});

test("invalid contact, past/invalid date and out-of-range options are rejected before network", async () => {
  let calls = 0;
  const mock = async () => {
    calls++;
    return success();
  };
  const invalid = [
    { ...valid, contact: { ...valid.contact, name: "" } },
    { ...valid, contact: { ...valid.contact, phone: "999" } },
    { ...valid, contact: { ...valid.contact, date: "2026-02-30" } },
    { ...valid, contact: { ...valid.contact, date: "2026-11-12" } },
    { ...valid, options: { ...valid.options, area: 301 } },
    { ...valid, options: { ...valid.options, windows: -1 } },
    { ...valid, options: { ...valid.options, type: "__proto__" } },
    null,
  ];
  for (const value of invalid) {
    const response = await handler(mock)(request(value));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).ok, false);
  }
  assert.equal(calls, 0);
});

test("Telegram HTTP failure, API rejection, malformed response and network errors never confirm success", async () => {
  const mocks: (typeof globalThis.fetch)[] = [
    async () => Response.json({ ok: false }, { status: 500 }),
    async () => Response.json({ ok: false, description: "Bad Request" }),
    async () => Response.json({ ok: true }),
    async () => new Response("not JSON"),
    async () => {
      throw new Error("network unavailable");
    },
  ];
  for (const mock of mocks) {
    const response = await handler(mock)(request());
    assert.equal(response.status, 502);
    assert.equal((await response.json()).ok, false);
  }
});

test("timeout returns an error even if a service never responds", async () => {
  let aborted = false;
  const mock: typeof globalThis.fetch = async (_url, init) =>
    new Promise(() => {
      init?.signal?.addEventListener("abort", () => {
        aborted = true;
      });
    });
  const send = createLeadHandler({ env: () => env, fetch: mock, timeoutMs: 5 });
  const response = await send(request());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).ok, false);
  assert.equal(aborted, true);
});

test("successful retries are idempotent and a changed body with the same key conflicts", async () => {
  let calls = 0;
  const send = handler(async () => {
    calls++;
    return success();
  });
  const id = randomUUID();
  assert.equal((await send(request(valid, id))).status, 200);
  assert.equal((await send(request(valid, id))).status, 200);
  assert.equal(
    (
      await send(
        request({ ...valid, options: { ...valid.options, area: 60 } }, id),
      )
    ).status,
    409,
  );
  assert.equal(calls, 1);
});

test("a simultaneous duplicate cannot send twice", async () => {
  let release: (() => void) | undefined;
  let notify: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    notify = resolve;
  });
  const mock: typeof globalThis.fetch = async () => {
    notify!();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return success();
  };
  const send = handler(mock);
  const id = randomUUID();
  const first = send(request(valid, id));
  await started;
  const duplicate = await send(request(valid, id));
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).ok, false);
  release!();
  assert.equal((await first).status, 200);
});

test("failed or ambiguous attempts are retained and are not automatically resent", async () => {
  let calls = 0;
  const send = handler(async () => {
    calls++;
    throw new Error("unknown delivery");
  });
  const id = randomUUID();
  assert.equal((await send(request(valid, id))).status, 502);
  const retry = await send(request(valid, id));
  assert.equal(retry.status, 409);
  assert.equal((await retry.json()).ok, false);
  assert.equal(calls, 1);
});

test("rate limit counts requests, ignores spoofed proxy headers by default and resets after a minute", async () => {
  let time = Date.parse("2026-11-13T12:00:00Z");
  const send = createLeadHandler({
    env: () => env,
    fetch: success,
    now: () => time,
  });
  for (let i = 0; i < 5; i++)
    assert.equal(
      (
        await send(
          request(valid, randomUUID(), { "X-Forwarded-For": `10.0.0.${i}` }),
        )
      ).status,
      200,
    );
  const limited = await send(request());
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "60");
  time += 60_001;
  assert.equal((await send(request())).status, 200);
});

test("cross-origin, unsupported content type, invalid key, malformed and oversized JSON are rejected", async () => {
  let calls = 0;
  const send = handler(async () => {
    calls++;
    return success();
  });
  assert.equal(
    (
      await send(
        request(valid, randomUUID(), { Origin: "https://other.example" }),
      )
    ).status,
    403,
  );
  assert.equal(
    (await send(request(valid, randomUUID(), { "Content-Type": "text/plain" })))
      .status,
    415,
  );
  assert.equal((await send(request(valid, "invalid"))).status, 400);
  const malformed = new Request(`${origin}/api/leads`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "Idempotency-Key": randomUUID(),
    },
    body: "{",
  });
  assert.equal((await send(malformed)).status, 400);
  assert.equal((await send(request({ data: "x".repeat(17_000) }))).status, 413);
  assert.equal(calls, 0);
});

function nextRequest(headers: Record<string, string>) {
  return new Request("http://localhost:3001/api/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": randomUUID(),
      ...headers,
    },
    body: JSON.stringify(valid),
  });
}

test("same-origin uses the actual Host when Next normalizes its URL to localhost", async () => {
  const headers = { Host: "127.0.0.1:3001", Origin: "http://127.0.0.1:3001" };
  assert.equal((await handler()(nextRequest(headers))).status, 200);
  const missingConfig = await handler(success, { TELEGRAM_BOT_TOKEN: "" })(
    nextRequest(headers),
  );
  assert.equal(missingConfig.status, 503);
  assert.match((await missingConfig.json()).error, /Отправка не настроена/);
});

test("origin guard rejects wrong ports, protocol mismatch, malformed origins and unsafe Host values", async () => {
  const badOrigins = [
    "http://127.0.0.1:3002",
    "https://127.0.0.1:3001",
    "null",
    "not-an-origin",
    "http://127.0.0.1:3001/path",
    "http://127.0.0.1:3001/",
    "http://user@127.0.0.1:3001",
    "http://127.0.0.1:3001#fragment",
    "http://127.0.0.1:3001,https://other.example",
  ];
  for (const Origin of badOrigins)
    assert.equal(
      (await handler()(nextRequest({ Host: "127.0.0.1:3001", Origin }))).status,
      403,
    );
  const badHosts = [
    "127.0.0.1:3001@evil.example",
    "evil.example/path",
    "evil.example?query",
    "localhost:70000",
    "http://127.0.0.1:3001",
    "127.0.0.1:3001,evil.example",
    "evil.example\\path",
  ];
  for (const Host of badHosts)
    assert.equal(
      (await handler()(nextRequest({ Host, Origin: "http://127.0.0.1:3001" })))
        .status,
      403,
    );
  assert.equal((await handler()(nextRequest({ Host: "127.0.0.1:3001" }))).status, 403);
});

test("forwarded protocol is used only behind an explicitly trusted proxy", async () => {
  const secureHeaders = {
    Host: "clean.example",
    Origin: "https://clean.example",
    "X-Forwarded-Proto": "https",
  };
  assert.equal((await handler()(nextRequest(secureHeaders))).status, 403);
  assert.equal(
    (await handler(success, { TRUST_PROXY: "1" })(nextRequest(secureHeaders)))
      .status,
    200,
  );
  assert.equal(
    (
      await handler()(
        nextRequest({ ...secureHeaders, Origin: "http://clean.example" }),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await handler(success, { TRUST_PROXY: "1" })(
        nextRequest({ ...secureHeaders, "X-Forwarded-Proto": "https,http" }),
      )
    ).status,
    403,
  );
});

test("origin guard accepts valid IPv6 authorities and normalized default ports", async () => {
  assert.equal(
    (
      await handler()(
        nextRequest({ Host: "[::1]:3001", Origin: "http://[::1]:3001" }),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await handler()(
        nextRequest({ Host: "clean.example:80", Origin: "http://clean.example" }),
      )
    ).status,
    200,
  );
});
