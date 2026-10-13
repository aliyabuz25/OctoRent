import express from "express";
import cors from "cors";
import Redis from "ioredis";

const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const ITEMS_KEY = "runstock:items";

const redis = new Redis(REDIS_URL);
redis.on("error", (err) => console.error("[redis]", err.message));

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- EAN-13 yardımcıları ---------- */
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

/* ---------- Alan normalizasyonu ---------- */
const STRING_FIELDS = ["sku", "name", "category", "brand", "unit", "location", "supplier", "description"];
const NUMERIC_FIELDS = ["quantity", "price", "cost", "minStock"];

const today = () => new Date().toISOString().slice(0, 10);

function buildItem(current, body) {
  const item = { ...current };

  for (const field of STRING_FIELDS) {
    if (body[field] !== undefined) item[field] = String(body[field]);
  }
  for (const field of NUMERIC_FIELDS) {
    if (body[field] !== undefined) item[field] = Number(body[field]) || 0;
  }

  if (body.ean13 !== undefined) {
    const ean = String(body.ean13).replace(/\D/g, "");
    if (ean && !isValidEAN13(ean)) {
      return { error: "Geçersiz EAN-13 (13 hane veya kontrol hanesi hatalı)" };
    }
    item.ean13 = ean;
  }

  return { item };
}

async function getItems() {
  const hash = await redis.hgetall(ITEMS_KEY);
  return Object.values(hash)
    .map((value) => JSON.parse(value))
    .sort((a, b) => a.id - b.id);
}

/* ---------- API ---------- */
app.get("/api/health", async (_req, res) => {
  const ping = await redis.ping();
  res.json({ status: "ok", redis: ping });
});

app.get("/api/items", async (_req, res) => {
  res.json(await getItems());
});

app.post("/api/items", async (req, res) => {
  const body = req.body ?? {};
  if (!String(body.sku ?? "").trim() || !String(body.name ?? "").trim()) {
    return res.status(400).json({ error: "sku ve name zorunludur" });
  }

  const items = await getItems();
  const usedEan = new Set(items.map((item) => item.ean13).filter(Boolean));

  const base = {
    quantity: 0,
    price: 0,
    cost: 0,
    minStock: 5,
    category: "-",
    brand: "",
    unit: "Adet",
    location: "",
    supplier: "",
    description: "",
  };

  const { item, error } = buildItem(base, body);
  if (error) return res.status(400).json({ error });

  if (!item.ean13) {
    do {
      item.ean13 = randomEAN13();
    } while (usedEan.has(item.ean13));
  } else if (usedEan.has(item.ean13)) {
    return res.status(409).json({ error: "Bu EAN-13 zaten başka bir üründe kullanılıyor" });
  }

  item.id = Date.now();
  item.createdAt = new Date().toISOString();
  item.updated = body.updated || today();

  await redis.hset(ITEMS_KEY, item.id, JSON.stringify(item));
  res.status(201).json(item);
});

app.put("/api/items/:id", async (req, res) => {
  const raw = await redis.hget(ITEMS_KEY, req.params.id);
  if (!raw) return res.status(404).json({ error: "kayıt bulunamadı" });

  const current = JSON.parse(raw);
  const body = req.body ?? {};

  const items = await getItems();
  const usedEan = new Set(
    items.filter((item) => String(item.id) !== String(current.id)).map((item) => item.ean13).filter(Boolean)
  );

  const { item, error } = buildItem(current, body);
  if (error) return res.status(400).json({ error });
  if (!item.sku?.trim() || !item.name?.trim()) {
    return res.status(400).json({ error: "sku ve name boş olamaz" });
  }
  if (item.ean13 && usedEan.has(item.ean13)) {
    return res.status(409).json({ error: "Bu EAN-13 zaten başka bir üründe kullanılıyor" });
  }

  item.id = current.id;
  item.updated = body.updated || today();

  await redis.hset(ITEMS_KEY, item.id, JSON.stringify(item));
  res.json(item);
});

