"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sitePath } from "@/lib/paths";

export function MobileMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 761px)");
    const resize = () => {
      if (desktop.matches && ref.current) ref.current.open = false;
    };
    document.addEventListener("keydown", close);
    desktop.addEventListener("change", resize);
    return () => {
      document.removeEventListener("keydown", close);
      desktop.removeEventListener("change", resize);
    };
  }, []);
  return (
    <details
      ref={ref}
      className="mobile-menu"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary aria-label={open ? "Закрыть меню" : "Открыть меню"}>
        <span />
        <span />
      </summary>
      <nav
        aria-label="Мобильная навигация"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a") && ref.current)
            ref.current.open = false;
        }}
      >
        <a href={sitePath("/#services")}>Виды уборки</a>
        <a href={sitePath("/#calculator")}>Рассчитать стоимость</a>
        <a href={sitePath("/#how")}>Как это работает</a>
        <a href={sitePath("/#faq")}>Вопросы</a>
        <Link href="/cabinet">Демонстрация кабинета</Link>
      </nav>
    </details>
  );
}
