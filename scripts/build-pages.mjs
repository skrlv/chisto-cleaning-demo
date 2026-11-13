import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const project = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const stage = path.join(project, "work", "pages-build");
const output = path.join(project, "out");
const next = path.join(project, "node_modules", "next", "dist", "bin", "next");
const localBuildFile = path.join(project, ".next", "BUILD_ID");
const localBuildId = existsSync(localBuildFile)
  ? readFileSync(localBuildFile, "utf8")
  : undefined;
const sourceFiles = [
  "app",
  "components",
  "lib",
  "server",
  "public",
  "next.config.ts",
  "next-env.d.ts",
  "postcss.config.mjs",
  "tsconfig.json",
  "package.json",
  "package-lock.json",
];

function pagesBasePath() {
  if (process.env.NEXT_PUBLIC_BASE_PATH !== undefined) {
    return process.env.NEXT_PUBLIC_BASE_PATH;
  }
  const [owner, repository] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
  if (owner && repository) {
    return repository.toLowerCase() === `${owner.toLowerCase()}.github.io`
      ? ""
      : `/${repository}`;
  }
  return "/chisto-cleaning-demo";
}

if (!existsSync(next)) {
  throw new Error("Не установлены зависимости. Сначала выполните npm ci.");
}

// Next 16 writes intermediate export artifacts into .next even when distDir
// changes. Build a source-only copy so an active local server stays intact.
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
for (const relative of sourceFiles) {
  const source = path.join(project, relative);
  if (!existsSync(source)) continue;
  cpSync(source, path.join(stage, relative), {
    recursive: true,
    filter: (file) => !path.basename(file).startsWith(".env"),
  });
}
symlinkSync(
  path.join(project, "node_modules"),
  path.join(stage, "node_modules"),
  "dir",
);

const basePath = pagesBasePath();
console.log(`Собираем статическое демо для GitHub Pages: ${basePath || "/"}`);
const result = spawnSync(process.execPath, [next, "build", stage], {
  cwd: stage,
  stdio: "inherit",
  env: {
    ...process.env,
    GITHUB_PAGES: "1",
    NEXT_PUBLIC_BASE_PATH: basePath,
    CHISTO_BUILD_ROOT: project,
    APP_MODE: "demo",
    TELEGRAM_BOT_TOKEN: "",
    TELEGRAM_CHAT_ID: "",
    NEXT_TELEMETRY_DISABLED: "1",
  },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (
  localBuildId !== undefined &&
  readFileSync(localBuildFile, "utf8") !== localBuildId
) {
  throw new Error(
    "Локальная серверная сборка изменилась во время экспорта. Повторите сборку отдельно.",
  );
}

const stagedOutput = path.join(stage, "out");
if (
  !existsSync(path.join(stagedOutput, "index.html")) ||
  !existsSync(path.join(stagedOutput, "cabinet", "index.html")) ||
  existsSync(path.join(stagedOutput, "api"))
) {
  throw new Error(
    "Статическая сборка не содержит ожидаемые страницы или содержит серверный API.",
  );
}
// Replacement is limited to this builder's named static output after success.
rmSync(output, { recursive: true, force: true });
cpSync(stagedOutput, output, { recursive: true });
writeFileSync(path.join(output, ".nojekyll"), "");
console.log(`Готово: ${output}`);
console.log("Режим demo. Серверный API и Telegram в публикацию не включены.");
