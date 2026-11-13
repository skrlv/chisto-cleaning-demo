import type { Metadata } from "next";
import Cabinet from "@/components/cabinet";
import { Header, Footer } from "@/components/shell";

export const metadata: Metadata = {
  title: "Демонстрация кабинета — Чисто",
  description:
    "Демонстрационный кабинет сервиса уборки: заявки и статусы из текущего браузера.",
  robots: { index: false, follow: false },
};

export default function CabinetPage() {
  return (
    <>
      <Header mode="demo" />
      <Cabinet />
      <Footer />
    </>
  );
}
