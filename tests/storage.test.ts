import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_OPTIONS } from "../lib/calculation.ts";
import {
  readOrders,
  saveDemo,
  writeOrders,
  STORAGE_KEY,
  type StorageLike,
} from "../lib/demo-storage.ts";
import type { LeadInput } from "../lib/validation.ts";

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}
const lead: LeadInput = {
  options: { ...DEFAULT_OPTIONS },
  contact: {
    name: "Демо Клиент",
    phone: "+7 (999) 000-00-00",
    date: "",
    comment: "Вымышленные данные",
  },
};

test("demo submission persists validated contact, options and trusted total across reload", () => {
  const storage = memoryStorage();
  assert.deepEqual(readOrders(storage), []);
  const order = saveDemo(storage, lead, "demo-order-0001");
  assert.equal(order.total, 4000);
  assert.equal(order.status, "Новая");
  assert.equal(order.contact.phone, "+79990000000");
  assert.deepEqual(readOrders(storage), [order]);
  assert.equal(readOrders(storage)[0].contact.comment, "Вымышленные данные");
});

test("same demo id is idempotent and does not create another order", () => {
  const storage = memoryStorage();
  const first = saveDemo(storage, lead, "demo-order-0002");
  const repeated = saveDemo(storage, lead, "demo-order-0002");
  assert.deepEqual(repeated, first);
  assert.equal(readOrders(storage).length, 1);
});

test("status changes survive storage reload; past requested date remains readable", () => {
  const storage = memoryStorage();
  const order = saveDemo(storage, lead, "demo-order-0003");
  order.status = "Согласована";
  order.contact.date = "2020-01-01";
  writeOrders(storage, [order]);
  assert.equal(readOrders(storage)[0].status, "Согласована");
  assert.equal(readOrders(storage)[0].contact.date, "2020-01-01");
});

test("stored total is recomputed rather than trusted", () => {
  const storage = memoryStorage();
  const order = saveDemo(storage, lead, "demo-order-0004");
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, orders: [{ ...order, total: 1 }] }),
  );
  assert.equal(readOrders(storage)[0].total, 4000);
});

test("broken JSON, bad version, duplicate ids and malformed orders fail without erasing data", () => {
  const storage = memoryStorage();
  const order = saveDemo(storage, lead, "demo-order-0005");
  for (const raw of [
    "{bad json",
    JSON.stringify({ version: 2, orders: [] }),
    JSON.stringify({ version: 1, orders: [order, order] }),
    JSON.stringify({ version: 1, orders: [{ ...order, status: "Paid" }] }),
    JSON.stringify({
      version: 1,
      orders: [{ ...order, options: { ...DEFAULT_OPTIONS, area: -1 } }],
    }),
  ]) {
    storage.setItem(STORAGE_KEY, raw);
    assert.throws(() => readOrders(storage), /повреждены/);
    assert.equal(storage.getItem(STORAGE_KEY), raw);
  }
});

test("unavailable and full storage do not report a saved submission", () => {
  const denied: StorageLike = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      throw new Error("denied");
    },
    removeItem() {
      throw new Error("denied");
    },
  };
  assert.throws(() => readOrders(denied), /недоступно/);
  assert.throws(() => saveDemo(denied, lead, "demo-order-0006"), /недоступно/);
  const full: StorageLike = {
    getItem: () => null,
    setItem() {
      throw new Error("quota");
    },
    removeItem() {},
  };
  assert.throws(() => saveDemo(full, lead, "demo-order-0007"), /не сохранена/);
});

test("invalid submitted contact is rejected and removing only demo key resets cabinet", () => {
  const storage = memoryStorage();
  assert.throws(
    () =>
      saveDemo(
        storage,
        { ...lead, contact: { ...lead.contact, phone: "invalid" } },
        "demo-order-0008",
      ),
    /Проверьте/,
  );
  saveDemo(storage, lead, "demo-order-0009");
  storage.setItem("other-app", "untouched");
  storage.removeItem(STORAGE_KEY);
  assert.deepEqual(readOrders(storage), []);
  assert.equal(storage.getItem("other-app"), "untouched");
});
