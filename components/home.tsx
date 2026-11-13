"use client";
import Image from "next/image";
import { useState } from "react";
import { Icon } from "./icons";
import Calculator from "./calculator";
import {
  CLEANING_TYPES,
  LIMITS,
  TARIFFS,
  type CleaningType,
} from "@/lib/tariffs";
import {
  DEFAULT_OPTIONS,
  rubles,
  type CleaningOptions,
} from "@/lib/calculation";
import type { AppMode } from "@/lib/submission";
import { sitePath } from "@/lib/paths";

const questions = [
  [
    "Нужно ли готовить инвентарь и средства?",
    "В этом примере предполагается, что команда привозит базовый инвентарь и средства для уборки. Если для поверхности нужен особый уход или средство, это стоит обсудить при согласовании заявки.",
  ],
  [
    "Обязательно ли находиться дома?",
    "Можно присутствовать во время уборки или передать доступ согласованным способом. Главное — заранее обсудить, как встретить команду и принять результат. В демо-режиме реальный выезд не оформляется.",
  ],
  [
    "Как добавить работы, которых нет в калькуляторе?",
    "Опишите пожелания в комментарии к заявке: например, уборку внутри шкафов или на балконе. Эти работы не входят в показанную сумму и требуют отдельного согласования. Вывоз строительного мусора и высотные работы также не включены.",
  ],
  [
    "Может ли измениться предварительная стоимость?",
    "Да, если фактическая площадь, загрязнение или состав работ отличаются от выбранных параметров. Итоговый объём и стоимость нужно согласовать до начала уборки. Тарифы на этом сайте условные.",
  ],
  [
    "Что происходит после отправки демо-заявки?",
    "Данные остаются в localStorage текущего браузера и никуда не отправляются. Откройте «Демонстрацию кабинета», чтобы увидеть заявку и изменить её статус. Это не бронирование и не заказ реальной уборки.",
  ],
];
export default function Home({ mode }: { mode: AppMode }) {
  const [options, setOptions] = useState<CleaningOptions>({
    ...DEFAULT_OPTIONS,
  });
  function choose(type: CleaningType) {
    setOptions((prev) => ({ ...prev, type }));
    document
      .getElementById("calculator")
      ?.scrollIntoView({ behavior: "smooth" });
    document.getElementById("calculator-title")?.focus({ preventScroll: true });
  }
  return (
    <main id="main">
      <section className="hero container" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-dot" />
            Уборка квартир с заботой о доме
          </span>
          <h1 id="hero-title">
            Дома — чисто.
            <br />
            На душе —<br />
            <em>спокойно.</em>
          </h1>
          <p className="hero-description">
            Берём домашние хлопоты на себя.
            <br className="desktop-break" /> А вам оставляем время для жизни.
          </p>
          <a className="button hero-cta" href="#calculator">
            Рассчитать мою уборку
            <Icon name="arrow" size={20} />
          </a>
          <p className="hero-caption">
            Понятный расчёт. Только нужные вам услуги.
          </p>
          <div className="hero-note">
            <span className="note-line" />
            <span>
              Для уютных вечеров.
              <br />И свободных выходных.
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src={sitePath("/interior.jpg")}
            alt="Светлая уютная гостиная с чистыми поверхностями и зелёным растением"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 50vw"
            className="hero-image"
          />
          <span className="image-caption">Пространство для жизни</span>
          <div className="hero-sticker">
            <div className="sticker-icon">
              <Icon name="spark" size={28} />
            </div>
            <div>
              Чистота в деталях.<span>Лёгкость в каждом дне.</span>
            </div>
          </div>
          <span className="photo-index">ДОМ, В КОТОРЫЙ ХОЧЕТСЯ ВЕРНУТЬСЯ</span>
        </div>
      </section>
      <div className="container principles">
        <div>
          <Icon name="list" />
          <span>
            <strong>Стоимость без загадок</strong>
            <small>Каждая услуга — в расчёте</small>
          </span>
        </div>
        <div>
          <Icon name="home" />
          <span>
            <strong>Ваш дом, ваши правила</strong>
            <small>Вы выбираете объём уборки</small>
          </span>
        </div>
        <div>
          <Icon name="leaf" />
          <span>
            <strong>С вниманием к деталям</strong>
            <small>Заранее согласуем пожелания</small>
          </span>
        </div>
      </div>
      <section
        className="section container"
        id="services"
        aria-labelledby="services-title"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">01 / Подберём подходящий формат</span>
            <h2 id="services-title">
              Каждому дому —<br />
              <em>своя чистота.</em>
            </h2>
          </div>
          <p>
            Освежить квартиру, навести основательный
            <br className="desktop-break" /> порядок или убрать следы ремонта.
            <br className="desktop-break" /> Начните с того, что нужно вам.
          </p>
        </div>
        <div className="service-grid">
          {CLEANING_TYPES.map((type, index) => (
            <article
              key={type}
              className={`service-card ${type === "deep" ? "featured" : ""}`}
            >
              <div className="service-top">
                <Icon name={["home", "spark", "window"][index]} size={36} />
                <span>{TARIFFS[type].number}</span>
              </div>
              <p className="service-kicker">{TARIFFS[type].short}</p>
              <h3>{TARIFFS[type].title}</h3>
              <p className="service-description">{TARIFFS[type].description}</p>
              <p className="service-price">
                {TARIFFS[type].rate} ₽<span> / м²</span>
              </p>
              <ul className="work-list">
                {TARIFFS[type].works.map((work) => (
                  <li key={work}>
                    <Icon name="check" size={17} />
                    {work}
                  </li>
                ))}
              </ul>
              <button className="service-button" onClick={() => choose(type)}>
                Рассчитать этот вариант
                <Icon name="arrow" size={19} />
              </button>
            </article>
          ))}
        </div>
        <p className="section-footnote">
          Минимальная стоимость основной уборки — {rubles(LIMITS.minimum)}. Окна
          и техника внутри — отдельно. Все тарифы демонстрационные.
        </p>
      </section>
      <Calculator options={options} onChange={setOptions} mode={mode} />
      <section
        className="section container"
        id="how"
        aria-labelledby="how-title"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">03 / Всё по порядку</span>
            <h2 id="how-title">
              От заявки
              <br />
              до <em>чистого дома.</em>
            </h2>
          </div>
          <p>
            Понятные шаги, чтобы вы знали,
            <br className="desktop-break" /> чего ожидать на каждом этапе.
          </p>
        </div>
        <ol className="steps">
          {[
            [
              "Оставляете заявку",
              "Выбираете услуги, видите предварительную стоимость и оставляете пожелания.",
            ],
            [
              "Согласуем детали",
              "Уточняем задачу, время и итоговый объём работ до начала уборки.",
            ],
            [
              "Наводим порядок",
              "Уборка проходит по согласованному списку с учётом особенностей квартиры.",
            ],
            [
              "Принимаете работу",
              "Проверяете результат по списку работ и отмечаете, что требует внимания.",
            ],
          ].map(([title, text], i) => (
            <li key={title}>
              <span className="step-number">
                0{i + 1}
                <Icon name="arrow" size={19} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <p className="section-footnote">
          Так может выглядеть реальный сервис. На этом сайте можно пройти только
          демонстрацию заявки и кабинета.
        </p>
      </section>
      <section className="faq-section section" id="faq">
        <div className="container faq-layout">
          <div>
            <span className="eyebrow">04 / Хорошо знать заранее</span>
            <h2>
              Вопросы?
              <br />
              <em>Всё расскажем.</em>
            </h2>
            <p>
              Чуть больше о том,
              <br />
              как устроена уборка.
            </p>
            <Icon name="spark" size={66} />
          </div>
          <div className="faq-list">
            {questions
              .filter((_, i) => mode === "demo" || i !== 4)
              .map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <span className="faq-plus" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
          </div>
        </div>
      </section>
      <section className="closing container">
        <span className="eyebrow">Дом — для жизни</span>
        <h2>
          Пусть в планах будет
          <br />
          <em>что-то приятнее уборки.</em>
        </h2>
        <a className="button" href="#calculator">
          Начать с расчёта
          <Icon name="arrow" size={20} />
        </a>
        <span className="closing-spark">
          <Icon size={90} />
        </span>
      </section>
    </main>
  );
}
