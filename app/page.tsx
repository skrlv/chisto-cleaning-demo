import { Header, Footer } from "@/components/shell";
import Home from "@/components/home";
import { connection } from "next/server";

export default async function Page() {
  const githubPages = process.env.GITHUB_PAGES === "1";
  if (!githubPages) await connection();
  const mode =
    !githubPages && process.env.APP_MODE === "telegram" ? "telegram" : "demo";
  return (
    <>
      <Header mode={mode} />
      <Home mode={mode} />
      <Footer />
    </>
  );
}
