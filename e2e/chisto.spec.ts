import { test, expect, type Page } from "@playwright/test";
const key = "chisto.demo.orders.v1";

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydrat|server rendered HTML|didn.t match/i.test(message.text())
    )
      errors.push(message.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});
async function openPage(page: Page, url: string) {
  await page.goto(url);
  // A useEffect-populated field confirms hydration before screenshots mutate caret styles.
  if (!url.includes("/cabinet"))
    await expect(page.locator('input[type="date"]')).toHaveAttribute(
      "min",
      /^\d{4}-\d{2}-\d{2}$/,
    );
}

async function contacts(page: Page) {
  await page.getByLabel("Как к вам обращаться").fill("Демо Клиент");
  await page
    .getByRole("textbox", { name: "Телефон", exact: true })
    .fill("+7 (999) 000-00-00");
  await page
    .getByLabel("О чём нам нужно знать?")
    .fill("Вымышленная заявка для проверки сайта.");
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: innerWidth,
    })),
  ).toEqual({
    scroll: await page.evaluate(() => innerWidth),
    viewport: await page.evaluate(() => innerWidth),
  });
}
test("desktop: calculation, form validation, no demo network, persisted status, filter and safe clear", async ({
  page,
}) => {
  const errors: string[] = [];
  const sends: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      request.url().includes("/api/leads") ||
      request.url().includes("telegram.org")
    )
      sends.push(request.url());
  });
  await openPage(page, "/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Дома — чисто.",
  );
  await expect(page.getByLabel("Итоговая стоимость")).toHaveText(/4\s000\s₽/);
  await page.getByRole("radio", { name: /Генеральная/ }).check();
  await page.getByLabel("Мытьё окон", { exact: true }).fill("2");
  await page.getByRole("checkbox", { name: /Внутри духовки/ }).check();
  await expect(page.getByLabel("Итоговая стоимость")).toHaveText(/8\s800\s₽/);
  await page.getByRole("button", { name: "Сохранить демо-заявку" }).click();
  await expect(
    page.getByText("Введите имя: от 2 до 80 символов."),
  ).toBeVisible();
  await expect(page.getByLabel("Как к вам обращаться")).toBeFocused();
  await contacts(page);
  await page.getByRole("button", { name: "Сохранить демо-заявку" }).dblclick();
  await expect(
    page.getByRole("heading", { name: "Демо-заявка сохранена" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Открыть демо-кабинет" }).click();
  await expect(page.locator(".cabinet-order")).toHaveCount(1);
  await expect(page.locator(".cabinet-order")).toContainText("Демо Клиент");
  await expect(page.locator(".cabinet-summary")).toContainText(/8\s800\s₽/);
  await page.getByLabel(/^Статус заявки/).selectOption("Согласована");
  await page.reload();
  await expect(page.getByLabel(/^Статус заявки/)).toHaveValue("Согласована");
  await page.getByLabel("Показать заявки").selectOption("Новая");
  await expect(page.getByText("В этом статусе пока нет заявок")).toBeVisible();
  await page.getByRole("button", { name: "Показать все заявки" }).click();
  await expect(page.locator(".cabinet-order")).toHaveCount(1);
  await noOverflow(page);
  await page.screenshot({ path: "../chisto-cabinet.png", fullPage: true });
  await page.getByRole("button", { name: "Очистить демо-данные" }).click();
  await page.getByRole("button", { name: "Оставить заявки" }).click();
  await expect(page.locator(".cabinet-order")).toHaveCount(1);
  await page.getByRole("button", { name: "Очистить демо-данные" }).click();
  await page.getByRole("button", { name: "Да, очистить данные" }).click();
  await expect(page.locator(".cabinet-order")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Первая заявка — начало порядка")).toBeVisible();
  expect(sends).toEqual([]);
  expect(errors).toEqual([]);
});
test("minimum, numeric bounds, empty input and synchronized slider", async ({
  page,
}) => {
  await openPage(page, "/");
  const area = page.getByRole("spinbutton", { name: /Площадь квартиры/ });
  const slider = page.getByRole("slider");
  await area.fill("20");
  await page.getByRole("checkbox", { name: /Внутри холодильника/ }).check();
  await expect(page.getByLabel("Итоговая стоимость")).toHaveText(/3\s700\s₽/);
  await expect(page.getByText("Минимум за основную уборку")).toBeVisible();
  await expect(slider).toHaveValue("20");
  await area.fill("");
  await area.blur();
  await expect(area).toHaveValue("20");
  await area.fill("301");
  await area.blur();
  await expect(area).toHaveValue("300");
  await area.fill("19");
  await area.blur();
  await expect(area).toHaveValue("20");
  await slider.focus();
  await slider.press("Home");
  await slider.press("ArrowRight");
  await expect(area).toHaveValue("21");
  await page.getByLabel("Мытьё окон", { exact: true }).fill("100");
  await page.getByLabel("Мытьё окон", { exact: true }).blur();
  await expect(page.getByLabel("Мытьё окон", { exact: true })).toHaveValue(
    "20",
  );
});
for (const width of [375, 390])
  test(`mobile ${width}px: no horizontal scroll, calculator and cabinet`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openPage(page, "/");
    await noOverflow(page);
    await page.screenshot({
      path: `../chisto-mobile-${width}.png`,
      fullPage: true,
    });
    await page.locator('summary[aria-label="Открыть меню"]').click();
    await page
      .getByRole("navigation", { name: "Мобильная навигация" })
      .getByRole("link", { name: "Рассчитать стоимость" })
      .click();
    await page.getByRole("radio", { name: /После ремонта/ }).check();
    await page
      .getByRole("spinbutton", { name: /Площадь квартиры/ })
      .fill("300");
    await expect(page.getByLabel("Итоговая стоимость")).toHaveText(
      /60\s000\s₽/,
    );
    await contacts(page);
    await page.getByRole("button", { name: "Сохранить демо-заявку" }).click();
    await expect(
      page.getByText("Демо-заявка сохранена", { exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Открыть демо-кабинет" }).click();
    await expect(page.locator(".cabinet-order")).toHaveCount(1);
    await noOverflow(page);
    expect(errors).toEqual([]);
  });
test("corrupt storage is visible and recoverable without silent overwrite", async ({
  page,
}) => {
  await openPage(page, "/");
  await page.evaluate((key) => localStorage.setItem(key, "{bad"), key);
  await contacts(page);
  await page.getByRole("button", { name: "Сохранить демо-заявку" }).click();
  await expect(page.locator('main [role="alert"]')).toContainText("повреждены");
  await expect(
    page.getByRole("heading", { name: "Демо-заявка сохранена" }),
  ).toHaveCount(0);
  await openPage(page, "/cabinet");
  await expect(page.locator('main [role="alert"]')).toContainText("повреждены");
  await page.getByRole("button", { name: "Очистить демо-данные" }).click();
  await page.getByRole("button", { name: "Да, очистить данные" }).click();
  await expect(page.getByText("Первая заявка — начало порядка")).toBeVisible();
});
test("unavailable storage never shows a saved submission", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException(
          "Хранилище браузера недоступно",
          "SecurityError",
        );
      },
    }),
  );
  await openPage(page, "/");
  await contacts(page);
  await page.getByRole("button", { name: "Сохранить демо-заявку" }).click();
  await expect(page.locator('main [role="alert"]')).toContainText("недоступно");
  await expect(
    page.getByRole("heading", { name: "Демо-заявка сохранена" }),
  ).toHaveCount(0);
  await openPage(page, "/cabinet");
  await expect(page.locator('main [role="alert"]')).toContainText("недоступно");
});
test("keyboard focus is visible and FAQ works with keyboard", async ({
  page,
}) => {
  await openPage(page, "/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Перейти к содержимому" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => getComputedStyle(document.activeElement!).outlineStyle,
    ),
  ).not.toBe("none");
  const area = page.getByRole("spinbutton", { name: /Площадь квартиры/ });
  await area.focus();
  await page.keyboard.press("ArrowUp");
  await expect(area).toHaveValue("51");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("slider")).toBeFocused();
  const question = page
    .locator(".faq-list summary")
    .filter({ hasText: "Обязательно ли находиться дома?" });
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(/Можно присутствовать во время уборки/),
  ).toBeVisible();
});
test("desktop visual and all anchor links resolve", async ({ page }) => {
  await openPage(page, "/");
  await page.locator(".hero-image").waitFor({ state: "visible" });
  await expect(page.locator(".hero-image")).toHaveJSProperty("complete", true);
  await noOverflow(page);
  expect(
    await page
      .locator('a[href^="#"]')
      .evaluateAll((links) =>
        links
          .map((l) => l.getAttribute("href")!)
          .filter(
            (href) =>
              !document.getElementById(decodeURIComponent(href.slice(1))),
          ),
      ),
  ).toEqual([]);
  await page.screenshot({ path: "../chisto-desktop.png", fullPage: true });
  await page.screenshot({
    path: "../chisto-first-screen.png",
    fullPage: false,
  });
});
test("real mode missing configuration fails in UI with no demo fallback", async ({
  page,
}) => {
  await openPage(page, "http://127.0.0.1:3003/");
  await contacts(page);
  await page
    .getByRole("button", { name: "Отправить заявку", exact: true })
    .click();
  await expect(page.locator('main [role="alert"]')).toContainText(
    "Отправка не настроена",
  );
  await expect(
    page.getByRole("heading", { name: "Заявка отправлена" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Демо-заявка сохранена" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), key),
  ).toBeNull();
});

test("real UI blocks double submit and never confirms API rejection or network failure", async ({
  page,
}) => {
  await openPage(page, "http://127.0.0.1:3003/");
  let calls = 0;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/leads", async (route) => {
    calls += 1;
    await gate;
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "Отправка в Telegram не подтверждена.",
      }),
    });
  });
  await contacts(page);
  await page
    .getByRole("button", { name: "Отправить заявку", exact: true })
    .dblclick();
  await expect(
    page.getByRole("button", { name: "Отправляем заявку…" }),
  ).toBeDisabled();
  release();
  await expect(page.locator('main [role="alert"]')).toContainText(
    "не подтверждена",
  );
  await expect(
    page.getByRole("heading", { name: "Заявка отправлена" }),
  ).toHaveCount(0);
  expect(calls).toBe(1);
  await page.unroute("**/api/leads");
  await page.route("**/api/leads", (route) => route.abort("failed"));
  await page
    .getByRole("button", { name: "Отправить заявку", exact: true })
    .click();
  await expect(page.locator('main [role="alert"]')).toContainText(
    "Связь с сервером прервалась",
  );
  await expect(
    page.getByRole("heading", { name: "Заявка отправлена" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), key),
  ).toBeNull();
});
