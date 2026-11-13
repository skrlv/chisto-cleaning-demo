import { EXTRAS, LIMITS, TARIFFS, type CleaningType } from "./tariffs.ts";

export interface CleaningOptions {
  area: number;
  type: CleaningType;
  windows: number;
  fridge: boolean;
  oven: boolean;
}
export const DEFAULT_OPTIONS: CleaningOptions = {
  area: 50,
  type: "maintenance",
  windows: 0,
  fridge: false,
  oven: false,
};
export function isCleaningOptions(value: unknown): value is CleaningOptions {
  if (!value || typeof value !== "object") return false;
  const v = value as CleaningOptions;
  return (
    Number.isInteger(v.area) &&
    v.area >= LIMITS.minArea &&
    v.area <= LIMITS.maxArea &&
    typeof v.type === "string" &&
    Object.hasOwn(TARIFFS, v.type) &&
    Number.isInteger(v.windows) &&
    v.windows >= 0 &&
    v.windows <= LIMITS.maxWindows &&
    typeof v.fridge === "boolean" &&
    typeof v.oven === "boolean"
  );
}
export function calculate(options: CleaningOptions) {
  if (!isCleaningOptions(options))
    throw new Error("Некорректные параметры уборки");
  const rate = TARIFFS[options.type].rate;
  const subtotal = options.area * rate;
  const base = Math.max(LIMITS.minimum, subtotal);
  const extras = [
    ...(options.windows
      ? [
          {
            label: `Мытьё окон · ${options.windows} шт. × ${rubles(EXTRAS.window)}`,
            price: options.windows * EXTRAS.window,
          },
        ]
      : []),
    ...(options.fridge
      ? [{ label: "Внутри холодильника", price: EXTRAS.fridge }]
      : []),
    ...(options.oven ? [{ label: "Внутри духовки", price: EXTRAS.oven }] : []),
  ];
  return {
    rate,
    subtotal,
    base,
    minimumApplied: base > subtotal,
    extras,
    total: base + extras.reduce((sum, extra) => sum + extra.price, 0),
  };
}
export const rubles = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
export function boundedInteger(
  raw: string,
  min: number,
  max: number,
  fallback: number,
) {
  if (!raw.trim() || !Number.isFinite(Number(raw))) return fallback;
  return Math.min(max, Math.max(min, Math.round(Number(raw))));
}
