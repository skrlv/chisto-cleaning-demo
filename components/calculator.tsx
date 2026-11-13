"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  boundedInteger,
  calculate,
  rubles,
  type CleaningOptions,
} from "@/lib/calculation";
import { CLEANING_TYPES, EXTRAS, LIMITS, TARIFFS } from "@/lib/tariffs";
import {
  todayDate,
  validateLead,
  type Contact,
  type FieldErrors,
  type LeadInput,
} from "@/lib/validation";
import { submitLead, type AppMode } from "@/lib/submission";
import { Icon } from "./icons";

export default function Calculator({
  options,
  onChange,
  mode,
}: {
  options: CleaningOptions;
  onChange: (value: CleaningOptions) => void;
  mode: AppMode;
}) {
  const [areaDraft, setAreaDraft] = useState(String(options.area));
  const [windowsDraft, setWindowsDraft] = useState(String(options.windows));
  const [busy, setBusy] = useState(false);
  const price = calculate(options);
  const areaInvalid =
    !areaDraft.trim() ||
    !Number.isInteger(Number(areaDraft)) ||
    Number(areaDraft) < 20 ||
    Number(areaDraft) > 300;
  const windowsInvalid =
    !windowsDraft.trim() ||
    !Number.isInteger(Number(windowsDraft)) ||
    Number(windowsDraft) < 0 ||
    Number(windowsDraft) > 20;
  function setArea(raw: string) {
    setAreaDraft(raw);
    if (
      raw.trim() &&
      Number.isInteger(Number(raw)) &&
      Number(raw) >= 20 &&
      Number(raw) <= 300
    )
      onChange({ ...options, area: Number(raw) });
  }
  function normalizeArea() {
    const n = boundedInteger(areaDraft, 20, 300, options.area);
    setAreaDraft(String(n));
    onChange({ ...options, area: n });
  }
  function setWindows(n: number) {
    const bounded = Math.min(20, Math.max(0, n));
    setWindowsDraft(String(bounded));
    onChange({ ...options, windows: bounded });
  }
  return (
    <section
      className="calculator-section section"
      id="calculator"
      aria-labelledby="calculator-title"
    >
      <div className="container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">02 / Чистота начинается с ясности</span>
            <h2 id="calculator-title" tabIndex={-1}>
              Ваша уборка.
              <br />
              <em>Ваш расчёт.</em>
            </h2>
          </div>
          <p>
            Пара простых настроек — и стоимость перед вами.
            <br className="desktop-break" /> Без звонков и обязательств.
          </p>
        </div>
        <div className="calculator-grid">
          <div className="calculator-controls panel">
            <fieldset disabled={busy}>
              <legend className="sr-only">Параметры уборки</legend>
              <div className="control-heading">
                <label htmlFor="area">
                  <span className="control-number" aria-hidden="true">
                    01
                  </span>
                  Площадь квартиры
                </label>
                <div className="area-input">
                  <input
                    id="area"
                    type="number"
                    inputMode="numeric"
                    min={20}
                    max={300}
                    step={1}
                    value={areaDraft}
                    onChange={(e) => setArea(e.target.value)}
                    onBlur={normalizeArea}
                    aria-invalid={areaInvalid}
                    aria-describedby="area-help"
                  />
                  <span>м²</span>
                </div>
              </div>
              <input
                aria-label="Площадь квартиры — ползунок"
                className="area-range"
                type="range"
                min={20}
                max={300}
                step={1}
                value={options.area}
                onChange={(e) => {
                  setAreaDraft(e.target.value);
                  onChange({ ...options, area: Number(e.target.value) });
                }}
                style={
                  {
                    "--range-progress": `${((options.area - 20) / 280) * 100}%`,
                  } as React.CSSProperties
                }
              />
              <div className="range-labels">
                <span>20 м²</span>
                <span>300 м²</span>
              </div>
              <p
                id="area-help"
                className={areaInvalid ? "field-error" : "sr-only"}
              >
                {areaInvalid
                  ? `Введите целое число от 20 до 300. Сейчас расчёт для ${options.area} м². При выходе из поля значение будет исправлено.`
                  : "От 20 до 300 квадратных метров."}
              </p>
              <fieldset className="type-fieldset">
                <legend>
                  <span className="control-number" aria-hidden="true">
                    02
                  </span>
                  Вид уборки
                </legend>
                <div className="type-options">
                  {CLEANING_TYPES.map((type) => (
                    <label
                      className={`type-option ${options.type === type ? "selected" : ""}`}
                      key={type}
                    >
                      <input
                        type="radio"
                        name="cleaning-type"
                        value={type}
                        checked={options.type === type}
                        onChange={() => onChange({ ...options, type })}
                      />
                      <span className="radio-circle" />
                      <strong>{TARIFFS[type].title}</strong>
                      <small>{TARIFFS[type].rate} ₽ / м²</small>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="extras-fieldset">
                <legend>
                  <span className="control-number" aria-hidden="true">
                    03
                  </span>
                  Ещё немного заботы
                </legend>
                <div className="window-row">
                  <div>
                    <label htmlFor="windows">Мытьё окон</label>
                    <small>{rubles(EXTRAS.window)} / окно</small>
                  </div>
                  <div className="stepper">
                    <button
                      type="button"
                      aria-label="Уменьшить количество окон"
                      onClick={() => setWindows(options.windows - 1)}
                      disabled={options.windows === 0}
                    >
                      −
                    </button>
                    <input
                      id="windows"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={20}
                      step={1}
                      value={windowsDraft}
                      aria-invalid={windowsInvalid}
                      aria-describedby="windows-help"
                      onChange={(e) => {
                        const raw = e.target.value;
                        setWindowsDraft(raw);
                        if (
                          raw.trim() &&
                          Number.isInteger(+raw) &&
                          +raw >= 0 &&
                          +raw <= 20
                        )
                          onChange({ ...options, windows: +raw });
                      }}
                      onBlur={() =>
                        setWindows(
                          boundedInteger(windowsDraft, 0, 20, options.windows),
                        )
                      }
                    />
                    <button
                      type="button"
                      aria-label="Увеличить количество окон"
                      onClick={() => setWindows(options.windows + 1)}
                      disabled={options.windows === 20}
                    >
                      +
                    </button>
                  </div>
                </div>
                <p
                  id="windows-help"
                  className={windowsInvalid ? "field-error" : "sr-only"}
                >
                  {windowsInvalid
                    ? "Введите целое число от 0 до 20. При выходе из поля значение будет исправлено."
                    : "От 0 до 20 окон."}
                </p>
                {(["fridge", "oven"] as const).map((key) => (
                  <label className="extra-checkbox" key={key}>
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={(e) =>
                        onChange({ ...options, [key]: e.target.checked })
                      }
                    />
                    <span>
                      {key === "fridge"
                        ? "Внутри холодильника"
                        : "Внутри духовки"}
                    </span>
                    <strong>+{rubles(EXTRAS[key])}</strong>
                  </label>
                ))}
              </fieldset>
            </fieldset>
          </div>
          <aside className="estimate">
            <div className="estimate-heading">
              <span className="eyebrow">Всё прозрачно</span>
              <Icon name="spark" size={30} />
            </div>
            <h3>
              Предварительный
              <br />
              расчёт
            </h3>
            <dl className="price-breakdown">
              <div>
                <dt>{TARIFFS[options.type].title}</dt>
                <dd>{options.area} м²</dd>
              </div>
              <div className="price-subline">
                <dt>
                  {options.area} м² × {rubles(price.rate)} / м²
                </dt>
                <dd>{rubles(price.subtotal)}</dd>
              </div>
              {price.minimumApplied && (
                <div className="minimum-line">
                  <dt>Минимум за основную уборку</dt>
                  <dd>{rubles(LIMITS.minimum)}</dd>
                </div>
              )}
              <div className="base-price">
                <dt>Основная уборка</dt>
                <dd>{rubles(price.base)}</dd>
              </div>
              {price.extras.map((extra) => (
                <div key={extra.label}>
                  <dt>{extra.label}</dt>
                  <dd>{rubles(extra.price)}</dd>
                </div>
              ))}
              {!price.extras.length && (
                <div className="price-subline">
                  <dt>Дополнительные услуги</dt>
                  <dd>Не выбраны</dd>
                </div>
              )}
            </dl>
            <div className="estimate-total">
              <span>Итого</span>
              <output
                aria-live="polite"
                aria-atomic="true"
                aria-label="Итоговая стоимость"
              >
                <span key={price.total}>{rubles(price.total)}</span>
              </output>
            </div>
            <a href="#request" className="button button-light">
              {mode === "demo" ? "Оставить демо-заявку" : "Оставить заявку"}
              <Icon name="arrow" size={19} />
            </a>
            <p className="estimate-note">
              Расчёт предварительный. Окончательный объём работ и стоимость
              согласовываются до уборки.
            </p>
            <p className="demo-tariff">Условные демонстрационные тарифы</p>
          </aside>
        </div>
        <RequestForm
          options={options}
          mode={mode}
          onBusy={setBusy}
          invalidOptions={areaInvalid || windowsInvalid}
        />
      </div>
    </section>
  );
}

const EMPTY_CONTACT: Contact = { name: "", phone: "", date: "", comment: "" };
function RequestForm({
  options,
  mode,
  onBusy,
  invalidOptions,
}: {
  options: CleaningOptions;
  mode: AppMode;
  onBusy: (busy: boolean) => void;
  invalidOptions: boolean;
}) {
  const [contact, setContact] = useState<Contact>({ ...EMPTY_CONTACT });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    id: string;
    input: LeadInput;
  } | null>(null);
  const [minimumDate, setMinimumDate] = useState("");
  const inFlight = useRef(false);
  const requestKey = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const focusNewRequest = useRef(false);
  const id = useId();
  useEffect(() => {
    setMinimumDate(todayDate());
  }, []);
  useEffect(() => {
    if (success) {
      statusRef.current?.focus();
    } else if (focusNewRequest.current) {
      focusNewRequest.current = false;
      formRef.current
        ?.querySelector<HTMLInputElement>('input[name="name"]')
        ?.focus();
    }
  }, [success]);
  function update(key: keyof Contact, value: string) {
    setContact((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setError("");
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || success) return;
    const checked = validateLead({ contact, options });
    setErrors(checked.errors);
    setError("");
    if (!checked.data || invalidOptions) {
      if (invalidOptions)
        setError("Исправьте площадь или количество окон в калькуляторе.");
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    onBusy(true);
    try {
      requestKey.current ??= crypto.randomUUID();
      const result = await submitLead(mode, checked.data, requestKey.current);
      setSuccess({ id: result.id, input: checked.data });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Не удалось отправить заявку. Попробуйте ещё раз.",
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
      onBusy(false);
    }
  }
  const fieldProps = (key: keyof Contact) => ({
    id: `${id}-${key}`,
    name: key,
    value: contact[key],
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? `${id}-${key}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update(key, e.target.value),
  });
  return (
    <div id="request" className="request-panel panel">
      <div className="request-intro">
        <span className="eyebrow">Следующий шаг</span>
        <h3>
          Осталось
          <br />
          <em>познакомиться.</em>
        </h3>
        <p>
          {mode === "demo"
            ? "Попробуйте путь клиента: оставьте заявку и посмотрите, как она выглядит в кабинете."
            : "Оставьте контакты и пожелания, чтобы согласовать детали уборки."}
        </p>
        <div className="demo-notice">
          <Icon name="shield" size={22} />
          <span>
            {mode === "demo"
              ? "Демонстрация. Используйте вымышленные данные"
              : "Реальная отправка в Telegram. Демо-сохранение отключено."}
          </span>
        </div>
        {mode === "demo" && (
          <p className="small muted">
            Данные сохраняются только в этом браузере и никуда не отправляются.
          </p>
        )}
      </div>
      {success ? (
        <div
          className="success-panel"
          ref={statusRef}
          tabIndex={-1}
          role="status"
        >
          <span className="success-icon">
            <Icon name="check" size={30} />
          </span>
          <h3>
            {mode === "demo" ? "Демо-заявка сохранена" : "Заявка отправлена"}
          </h3>
          <p>
            № {success.id.slice(0, 8).toUpperCase()} ·{" "}
            {rubles(calculate(success.input.options).total)}
          </p>
          <p>
            {TARIFFS[success.input.options.type].title},{" "}
            {success.input.options.area} м².{" "}
            {mode === "demo"
              ? "Откройте кабинет и попробуйте изменить статус заявки."
              : "Желаемая дата не является подтверждённым бронированием."}
          </p>
          {mode === "demo" && (
            <Link href="/cabinet" className="button">
              Открыть демо-кабинет
              <Icon name="arrow" size={19} />
            </Link>
          )}
          <button
            className="text-button"
            type="button"
            onClick={() => {
              focusNewRequest.current = true;
              setSuccess(null);
              setContact({ ...EMPTY_CONTACT });
              requestKey.current = null;
            }}
          >
            Создать ещё одну заявку
          </button>
        </div>
      ) : (
        <form
          ref={formRef}
          noValidate
          onSubmit={handleSubmit}
          className="request-form"
        >
          <fieldset disabled={submitting}>
            <legend className="sr-only">Контактные данные</legend>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor={`${id}-name`}>
                  Как к вам обращаться <span aria-hidden="true">*</span>
                </label>
                <input
                  {...fieldProps("name")}
                  autoComplete="given-name"
                  required
                  maxLength={80}
                  placeholder="Например, Алексей"
                />
                {errors.name && (
                  <span className="field-error" id={`${id}-name-error`}>
                    {errors.name}
                  </span>
                )}
              </div>
              <div className="form-field">
                <label htmlFor={`${id}-phone`}>
                  Телефон <span aria-hidden="true">*</span>
                </label>
                <input
                  {...fieldProps("phone")}
                  type="tel"
                  autoComplete="tel"
                  required
                  maxLength={30}
                  placeholder="+7 (999) 000-00-00"
                />
                {errors.phone && (
                  <span className="field-error" id={`${id}-phone-error`}>
                    {errors.phone}
                  </span>
                )}
              </div>
            </div>
            <div className="form-field">
              <label htmlFor={`${id}-date`}>
                Желаемая дата <span className="optional">необязательно</span>
              </label>
              <input
                {...fieldProps("date")}
                type="date"
                min={minimumDate || undefined}
                aria-describedby={`${id}-date-help${errors.date ? ` ${id}-date-error` : ""}`}
              />
              <small id={`${id}-date-help`}>
                Это пожелание, а не бронирование свободного времени.
              </small>
              {errors.date && (
                <span className="field-error" id={`${id}-date-error`}>
                  {errors.date}
                </span>
              )}
            </div>
            <div className="form-field">
              <label htmlFor={`${id}-comment`}>
                О чём нам нужно знать?{" "}
                <span className="optional">необязательно</span>
              </label>
              <textarea
                {...fieldProps("comment")}
                maxLength={1000}
                rows={3}
                placeholder="Особенности квартиры или дополнительные пожелания"
              />
              {errors.comment && (
                <span className="field-error" id={`${id}-comment-error`}>
                  {errors.comment}
                </span>
              )}
            </div>
            <p className="form-calculation">
              В заявке: {TARIFFS[options.type].title.toLowerCase()},{" "}
              {options.area} м² ·{" "}
              <strong>{rubles(calculate(options).total)}</strong>. Все выбранные
              дополнения будут сохранены.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
                {mode === "demo" && (
                  <>
                    {" "}
                    <Link href="/cabinet">Открыть кабинет</Link>
                  </>
                )}
              </p>
            )}
            <button
              className="button form-submit"
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting
                ? mode === "demo"
                  ? "Сохраняем заявку…"
                  : "Отправляем заявку…"
                : mode === "demo"
                  ? "Сохранить демо-заявку"
                  : "Отправить заявку"}
              {!submitting && <Icon name="arrow" size={19} />}
            </button>
            <p className="form-disclaimer">
              {mode === "demo"
                ? "Демонстрация не оформляет реальную уборку. Для тестирования укажите вымышленные имя и телефон."
                : "Контакты и параметры уборки будут переданы оператору через Telegram."}
            </p>
          </fieldset>
        </form>
      )}
    </div>
  );
}
