import test from "node:test";
import assert from "node:assert/strict";
import {
  calculate,
  boundedInteger,
  DEFAULT_OPTIONS,
  isCleaningOptions,
  rubles,
} from "../lib/calculation.ts";

test("50 м², поддерживающая, без дополнений → 4 000 ₽", () => {
  const result = calculate(DEFAULT_OPTIONS);
  assert.equal(result.total, 4000);
  assert.equal(result.rate, 80);
  assert.equal(result.minimumApplied, false);
  assert.deepEqual(result.extras, []);
});

test("50 м², генеральная, два окна и духовка → 8 800 ₽", () => {
  const result = calculate({
    ...DEFAULT_OPTIONS,
    type: "deep",
    windows: 2,
    oven: true,
  });
  assert.equal(result.total, 8800);
  assert.equal(result.base, 7000);
  assert.equal(result.extras.length, 2);
});

test("20 м², поддерживающая, холодильник → 3 700 ₽", () => {
  const result = calculate({ ...DEFAULT_OPTIONS, area: 20, fridge: true });
  assert.equal(result.total, 3700);
  assert.equal(result.subtotal, 1600);
  assert.equal(result.base, 3000);
  assert.equal(result.minimumApplied, true);
});

test("minimum applies to base only and all maximum additions are included", () => {
  assert.equal(
    calculate({
      ...DEFAULT_OPTIONS,
      area: 20,
      windows: 20,
      fridge: true,
      oven: true,
    }).total,
    14500,
  );
  assert.equal(
    calculate({
      ...DEFAULT_OPTIONS,
      area: 300,
      type: "renovation",
      windows: 20,
      fridge: true,
      oven: true,
    }).total,
    71500,
  );
});

test("invalid area, unknown tariff and incorrect extra values are rejected", () => {
  for (const options of [
    { ...DEFAULT_OPTIONS, area: 19 },
    { ...DEFAULT_OPTIONS, area: 301 },
    { ...DEFAULT_OPTIONS, area: 50.5 },
    { ...DEFAULT_OPTIONS, area: NaN },
    { ...DEFAULT_OPTIONS, windows: -1 },
    { ...DEFAULT_OPTIONS, windows: 21 },
    { ...DEFAULT_OPTIONS, windows: 1.5 },
    { ...DEFAULT_OPTIONS, type: "toString" },
    { ...DEFAULT_OPTIONS, fridge: "yes" },
    { ...DEFAULT_OPTIONS, area: "50" },
  ]) {
    assert.equal(isCleaningOptions(options), false);
    assert.throws(
      () => calculate(options as typeof DEFAULT_OPTIONS),
      /Некорректные/,
    );
  }
});

test("integer field normalization handles empty, malformed, fractional and out-of-range input", () => {
  assert.equal(boundedInteger("", 20, 300, 50), 50);
  assert.equal(boundedInteger("   ", 20, 300, 50), 50);
  assert.equal(boundedInteger("abc", 20, 300, 50), 50);
  assert.equal(boundedInteger("Infinity", 20, 300, 50), 50);
  assert.equal(boundedInteger("500", 20, 300, 50), 300);
  assert.equal(boundedInteger("-5", 20, 300, 50), 20);
  assert.equal(boundedInteger("50.8", 20, 300, 50), 51);
  assert.match(rubles(4000), /4\s000\s₽/);
});
