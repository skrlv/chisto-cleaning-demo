import { isCleaningOptions, type CleaningOptions } from "./calculation.ts";

export interface Contact {
  name: string;
  phone: string;
  date: string;
  comment: string;
}
export interface LeadInput {
  contact: Contact;
  options: CleaningOptions;
}
export type FieldErrors = Partial<Record<keyof Contact | "options", string>>;
export function todayDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}
export function validateLead(
  raw: unknown,
  checkFuture = true,
  now = new Date(),
): { data?: LeadInput; errors: FieldErrors } {
  const value = (
    raw && typeof raw === "object" ? raw : {}
  ) as Partial<LeadInput>;
  const source = (
    value.contact && typeof value.contact === "object" ? value.contact : {}
  ) as Partial<Contact>;
  const contact: Contact = {
    name: typeof source.name === "string" ? source.name.trim() : "",
    phone: typeof source.phone === "string" ? source.phone.trim() : "",
    date: typeof source.date === "string" ? source.date : "",
    comment: typeof source.comment === "string" ? source.comment.trim() : "",
  };
  const errors: FieldErrors = {};
  if (contact.name.length < 2 || contact.name.length > 80)
    errors.name = "Введите имя: от 2 до 80 символов.";
  const digits = contact.phone.replace(/\D/g, "");
  if (
    !/^[+\d\s()\-]+$/.test(contact.phone) ||
    !/^[78]\d{10}$/.test(digits) ||
    contact.phone.length > 30
  )
    errors.phone = "Введите телефон в формате +7 (999) 000-00-00.";
  if (
    contact.date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(contact.date) ||
      Number.isNaN(Date.parse(contact.date)) ||
      new Date(contact.date).toISOString().slice(0, 10) !== contact.date ||
      (checkFuture && contact.date < todayDate(now)))
  )
    errors.date = "Выберите сегодняшнюю или будущую дату.";
  if (contact.comment.length > 1000)
    errors.comment = "Комментарий — не более 1 000 символов.";
  if (!isCleaningOptions(value.options))
    errors.options = "Проверьте параметры расчёта.";
  if (Object.keys(errors).length) return { errors };
  contact.phone = "+7" + digits.slice(1);
  return { data: { contact, options: { ...value.options! } }, errors };
}
