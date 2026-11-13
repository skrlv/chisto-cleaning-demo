import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const label = `com.chisto.demo.preview.${createHash('sha256').update(project).digest('hex').slice(0, 12)}`;
const url = 'http://127.0.0.1:3000';
const logs = path.join(project, '.preview');
const logFile = path.join(logs, 'server.log');
const next = path.join(project, 'node_modules/next/dist/bin/next');
const command = process.argv[2] ?? 'start';
const launchctl = (...args) => spawnSync('/bin/launchctl', args, { encoding: 'utf8' });

async function ready(timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const responses = await Promise.all(['/', '/cabinet'].map(route => fetch(`${url}${route}`, { signal: AbortSignal.timeout(1_000) })));
      if (responses.every(response => response.ok)) return true;
    } catch { /* The server may still be starting. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return false;
}

function portInUse() {
  return new Promise(resolve => {
    const socket = createConnection({ host: '127.0.0.1', port: 3000 });
    socket.setTimeout(1_000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}

async function main() {
  if (process.platform !== 'darwin') throw new Error('Этот способ фонового запуска предназначен для macOS. На другой системе используйте npm start.');
  if (!['start', 'stop'].includes(command)) throw new Error('Используйте npm run preview:start или npm run preview:stop.');
  const registered = launchctl('list', label).status === 0;
  if (command === 'stop') {
    if (registered) {
      const result = launchctl('remove', label);
      if (result.status !== 0) throw new Error(result.stderr || 'Не удалось остановить сервер.');
    }
    console.log('Фоновый демо-сервер остановлен.');
    return;
  }
  if (registered && await ready(2_000)) {
    console.log(`Сайт уже работает: ${url}\nКабинет: ${url}/cabinet`);
    return;
  }
  if (registered) {
    const result = launchctl('remove', label);
    if (result.status !== 0) throw new Error(result.stderr || 'Не удалось перезапустить прежний сервер.');
    // Give launchd a moment to release its owned listening socket.
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  if (await portInUse()) throw new Error('Порт 3000 занят другим процессом. Остановите его перед запуском демо-сайта.');
  if (!existsSync(next)) throw new Error('Не установлены зависимости. Выполните npm ci в папке проекта.');
  if (!existsSync(path.join(project, '.next/BUILD_ID'))) {
    const result = spawnSync(process.execPath, [next, 'build', project], { cwd: project, stdio: 'inherit' });
    if (result.status !== 0) throw new Error('Сборка не завершилась. Сервер не запущен.');
  }
  mkdirSync(logs, { recursive: true });
  // A temporary per-user launchd job owns the server, rather than a Codex command session.
  // No LaunchAgent is installed, and no automatic login startup is configured.
  const result = launchctl('submit', '-l', label, '-o', logFile, '-e', logFile, '--',
    '/usr/bin/env', 'APP_MODE=demo', 'TELEGRAM_BOT_TOKEN=', 'TELEGRAM_CHAT_ID=', 'TRUST_PROXY=0',
    process.execPath, next, 'start', project, '--hostname', '127.0.0.1', '--port', '3000');
  if (result.status !== 0) throw new Error(result.stderr || 'Не удалось запустить сервер в фоне.');
  if (!await ready()) {
    launchctl('remove', label);
    const log = existsSync(logFile) ? readFileSync(logFile, 'utf8').slice(-3_000) : '';
    throw new Error(`Сервер не ответил вовремя. Журнал: ${logFile}\n${log}`);
  }
  console.log(`Сайт запущен: ${url}\nКабинет: ${url}/cabinet\nСервер работает независимо от окна команд. Остановка: npm run preview:stop`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
