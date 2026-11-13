import { saveDemo } from "./demo-storage.ts";
import type { LeadInput } from "./validation.ts";
export type AppMode = "demo" | "telegram";
export async function submitLead(
  mode: AppMode,
  input: LeadInput,
  id: string,
): Promise<{ id: string }> {
  if (mode === "demo") {
    // This branch performs no network requests.
    try {
      return saveDemo(window.localStorage, input, id);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Хранилище недоступно. Заявка не сохранена.",
      );
    }
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    let response: Response;
    try {
      response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": id },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
    } catch {
      throw new Error(
        "Связь с сервером прервалась. Отправка не подтверждена. Проверьте получение заявки перед повторной попыткой.",
      );
    }
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.ok !== true || body.id !== id)
      throw new Error(
        typeof body?.error === "string"
          ? body.error
          : "Отправка не подтверждена. Проверьте получение заявки перед повторной попыткой.",
      );
    return { id: body.id };
  } finally {
    clearTimeout(timer);
  }
}
