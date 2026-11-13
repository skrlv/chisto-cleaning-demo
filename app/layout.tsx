import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Чисто — дома чисто, на душе спокойно",
  description:
    "Демонстрационный сайт сервиса уборки квартир. Рассчитайте стоимость, создайте демо-заявку и посмотрите её в кабинете.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body id="top">
        <a className="skip-link" href="#main">
          Перейти к содержимому
        </a>
        {children}
      </body>
    </html>
  );
}
