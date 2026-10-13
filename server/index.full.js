import express from "express";
import cors from "cors";
import Redis from "ioredis";

const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const ITEMS_KEY = "runstock:items";
const CATEGORIES_KEY = "runstock:categories";
const BRANDS_KEY = "runstock:brands";
const SUPPLIERS_KEY = "runstock:suppliers";
const CUSTOMERS_KEY = "runstock:customers";
const WAREHOUSES_KEY = "runstock:warehouses";
const MOVEMENTS_KEY = "runstock:movements";
const PURCHASES_KEY = "runstock:purchases";
const SALES_KEY = "runstock:sales";
const AUDIT_KEY = "runstock:audit";

const redis = new Redis(REDIS_URL);
redis.on("error", (err) => console.error("[redis]", err.message));

const app = express();
app.use(cors());
app.use(express.json());

const today = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* EAN helpers */
function ean13CheckDigit(base12) {
  const digits = String(base12).padStart(12, "0").slice(0, 12).split("").map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

function isValidEAN13(code) {
  const s = String(code);
  if (!/^\d{13}$/.test(s)) return false;
  return ean13CheckDigit(s.slice(0, 12)) === Number(s[12]);
}

function randomEAN13(prefix = "868") {
  let base = prefix;
  while (base.length < 12) base += Math.floor(Math.random() * 10);
  return base + ean13CheckDigit(base);
}

/* items normalization */
const STRING_FIELDS = ["sku", "name", "category", "brand", "unit", "location", "supplier", "description"];
const NUMERIC_FIELDS = ["quantity", "price", "cost", "minStock"];

function buildItem(current, body) {
  const item = { ...current };
  for (const f of STRING_FIELDS) {
    if (body[f] !== undefined) item[f] = String(body[f]);
  }
  for (const f of NUMERIC_FIELDS) {
    if (body[f] !== undefined) item[f] = Number(body[f]) || 0;
  }
  if (body.ean13 !== undefined) {
    const ean = String(body.ean13).replace(/\D/g, "");
    if (ean && !isValidEAN13(ean)) {
      return { error: "Geçersiz EAN-13" };
    }
    item.ean13 = ean;
  }
  return { item };
}

async function hgetAll(key) {
  const hash = await redis.hgetall(key);
  return Object.values(hash).map((v) => JSON.parse(v));
}

async function hset(key, obj) {
  await redis.hset(key, obj.id, JSON.stringify(obj));
}

async function hdel(key, id) {
  await redis.hdel(key, id);
}

/* base crud helpers */
function createCrudRoutes({ key, required = [], normalize = (x) => x, uniqueField }) {
  const router = express.Router();
  router.get("/", async (_req, res) => {
    const items = await hgetAll(key);
    res.json(items.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")));
  });
  router.post("/", async (req, res) => {
    const body = req.body || {};
    for (const r of required) {
      if (!String(body[r] || "").trim()) {
        return res.status(400).json({ error: `${r} tələb olunur` });
      }
    }
    const items = await hgetAll(key);
    if (uniqueField) {
      if (items.some((i) => String(i[uniqueField]).toLowerCase() === String(body[uniqueField]).toLowerCase())) {
        return res.status(409).json({ error: `${uniqueField} artıq mövcuddur` });
      }
    }
    const obj = normalize({ ...body, id: uid(), createdAt: nowIso(), updated: today() });
    await hset(key, obj);
    res.status(201).json(obj);
  });
  router.put("/:id", async (req, res) => {
    const raw = await redis.hget(key, req.params.id);
    if (!raw) return res.status(404).json({ error: "Tapılmadı" });
    const current = JSON.parse(raw);
    const body = req.body || {};
    const items = await hgetAll(key);
    if (uniqueField && body[uniqueField]) {
      if (items.some((i) => i.id !== current.id && String(i[uniqueField]).toLowerCase() === String(body[uniqueField]).toLowerCase())) {
        return res.status(409).json({ error: `${uniqueField} artıq mövcuddur` });
      }
    }
    const obj = normalize({ ...current, ...body, id: current.id, updated: today() });
    await hset(key, obj);
    res.json(obj);
  });
  router.delete("/:id", async (req, res) => {
    await hdel(key, req.params.id);
    res.status(204).end();
  });
  return router;
}

app.use("/api/categories", createCrudRoutes({ key: CATEGORIES_KEY, required: ["name"], uniqueField: "name", normalize: (x) => ({ id: x.id, name: x.name, code: x.code || "", description: x.description || "", createdAt: x.createdAt, updated: x.updated }) }));
app.use("/api/brands", createCrudRoutes({ key: BRANDS_KEY, required: ["name"], uniqueField: "name", normalize: (x) => ({ id: x.id, name: x.name, code: x.code || "", country: x.country || "", description: x.description || "", createdAt: x.createdAt, updated: x.updated }) }));
app.use("/api/suppliers", createCrudRoutes({ key: SUPPLIERS_KEY, required: ["name"], uniqueField: "name", normalize: (x) => ({ id: x.id, name: x.name, taxNo: x.taxNo || "", phone: x.phone || "", email: x.email || "", address: x.address || "", note: x.note || "", createdAt: x.createdAt, updated: x.updated }) }));
app.use("/api/customers", createCrudRoutes({ key: CUSTOMERS_KEY, required: ["name"], uniqueField: "name", normalize: (x) => ({ id: x.id, name: x.name, phone: x.phone || "", email: x.email || "", address: x.address || "", taxNo: x.taxNo || "", note: x.note || "", createdAt: x.createdAt, updated: x.updated }) }));
app.use("/api/warehouses", createCrudRoutes({ key: WAREHOUSES_KEY, required: ["name"], uniqueField: "name", normalize: (x) => ({ id: x.id, name: x.name, code: x.code || "", address: x.address || "", manager: x.manager || "", note: x.note || "", createdAt: x.createdAt, updated: x.updated }) }));

/* items */
app.get("/api/items", async (_req, res) => {
  const items = await hgetAll(ITEMS_KEY);
  res.json(items.sort((a, b) => Number(a.id) - Number(b.id)));
});

app.post("/api/items", async (req, res) => {
  const body = req.body || {};
  if (!String(body.sku || "").trim() || !String(body.name || "").trim()) {
    return res.status(400).json({ error: "sku və name tələb olunur" });
  }
  const items = await hgetAll(ITEMS_KEY);
  const usedEan = new Set(items.map((i) => i.ean13).filter(Boolean));
  const base = { quantity: 0, price: 0, cost: 0, minStock: 5, category: "-", brand: "", unit: "Adet", location: "", supplier: "", description: "" };
  const { item, error } = buildItem(base, body);
  if (error) return res.status(400).json({ error });
  if (!item.ean13) {
    let ean;
    do {
      ean = randomEAN13();
    } while (usedEan.has(ean));
    item.ean13 = ean;
  } else if (usedEan.has(item.ean13)) {
    return res.status(409).json({ error: "Bu EAN-13 artıq mövcuddur" });
  }
  item.id = Date.now();
  item.createdAt = nowIso();
  item.updated = today();
  await hset(ITEMS_KEY, item);
  await redis.hset(AUDIT_KEY, uid(), JSON.stringify({ at: nowIso(), action: "item.create", entityId: item.id, details: { sku: item.sku } }));
  res.status(201).json(item);
});

app.put("/api/items/:id", async (req, res) => {
  const raw = await redis.hget(ITEMS_KEY, req.params.id);
  if (!raw) return res.status(404).json({ error: "Tapılmadı" });
  const current = JSON.parse(raw);
  const body = req.body || {};
  const items = await hgetAll(ITEMS_KEY);
  const usedEan = new Set(items.filter((i) => String(i.id) !== String(current.id)).map((i) => i.ean13).filter(Boolean));
  const { item, error } = buildItem(current, body);
  if (error) return res.status(400).json({ error });
  if (!item.sku?.trim() || !item.name?.trim()) return res.status(400).json({ error: "sku və name boş ola bilməz" });
  if (item.ean13 && usedEan.has(item.ean13)) return res.status(409).json({ error: "Bu EAN-13 artıq mövcuddur" });
  item.id = current.id;
  item.updated = today();
  await hset(ITEMS_KEY, item);
  await redis.hset(AUDIT_KEY, uid(), JSON.stringify({ at: nowIso(), action: "item.update", entityId: item.id, details: body }));
  res.json(item);
});

app.post("/api/items/:id/stock", async (req, res) => {
  const raw = await redis.hget(ITEMS_KEY, req.params.id);
  if (!raw) return res.status(404).json({ error: "Tapılmadı" });
  const current = JSON.parse(raw);
  const delta = Number(req.body?.delta) || 0;
  const quantity = Math.max(0, (Number(current.quantity) || 0) + delta);
  const item = { ...current, quantity, updated: today() };
  await hset(ITEMS_KEY, item);
  await redis.hset(MOVEMENTS_KEY, uid(), JSON.stringify({ id: uid(), type: delta >= 0 ? "in" : "out", itemId: item.id, itemName: item.name, sku: item.sku, qty: Math.abs(delta), quantityAfter: quantity, date: today(), at: nowIso(), note: req.body?.note || "" }));
  await redis.hset(AUDIT_KEY, uid(), JSON.stringify({ at: nowIso(), action: "stock.move", entityId: item.id, details: { delta } }));
  res.json(item);
});

app.delete("/api/items/:id", async (req, res) => {
  await hdel(ITEMS_KEY, req.params.id);
  await redis.hset(AUDIT_KEY, uid(), JSON.stringify({ at: nowIso(), action: "item.delete", entityId: req.params.id }));
  res.status(204).end();
});

app.get("/api/movements", async (_req, res) => {
  const list = await hgetAll(MOVEMENTS_KEY);
  res.json(list.sort((a, b) => (b.at || "").localeCompare(a.at || "")));
});

app.get("/api/audit", async (_req, res) => {
  const list = await hgetAll(AUDIT_KEY);
  res.json(list.sort((a, b) => (b.at || "").localeCompare(a.at || "")));
});

app.get("/api/health", async (_req, res) => {
  const ping = await redis.ping();
  res.json({ status: "ok", redis: ping });
});

const seedBase = async () => {
  const exists = await redis.exists(ITEMS_KEY);
  if (exists) return;
  const seed = [
    { sku: "RS-001", name: "Kablosuz Mouse", category: "Aksesuar", brand: "Logitech", unit: "Adet", quantity: 42, minStock: 10, price: 349.9, cost: 210, location: "A-01", supplier: "TechSup", description: "2.4GHz kablosuz mouse" },
    { sku: "RS-002", name: "Mekanik Klavye", category: "Aksesuar", brand: "Dell", unit: "Adet", quantity: 17, minStock: 5, price: 1299.0, cost: 890, location: "A-02", supplier: "TechSup", description: "RGB mekanik klavye" },
    { sku: "RS-003", name: '27" Monitör', category: "Ekran", brand: "Samsung", unit: "Adet", quantity: 8, minStock: 4, price: 5499.0, cost: 4200, location: "B-10", supplier: "TechSup", description: "IPS 144Hz monitör" },
  ];
  for (let i = 0; i < seed.length; i++) {
    const s = seed[i];
    s.id = i + 1;
    s.ean13 = randomEAN13();
    s.createdAt = nowIso();
    s.updated = today();
    await hset(ITEMS_KEY, s);
  }
};

seedBase().then(() => {
  app.listen(PORT, () => console.log(`API çalışıyor: http://localhost:${PORT}`));
}).catch((e) => { console.error(e); process.exit(1); });
