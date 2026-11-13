import Link from "next/link";
import { Icon } from "./icons";
import type { AppMode } from "@/lib/submission";
import { sitePath } from "@/lib/paths";

export function Header({ mode = "demo" }: { mode?: AppMode }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="wordmark" href="/" aria-label="Чисто — на главную">
          <Icon size={30} />
          чисто<span className="logo-dot">.</span>
        </Link>
        <nav className="desktop-nav" aria-label="Основная навигация">
          <a href={sitePath("/#services")}>Виды уборки</a>
          <a href={sitePath("/#how")}>Как это работает</a>
          <a href={sitePath("/#faq")}>Вопросы</a>
        </nav>
        <div className="header-actions">
          {mode === "demo" && (
            <Link className="cabinet-link" href="/cabinet">
              <Icon name="list" size={18} />
              <span>Демо-кабинет</span>
            </Link>
          )}
          <a className="button button-small" href={sitePath("/#calculator")}>
            Рассчитать стоимость
            <Icon name="arrow" size={17} />
          </a>
        </div>
        <details className="mobile-menu">
          <summary aria-label="Открыть меню">
            <span />
            <span />
          </summary>
          <nav aria-label="Мобильная навигация">
            <a href={sitePath("/#services")}>Виды уборки</a>
            <a href={sitePath("/#calculator")}>Рассчитать стоимость</a>
            <a href={sitePath("/#how")}>Как это работает</a>
            <a href={sitePath("/#faq")}>Вопросы</a>
            <Link href="/cabinet">Демонстрация кабинета</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <Link className="wordmark" href="/">
            <Icon size={28} />
            чисто.
          </Link>
          <p>
            Больше времени на то,
            <br />
            что вы любите.
          </p>
          <a className="footer-back" href="#top">
            Наверх ↑
          </a>
        </div>
        <div className="footer-bottom">
          <p>
            Демонстрационный проект для портфолио.
            <br />
            Компания вымышленная, цены условные.
          </p>
          <Link href="/cabinet">Демонстрация кабинета ↗</Link>
          <span>Сделано с вниманием к деталям</span>
        </div>
      </div>
    </footer>
  );
}