app.post("/api/items/:id/stock", async (req, res) => {
  const raw = await redis.hget(ITEMS_KEY, req.params.id);
  if (!raw) return res.status(404).json({ error: "kayıt bulunamadı" });

  const current = JSON.parse(raw);
  const delta = Number(req.body?.delta) || 0;
  const quantity = Math.max(0, (Number(current.quantity) || 0) + delta);
  const item = { ...current, quantity, updated: today() };

  await redis.hset(ITEMS_KEY, item.id, JSON.stringify(item));
  res.json(item);
});

app.delete("/api/items/:id", async (req, res) => {
  await redis.hdel(ITEMS_KEY, req.params.id);
  res.status(204).end();
});

/* ---------- Başlangıç verisi ve varsayılanlar ---------- */
const seedData = [
  { sku: "RS-001", name: "Kablosuz Mouse", category: "Aksesuar", brand: "Logi", unit: "Adet", quantity: 42, minStock: 10, price: 349.9, cost: 210, location: "A-01", supplier: "TeknoDağıtım", description: "2.4GHz kablosuz mouse" },
  { sku: "RS-002", name: "Mekanik Klavye", category: "Aksesuar", brand: "Keychron", unit: "Adet", quantity: 17, minStock: 5, price: 1299.0, cost: 890, location: "A-02", supplier: "TeknoDağıtım", description: "RGB mekanik klavye" },
  { sku: "RS-003", name: '27" Monitör', category: "Ekran", brand: "Dell", unit: "Adet", quantity: 8, minStock: 4, price: 5499.0, cost: 4200, location: "B-10", supplier: "Görüntü A.Ş.", description: "IPS 144Hz monitör" },
  { sku: "RS-004", name: "USB-C Hub", category: "Aksesuar", brand: "Anker", unit: "Adet", quantity: 0, minStock: 6, price: 599.5, cost: 380, location: "A-05", supplier: "TeknoDağıtım", description: "7-in-1 USB-C hub" },
  { sku: "RS-005", name: "Laptop Standı", category: "Ofis", brand: "Rain", unit: "Adet", quantity: 63, minStock: 15, price: 249.0, cost: 130, location: "C-03", supplier: "Ofis Malz.", description: "Alüminyum laptop standı" },
];

async function seedIfEmpty() {
  const exists = await redis.exists(ITEMS_KEY);
  if (exists) return;

  const pipeline = redis.pipeline();
  seedData.forEach((item, index) => {
    item.id = index + 1;
    item.ean13 = "";
    item.createdAt = new Date().toISOString();
    item.updated = today();
    pipeline.hset(ITEMS_KEY, item.id, JSON.stringify(item));
  });
  await pipeline.exec();
  console.log("[redis] örnek veriler yüklendi");
}

async function ensureDefaults() {
  const hash = await redis.hgetall(ITEMS_KEY);
  const entries = Object.entries(hash).map(([id, value]) => [id, JSON.parse(value)]);
  const used = new Set(entries.map(([, item]) => item.ean13).filter(Boolean));

  const pipeline = redis.pipeline();
  let changed = false;

  for (const [id, item] of entries) {
    if (!item.ean13 || !isValidEAN13(item.ean13)) {
      let ean;
      do {
        ean = randomEAN13();
      } while (used.has(ean));
      used.add(ean);
      item.ean13 = ean;
      changed = true;
    }
    const defaults = { brand: "", unit: "Adet", cost: 0, minStock: 5, location: "", supplier: "", description: "" };
    for (const [key, value] of Object.entries(defaults)) {
      if (item[key] === undefined) {
        item[key] = value;
        changed = true;
      }
    }
    if (changed) pipeline.hset(ITEMS_KEY, id, JSON.stringify(item));
  }

  if (changed) {
    await pipeline.exec();
    console.log("[redis] varsayılan alanlar ve EAN-13 kodları tamamlandı");
  }
}

seedIfEmpty()
  .then(ensureDefaults)
  .then(() => {
    app.listen(PORT, () => console.log(`API çalışıyor: http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Başlatma hatası:", err);
    process.exit(1);
  });
