import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const key = "chisto.demo.orders.v1";
const screenshots = path.resolve(process.cwd(), process.env.SCREENSHOT_DIR ?? "../screenshots");
const errorsByPage = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  errorsByPage.set(page, errors);
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
});
test.afterEach(async ({ page }) => expect(errorsByPage.get(page)).toEqual([]));
async function open(page: Page) {
  await page.goto("./");
  await expect(page.getByLabel("Желаемая дата")).toHaveAttribute("min", /^\d{4}-\d{2}-\d{2}$/);
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => innerWidth));
}
async function demoContact(page: Page) {
  await page.getByRole("button", { name: "Заполнить демо-пример" }).click();
}

test("Pages: полный путь, дата, сумма, статусы и фильтры без отправки", async ({ page }) => {
  const sends: string[] = [];
  page.on("request", request => {
    if (!["GET", "HEAD"].includes(request.method()) || /api\/leads|telegram\.org/.test(request.url())) sends.push(request.url());
  });
  await open(page);
  await expect(page.locator(".portfolio-ribbon")).toContainText("Вымышленный сервис");
  await expect(page.getByLabel("Итоговая стоимость")).toHaveText(/4\s000\s₽/);
  await page.getByRole("radio", { name: /Генеральная/ }).check();
  await page.getByLabel("Мытьё окон", { exact: true }).fill("2");
  await page.getByRole("checkbox", { name: /Внутри духовки/ }).check();
  await expect(page.getByLabel("Итоговая стоимость")).toHaveText(/8\s800\s₽/);
  await page.getByRole("button", { name: "Сохранить демо-заявку" }).click();
  await expect(page.getByLabel("Как к вам обращаться")).toBeFocused();
  await expect(page.getByText("Введите имя: от 2 до 80 символов.")).toBeVisible();
  await demoContact(page);
  const min = await page.getByLabel("Желаемая дата").getAttribute("min");
  const tomorrow = new Date(`${min}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const date = tomorrow.toISOString().slice(0, 10);
  await page.getByLabel("Желаемая дата").fill(date);
  await page.getByRole("button", { name: "Сохранить демо-заявку" }).dblclick();
  await expect(page.getByRole("heading", { name: "Демо-заявка сохранена" })).toBeVisible();
  await page.getByRole("link", { name: "Открыть демо-кабинет" }).click();
  await expect(page.locator(".cabinet-order")).toHaveCount(1);
  await expect(page.locator(".cabinet-order")).toContainText("Демо-посетитель");
  await expect(page.locator(".cabinet-summary")).toContainText(/8\s800\s₽/);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).orders[0].contact.date, key)).toBe(date);
  const formatted = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(tomorrow);
  await expect(page.locator(".cabinet-order")).toContainText(formatted);
  for (const status of ["Связались", "Согласована", "Завершена"]) {
    await page.getByLabel(/^Статус заявки/).selectOption(status);
    await page.reload();
    await expect(page.getByLabel(/^Статус заявки/)).toHaveValue(status);
  }
  await page.getByLabel("Показать заявки", { exact: true }).selectOption("Новая");
  await expect(page.getByText("В этом статусе пока нет заявок")).toBeVisible();
  await page.getByRole("button", { name: "Показать все заявки" }).click();
  await noOverflow(page);
  await page.getByRole("heading", { level: 1 }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(screenshots, "cabinet.png"), fullPage: true, style: ".skip-link:not(:focus) { visibility: hidden; }" });
  await page.getByRole("button", { name: "Очистить демо-данные" }).click();
  await page.getByRole("button", { name: "Оставить заявки" }).click();
  await expect(page.locator(".cabinet-order")).toHaveCount(1);
  await page.getByRole("button", { name: "Очистить демо-данные" }).click();
  await page.getByRole("button", { name: "Да, очистить данные" }).click();
  await page.reload();
  await expect(page.getByText("Первая заявка — начало порядка")).toBeVisible();
  expect(sends).toEqual([]);
});

test("Pages: минимум, диапазоны и синхронизация площади", async ({ page }) => {
  await open(page);
  const area = page.getByRole("spinbutton", { name: /Площадь квартиры/ });
  await area.fill("20");
  await page.getByRole("checkbox", { name: /Внутри холодильника/ }).check();
  await expect(page.getByLabel("Итоговая стоимость")).toHaveText(/3\s700\s₽/);
  await expect(page.getByText("Минимум за основную уборку")).toBeVisible();
  for (const [input, expected] of [["301", "300"], ["19", "20"], ["", "20"]]) {
    await area.fill(input); await area.blur(); await expect(area).toHaveValue(expected);
  }
  const slider = page.getByRole("slider");
  await slider.focus(); await slider.press("Home"); await slider.press("ArrowRight");
  await expect(area).toHaveValue("21");
  await page.getByLabel("Мытьё окон", { exact: true }).fill("100");
  await page.getByLabel("Мытьё окон", { exact: true }).blur();
  await expect(page.getByLabel("Мытьё окон", { exact: true })).toHaveValue("20");
});

test("Pages: прошедшая дата не сохраняется", async ({ page }) => {
  await open(page); await demoContact(page);
  await page.getByLabel("Желаемая дата").fill("2020-01-01");
  await page.getByRole("button", { name: "Сохранить демо-заявку" }).click();
  await expect(page.getByText("Выберите сегодняшнюю или будущую дату.")).toBeVisible();
  await expect(page.getByLabel("Желаемая дата")).toBeFocused();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
});

for (const width of [360, 390, 768]) {
  test(`Pages: адаптивность ${width}px и создание заявки`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await open(page); await noOverflow(page);
    if (width < 761) {
      await page.getByLabel("Открыть меню", { exact: true }).click();
      await page.getByRole("navigation", { name: "Мобильная навигация" }).getByRole("link", { name: "Рассчитать стоимость" }).click();
      await expect(page.locator(".mobile-menu")).not.toHaveAttribute("open");
    }
    await page.getByRole("radio", { name: /После ремонта/ }).check();
    await page.getByRole("spinbutton", { name: /Площадь квартиры/ }).fill("300");
    await expect(page.getByLabel("Итоговая стоимость")).toHaveText(/60\s000\s₽/);
    await demoContact(page);
    await page.getByRole("button", { name: "Сохранить демо-заявку" }).click();
    await expect(page.getByRole("heading", { name: "Демо-заявка сохранена" })).toBeVisible();
    await page.getByRole("link", { name: "Открыть демо-кабинет" }).click();
    await expect(page.locator(".cabinet-order")).toHaveCount(1); await noOverflow(page);
  });
}

test("Pages: повреждённое и недоступное хранилище не дают ложного успеха", async ({ page, context }) => {
  await open(page);
  await page.evaluate(key => localStorage.setItem(key, "{bad"), key);
  await demoContact(page);
  await page.getByRole("button", { name: "Сохранить демо-заявку" }).click();
  await expect(page.locator('main [role="alert"]')).toContainText("повреждены");
  await page.goto("cabinet/");
  await expect(page.locator('main [role="alert"]')).toContainText("повреждены");
  await page.getByRole("button", { name: "Очистить демо-данные" }).click();
  await page.getByRole("button", { name: "Да, очистить данные" }).click();
  await expect(page.getByText("Первая заявка — начало порядка")).toBeVisible();
  const blocked = await context.newPage();
  await blocked.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Недоступно", "SecurityError"); } }));
  await open(blocked); await demoContact(blocked);
  await blocked.getByRole("button", { name: "Сохранить демо-заявку" }).click();
  await expect(blocked.locator('main [role="alert"]')).toContainText(/недоступно/i);
  await expect(blocked.getByRole("heading", { name: "Демо-заявка сохранена" })).toHaveCount(0);
  await blocked.close();
});

test("Pages: ссылки, картинка, клавиатура и скриншоты", async ({ page }) => {
  await open(page);
  await expect(page.locator(".clean-image")).toHaveJSProperty("complete", true);
  expect(await page.locator(".clean-image").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  expect(await page.locator('a[href^="#"]').evaluateAll(links => links.map(link => link.getAttribute("href")!).filter(href => !document.getElementById(href.slice(1))))).toEqual([]);
  await noOverflow(page);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Перейти к содержимому" })).toBeFocused();
  await page.getByRole("heading", { level: 1 }).click();
  await page.screenshot({ path: path.join(screenshots, "desktop.png"), fullPage: false });
  await page.locator("#calculator").screenshot({ path: path.join(screenshots, "calculator.png"), style: ".skip-link:not(:focus) { visibility: hidden; }" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(screenshots, "mobile.png"), fullPage: false });
  const question = page.locator(".faq-list summary").filter({ hasText: "Обязательно ли находиться дома?" });
  await question.focus(); await page.keyboard.press("Enter");
  await expect(page.getByText(/Можно присутствовать во время уборки/)).toBeVisible();
  await page.goto("cabinet/");
  await expect(page.getByRole("heading", { name: "Демонстрация кабинета", exact: true })).toBeVisible();
});
