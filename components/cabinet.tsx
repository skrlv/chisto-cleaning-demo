"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { calculate, rubles } from "@/lib/calculation";
import {
  readOrders,
  writeOrders,
  STATUSES,
  STORAGE_KEY,
  type DemoOrder,
  type OrderStatus,
} from "@/lib/demo-storage";
import { TARIFFS } from "@/lib/tariffs";

function messageOf(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Хранилище браузера недоступно. Проверьте настройки браузера и попробуйте снова.";
}
function createdAt(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
function requestedDate(value: string) {
  return value
    ? new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T12:00:00Z`))
    : "Не указана";
}

export default function Cabinet() {
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const cancelClearRef = useRef<HTMLButtonElement>(null);
  const statusFilterRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (confirmClear) cancelClearRef.current?.focus();
  }, [confirmClear]);

  function cancelClear() {
    setConfirmClear(false);
    requestAnimationFrame(() => {
      const target = clearButtonRef.current;
      (target && !target.disabled ? target : refreshButtonRef.current)?.focus();
    });
  }

  const refresh = useCallback(() => {
    try {
      setOrders(readOrders(window.localStorage));
      setError("");
    } catch (error) {
      setOrders([]);
      setError(messageOf(error));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        refresh();
        setNotice("Список обновлён: демо-данные изменились в другой вкладке.");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  function changeStatus(id: string, status: OrderStatus) {
    try {
      const latest = readOrders(window.localStorage);
      if (!latest.some((order) => order.id === id))
        throw new Error(
          "Эта заявка уже удалена в другой вкладке. Обновите список.",
        );
      const next = latest.map((order) =>
        order.id === id ? { ...order, status } : order,
      );
      writeOrders(window.localStorage, next);
      setOrders(next);
      setError("");
      setNotice(
        `Статус заявки изменён: «${status}». Изменение сохранено в этом браузере.`,
      );
      if (filter !== "all" && status !== filter) {
        requestAnimationFrame(() => statusFilterRef.current?.focus());
      }
    } catch (error) {
      setError(messageOf(error));
      setNotice("");
    }
  }

  function clearOrders() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setOrders([]);
      setFilter("all");
      setError("");
      setNotice("Демонстрационные данные очищены. Можно создать новую заявку.");
      setConfirmClear(false);
      requestAnimationFrame(() => refreshButtonRef.current?.focus());
    } catch (error) {
      setError(messageOf(error));
      setNotice("");
    }
  }

  const visibleOrders =
    filter === "all"
      ? orders
      : orders.filter((order) => order.status === filter);

  return (
    <main className="cabinet-page container" id="main">
      <div className="cabinet-heading">
        <p className="eyebrow">ЗА КУЛИСАМИ СЕРВИСА</p>
        <h1>Демонстрация кабинета</h1>
        <p className="cabinet-intro">
          От первого обращения до чистого дома — вся история заявки в одном
          месте.
        </p>
      </div>

      <aside
        className="cabinet-notice panel"
        aria-label="О демонстрационном кабинете"
      >
        <strong>Только демонстрация. Только этот браузер.</strong>
        <p>
          Заявки хранятся только в этом браузере и не отправляются компании. Это
          демонстрация сервиса: используйте вымышленные имя и телефон.
        </p>
      </aside>

      <section aria-labelledby="orders-heading">
        <div className="cabinet-toolbar">
          <div>
            <h2 id="orders-heading">
              Заявки{" "}
              <span className="cabinet-count">
                {ready ? orders.length : "…"}
              </span>
            </h2>
            <p className="muted">
              Меняйте статус, чтобы показать, как устроена обработка заказа.
            </p>
          </div>
          <div className="cabinet-controls">
            <button
              type="button"
              className="button button-secondary"
              ref={refreshButtonRef}
              onClick={() => {
                refresh();
                setNotice("Список заявок обновлён.");
              }}
              disabled={!ready}
            >
              Обновить список
            </button>
            <button
              type="button"
              className="button button-secondary"
              ref={clearButtonRef}
              onClick={() => setConfirmClear(true)}
              disabled={!ready || (!orders.length && !error)}
            >
              Очистить демо-данные
            </button>
          </div>
        </div>

        {confirmClear && (
          <div
            className="cabinet-clear-confirm panel"
            role="group"
            aria-labelledby="clear-title"
          >
            <h3 id="clear-title">Очистить все демо-заявки?</h3>
            <p>
              Будут удалены только демонстрационные заявки «Чисто» из этого
              браузера. Отменить удаление нельзя.
            </p>
            <div className="cabinet-controls">
              <button className="button" type="button" onClick={clearOrders}>
                Да, очистить данные
              </button>
              <button
                className="button button-secondary"
                type="button"
                ref={cancelClearRef}
                onClick={cancelClear}
              >
                Оставить заявки
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="cabinet-error" role="alert">
            {error}
          </div>
        )}
        <p className="cabinet-feedback" role="status" aria-live="polite">
          {notice}
        </p>

        <div className="cabinet-filter">
          <label htmlFor="status-filter">Показать заявки</label>
          <select
            id="status-filter"
            ref={statusFilterRef}
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as OrderStatus | "all")
            }
            disabled={!ready}
          >
            <option value="all">Все статусы</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          {ready && (
            <span className="muted">Показано: {visibleOrders.length}</span>
          )}
        </div>

        {!ready ? (
          <div className="cabinet-empty panel" role="status">
            <h3>Загружаем заявки…</h3>
            <p>Проверяем локальное хранилище этого браузера.</p>
          </div>
        ) : !error && !visibleOrders.length ? (
          <div className="cabinet-empty panel">
            <span className="cabinet-empty-mark" aria-hidden="true">
              ↗
            </span>
            <h3>
              {orders.length
                ? "В этом статусе пока нет заявок"
                : "Первая заявка — начало порядка"}
            </h3>
            <p>
              {orders.length
                ? "Выберите другой статус или покажите все заявки."
                : "Рассчитайте уборку и оставьте демо-заявку. Она появится здесь, а вы сможете пройти весь путь её обработки."}
            </p>
            {orders.length ? (
              <button
                type="button"
                className="button"
                onClick={() => setFilter("all")}
              >
                Показать все заявки
              </button>
            ) : (
              <Link className="button" href="/#calculator">
                Рассчитать уборку <span aria-hidden="true">↗</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="cabinet-list">
            {visibleOrders.map((order) => {
              const calculation = calculate(order.options);
              const orderNumber = `Ч-${order.id.slice(0, 8).toUpperCase()}`;
              return (
                <article
                  key={order.id}
                  className="cabinet-order panel"
                  aria-labelledby={`order-${order.id}`}
                >
                  <div className="cabinet-order-head">
                    <div>
                      <p className="eyebrow">ДЕМО-ЗАЯВКА</p>
                      <h3
                        id={`order-${order.id}`}
                        className="cabinet-order-number"
                      >
                        {orderNumber}
                      </h3>
                      <time dateTime={order.createdAt}>
                        {createdAt(order.createdAt)}
                      </time>
                    </div>
                    <div className="cabinet-status">
                      <label htmlFor={`status-${order.id}`}>
                        Статус заявки {orderNumber}
                      </label>
                      <select
                        id={`status-${order.id}`}
                        value={order.status}
                        onChange={(event) =>
                          changeStatus(
                            order.id,
                            event.target.value as OrderStatus,
                          )
                        }
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="cabinet-order-grid">
                    <div className="cabinet-details">
                      <h4>Параметры уборки</h4>
                      <dl>
                        <div>
                          <dt>Вид уборки</dt>
                          <dd>{TARIFFS[order.options.type].title}</dd>
                        </div>
                        <div>
                          <dt>Площадь</dt>
                          <dd>{order.options.area} м²</dd>
                        </div>
                        <div>
                          <dt>Тариф</dt>
                          <dd>{rubles(calculation.rate)}/м²</dd>
                        </div>
                        <div>
                          <dt>Основная уборка</dt>
                          <dd>
                            {rubles(calculation.base)}
                            {calculation.minimumApplied && " (минимум)"}
                          </dd>
                        </div>
                      </dl>
                      <h4>Дополнительные услуги</h4>
                      {calculation.extras.length ? (
                        <ul>
                          {calculation.extras.map((extra) => (
                            <li key={extra.label}>
                              {extra.label} — {rubles(extra.price)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted">Не выбраны</p>
                      )}
                    </div>
                    <div className="cabinet-contact">
                      <h4>Контактные данные</h4>
                      <dl>
                        <div>
                          <dt>Имя</dt>
                          <dd>{order.contact.name}</dd>
                        </div>
                        <div>
                          <dt>Телефон</dt>
                          <dd>{order.contact.phone}</dd>
                        </div>
                        <div>
                          <dt>Желаемая дата</dt>
                          <dd>{requestedDate(order.contact.date)}</dd>
                        </div>
                      </dl>
                      <p className="muted">
                        Дата — пожелание клиента, а не бронирование.
                      </p>
                      {order.contact.comment && (
                        <div className="cabinet-comment">
                          <h4>Комментарий</h4>
                          <p>{order.contact.comment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="cabinet-summary">
                    <div>
                      <span className="muted">Предварительная стоимость</span>
                      <p className="cabinet-id">ID: {order.id}</p>
                    </div>
                    <strong>{rubles(order.total)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <div className="cabinet-back">
        <Link className="button button-secondary" href="/#calculator">
          ← Вернуться к калькулятору
        </Link>
      </div>
    </main>
  );
}
