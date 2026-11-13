import { calculate } from "./calculation.ts";
import { validateLead, type LeadInput } from "./validation.ts";

export const STORAGE_KEY = "chisto.demo.orders.v1";
export const STATUSES = [
  "Новая",
  "Связались",
  "Согласована",
  "Завершена",
] as const;
export type OrderStatus = (typeof STATUSES)[number];
export interface DemoOrder extends LeadInput {
  id: string;
  createdAt: string;
  total: number;
  status: OrderStatus;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export function readOrders(storage: StorageLike): DemoOrder[] {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    throw new Error(
      "Хранилище браузера недоступно. Разрешите локальное хранение данных и попробуйте снова.",
    );
  }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.orders) ||
      parsed.orders.length > 200
    )
      throw new Error();
    const ids = new Set<string>();
    return parsed.orders.map((v: DemoOrder) => {
      if (
        !v ||
        typeof v.id !== "string" ||
        !/^[a-zA-Z0-9-]{8,80}$/.test(v.id) ||
        ids.has(v.id) ||
        typeof v.createdAt !== "string" ||
        Number.isNaN(Date.parse(v.createdAt)) ||
        !STATUSES.includes(v.status)
      )
        throw new Error();
      const { data } = validateLead(v, false);
      if (!data) throw new Error();
      ids.add(v.id);
      return {
        ...data,
        id: v.id,
        createdAt: v.createdAt,
        status: v.status,
        total: calculate(data.options).total,
      };
    });
  } catch {
    throw new Error(
      "Сохранённые демо-данные повреждены или имеют неизвестный формат. Очистите их в кабинете, чтобы начать заново.",
    );
  }
}
export function writeOrders(storage: StorageLike, orders: DemoOrder[]) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, orders }));
  } catch {
    throw new Error(
      "Не удалось сохранить данные. Возможно, хранилище отключено или заполнено. Заявка не сохранена.",
    );
  }
}
export function saveDemo(
  storage: StorageLike,
  input: LeadInput,
  id: string,
): DemoOrder {
  const { data } = validateLead(input);
  if (!data) throw new Error("Проверьте поля заявки.");
  const orders = readOrders(storage);
  const existing = orders.find((order) => order.id === id);
  if (existing) return existing;
  if (orders.length >= 200)
    throw new Error(
      "Сохранено 200 демо-заявок. Очистите данные в кабинете, чтобы продолжить.",
    );
  const order: DemoOrder = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    status: "Новая",
    total: calculate(data.options).total,
  };
  writeOrders(storage, [order, ...orders]);
  return order;
}
