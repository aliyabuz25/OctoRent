import express from "express";
import cors from "cors";
import Redis from "ioredis";
import crypto from "crypto";
import fs from "fs";
import https from "https";

const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const TENANTS_KEY = "runstock:tenants";
const USERS_KEY = "runstock:users";
const USERNAMES_KEY = "runstock:usernames";
const SESSION_PREFIX = "runstock:session:";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 gün

const redis = new Redis(REDIS_URL);
redis.on("error", (err) => console.error("[redis]", err.message));

const app = express();
const corsOptions = {
  origin: "*", // AndroidJS WebView sends an opaque `null` origin for bundled views.
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Act-As-Tenant"],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.use(express.json());

const today = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

let numericIdSeq = 0;
function numericId() {
  return Date.now() * 1000 + (numericIdSeq++ % 1000);
}

function scopedKey(tid, base) {
  if (tid === undefined || tid === null) return `runstock:legacy:${base}`;
  return `runstock:${tid}:${base}`;
}

function sessionKey(token) {
  return SESSION_PREFIX + token;
}

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(pw, stored) {
  if (!stored) return false;
  const parts = String(stored).split(":");
  const salt = parts[0];
  const hash = parts[1];
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pw, salt, 64);
  const orig = Buffer.from(hash, "hex");
  if (orig.length !== test.length) return false;
  try {
    return crypto.timingSafeEqual(orig, test);
  } catch {
    return false;
  }
}

async function createSession(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  await redis.set(sessionKey(token), userId, "EX", SESSION_TTL);
  return token;
}

async function destroySession(token) {
  if (!token) return;
  await redis.del(sessionKey(token));
}

const ROLE_PERMS = {
  superadmin: ["tenants"],
  admin: ["read", "write", "stock", "documents", "employees", "settings", "tenant"],
  manager: ["read", "write", "stock", "documents"],
  worker: ["read", "stock"],
};

function hasPerm(user, perm) {
  if (!user || !user.role) return false;
  const p = ROLE_PERMS[user.role] || [];
  return p.includes(perm);
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

const STRING_FIELDS = ["sku", "name", "category", "brand", "unit", "location", "supplier", "description", "serialNumber"];
const NUMERIC_FIELDS = ["quantity", "price", "cost", "minStock", "rentalPrice"];

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
  if (!hash) return [];
  return Object.values(hash)
    .map((v) => {
      try {
        return JSON.parse(v);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function hset(key, obj) {
  if (obj == null || obj.id == null) return;
  await redis.hset(key, String(obj.id), JSON.stringify(obj));
}

async function hdel(key, id) {
  await redis.hdel(key, String(id));
}

async function pushAudit(tid, action, entityId, details = {}) {
  const key = scopedKey(tid, "audit");
  await redis.hset(key, uid(), JSON.stringify({ at: nowIso(), action, entityId, details }));
}

/* stok hərəkəti: məhsulun sayını dəyişir və hərəkat qeydi yaradır */
async function moveItemStock(tid, itemId, delta, note = "") {
  const key = scopedKey(tid, "items");
  const raw = await redis.hget(key, String(itemId));
  if (!raw) return null;
  const cur = JSON.parse(raw);
  const quantity = Math.max(0, (Number(cur.quantity) || 0) + delta);
  const item = { ...cur, quantity, updated: today() };
  await hset(key, item);
  const movKey = scopedKey(tid, "movements");
  await redis.hset(movKey, uid(), JSON.stringify({ id: uid(), tenantId: tid, type: delta >= 0 ? "in" : "out", itemId: item.id, itemName: item.name, sku: item.sku, qty: Math.abs(delta), quantityAfter: quantity, date: today(), at: nowIso(), note }));
  return item;
}

async function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  let token = null;
  if (h.startsWith("Bearer ")) token = h.slice(7);
  if (!token) return res.status(401).json({ error: "Giriş tələb olunur" });
  const userId = await redis.get(sessionKey(token));
  if (!userId) return res.status(401).json({ error: "Sessiya bitdi" });
  const uraw = await redis.hget(USERS_KEY, String(userId));
  if (!uraw) return res.status(401).json({ error: "Sessiya bitdi" });
  const user = JSON.parse(uraw);
  if (user.active === false) return res.status(403).json({ error: "Hesab deaktivdir" });
  /* sistem admini konkret marka kontekstində işləyə bilər (X-Act-As-Tenant) */
  const actAs = String(req.headers["x-act-as-tenant"] || "").trim();
  if (actAs && user.role === "superadmin") {
    const traw = await redis.hget(TENANTS_KEY, actAs);
    if (!traw) return res.status(404).json({ error: "Marka tapılmadı" });
    req.actingAs = actAs;
    req.realUser = user;
    req.user = { ...user, tenantId: actAs, role: "admin" };
    req.token = token;
    return next();
  }
  req.user = user;
  req.token = token;
  next();
}

function createCrudRoutes({ base, required = [], normalize = (x) => x, uniqueField, readPerm = "read", writePerm = "write" }) {
  const router = express.Router();
  router.get("/", async (req, res) => {
    if (!hasPerm(req.user, readPerm)) return res.status(403).json({ error: "Yetkiniz yoxdur" });
    const key = scopedKey(req.user.tenantId, base);
    const items = await hgetAll(key);
    res.json(items.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")));
  });
  router.post("/", async (req, res) => {
    if (!hasPerm(req.user, writePerm)) return res.status(403).json({ error: "Yetkiniz yoxdur" });
    const tid = req.user.tenantId;
    const key = scopedKey(tid, base);
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
    const obj = normalize({ ...body, id: uid(), tenantId: tid, createdAt: nowIso(), updated: today() });
    await hset(key, obj);
    await pushAudit(tid, `${base}.create`, obj.id, { [uniqueField]: obj[uniqueField] });
    res.status(201).json(obj);
  });
  router.put("/:id", async (req, res) => {
    if (!hasPerm(req.user, writePerm)) return res.status(403).json({ error: "Yetkiniz yoxdur" });
    const tid = req.user.tenantId;
    const key = scopedKey(tid, base);
    const raw = await redis.hget(key, String(req.params.id));
    if (!raw) return res.status(404).json({ error: "Tapılmadı" });
    const current = JSON.parse(raw);
    const body = req.body || {};
    const items = await hgetAll(key);
    if (uniqueField && body[uniqueField]) {
      if (items.some((i) => String(i.id) !== String(current.id) && String(i[uniqueField]).toLowerCase() === String(body[uniqueField]).toLowerCase())) {
        return res.status(409).json({ error: `${uniqueField} artıq mövcuddur` });
      }
    }
    const obj = normalize({ ...current, ...body, id: current.id, tenantId: tid, updated: today() });
    await hset(key, obj);
    await pushAudit(tid, `${base}.update`, obj.id, body);
    res.json(obj);
  });
  router.delete("/:id", async (req, res) => {
    if (!hasPerm(req.user, writePerm)) return res.status(403).json({ error: "Yetkiniz yoxdur" });
    const key = scopedKey(req.user.tenantId, base);
    await hdel(key, String(req.params.id));
    await pushAudit(req.user.tenantId, `${base}.delete`, req.params.id);
    res.status(204).end();
  });
  return router;
}

/* ---------------- auth ---------------- */
const authRouter = express.Router();

authRouter.post("/login", async (req, res) => {
  const body = req.body || {};
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!username || !password) return res.status(400).json({ error: "username və password tələb olunur" });
  const userId = await redis.hget(USERNAMES_KEY, username);
  if (!userId) return res.status(401).json({ error: "Yanlış istifadəçi adı və ya şifrə" });
  const uraw = await redis.hget(USERS_KEY, String(userId));
  if (!uraw) return res.status(401).json({ error: "Yanlış istifadəçi adı və ya şifrə" });
  const user = JSON.parse(uraw);
  if (user.active === false) return res.status(403).json({ error: "Hesab deaktivdir" });
  if (!verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: "Yanlış istifadəçi adı və ya şifrə" });
  const token = await createSession(userId);
  res.json({ token, user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  await destroySession(req.token);
  res.status(204).end();
});

/* ---------------- apple watch style pairing ---------------- */
const activePairings = new Map();

authRouter.post("/pair/start", requireAuth, async (req, res) => {
  const code = "opair_" + crypto.randomBytes(16).toString("hex");
  const mobileToken = await createSession(req.user.id);

  let tenant = null;
  if (req.user.tenantId) {
    const raw = await redis.hget(TENANTS_KEY, String(req.user.tenantId));
    if (raw) {
      try { tenant = JSON.parse(raw); } catch {}
    }
  }

  const payload = {
    v: 1,
    type: "octorent_apple_pair",
    code,
    token: mobileToken,
    user: publicUser(req.user),
    tenant: tenant ? { id: tenant.id, name: tenant.name } : null,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };

  activePairings.set(code, {
    ...payload,
    desktopToken: req.token,
    status: "waiting",
  });

  setTimeout(() => activePairings.delete(code), 5 * 60 * 1000);

  res.json({
    code,
    expiresAt: payload.expiresAt,
    qrPayload: JSON.stringify(payload),
    user: payload.user,
    tenant: payload.tenant,
  });
});

authRouter.get("/pair/status/:code", requireAuth, async (req, res) => {
  const pair = activePairings.get(req.params.code);
  if (!pair) return res.status(404).json({ error: "Eşləmə kodu tapılmadı və ya vaxtı bitdi" });
  res.json({ status: pair.status, user: pair.user });
});

authRouter.post("/pair/confirm", async (req, res) => {
  const { code, token } = req.body || {};
  let targetUser = null;
  let targetTenant = null;

  if (code && activePairings.has(code)) {
    const pair = activePairings.get(code);
    pair.status = "paired";
    targetUser = pair.user;
    targetTenant = pair.tenant;

    if (pair.tenant?.id) {
      try {
        broadcastNotification(pair.tenant.id, {
          title: "Cihaz Eşləməsi Tamamlandı",
          body: `${pair.user.name || pair.user.username} mobil cihaz ilə uğurla qoşuldu!`,
          url: "/mobile",
          tag: `pair-${code}`,
        });
      } catch {}
    }
  }

  if (!targetUser && token) {
    const userId = await redis.get(sessionKey(token));
    if (!userId) return res.status(401).json({ error: "Etibarsız və ya vaxtı bitmiş sessiya" });
    const uraw = await redis.hget(USERS_KEY, String(userId));
    if (!uraw) return res.status(401).json({ error: "İstifadəçi tapılmadı" });
    targetUser = publicUser(JSON.parse(uraw));
  }

  if (!targetUser) {
    return res.status(400).json({ error: "Eşləmə təsdiqlənə bilmədi" });
  }

  res.json({ status: "paired", user: targetUser, tenant: targetTenant });
});

function publicUser(u) {
  return { id: u.id, tenantId: u.tenantId, username: u.username, name: u.name, role: u.role, active: u.active };
}

/* ---------------- seeding / bootstrap ---------------- */
async function seedTenant(tid) {
  const itemsKey = scopedKey(tid, "items");
  const exists = await redis.exists(itemsKey);
  if (exists) return;
  const seedItems = [
    { sku: "RS-001", name: "Kablosuz Mouse", category: "Aksesuar", brand: "Logitech", unit: "Adet", quantity: 0, minStock: 10, price: 349.9, cost: 210, location: "A-01", supplier: "TechSup", description: "2.4GHz kablosuz mouse" },
    { sku: "RS-002", name: "Mekanik Klavye", category: "Aksesuar", brand: "Dell", unit: "Adet", quantity: 0, minStock: 5, price: 1299.0, cost: 890, location: "A-02", supplier: "TechSup", description: "RGB mekanik klavye" },
    { sku: "RS-003", name: '27" Monitör', category: "Ekran", brand: "Samsung", unit: "Adet", quantity: 0, minStock: 4, price: 5499.0, cost: 4200, location: "B-10", supplier: "TechSup", description: "IPS 144Hz monitör" },
  ];
  const itemMap = {};
  for (const s of seedItems) {
    s.id = numericId();
    s.tenantId = tid;
    s.ean13 = randomEAN13();
    s.createdAt = nowIso();
    s.updated = today();
    await hset(itemsKey, s);
    itemMap[s.sku] = s;
  }
  const catKey = scopedKey(tid, "categories");
  for (const name of ["Aksesuar", "Ekran", "Kompüter", "Ofis", "Digər"]) {
    await hset(catKey, { id: uid(), tenantId: tid, name, code: "", description: "", createdAt: nowIso(), updated: today() });
  }
  const supKey = scopedKey(tid, "suppliers");
  for (const name of ["TechSup", "Ərzaq Tədarük", "Elektronika Dağıtım"]) {
    await hset(supKey, { id: uid(), tenantId: tid, name, taxNo: "", phone: "", email: "", address: "", note: "", createdAt: nowIso(), updated: today() });
  }
  const custKey = scopedKey(tid, "customers");
  for (const name of ["Müştəri A", "Müştəri B", "Mağaza 01"]) {
    await hset(custKey, { id: uid(), tenantId: tid, name, phone: "", email: "", address: "", taxNo: "", note: "", createdAt: nowIso(), updated: today() });
  }

  /* real əməliyyatlar: alış → satış → kiralama (stok yalnız bu əməliyyatlardan yaranır) */
  const a = itemMap["RS-001"];
  const b = itemMap["RS-002"];
  const c = itemMap["RS-003"];
  const buy = (it, qty) => ({ itemId: it.id, sku: it.sku, name: it.name, qty, price: it.cost, total: +(it.cost * qty).toFixed(2) });
  const sell = (it, qty) => ({ itemId: it.id, sku: it.sku, name: it.name, qty, price: it.price, total: +(it.price * qty).toFixed(2) });

  await performPurchase(tid, { supplier: "TechSup", reference: "AL-0001", status: "received", note: "Açılış alışı", items: [buy(a, 50), buy(b, 20), buy(c, 10)] });
  await performSale(tid, { customer: "Müştəri A", reference: "SAT-0001", status: "paid", note: "Kassa satışı", items: [sell(a, 8), sell(b, 3)] });
  await performRental(tid, { customer: "Müştəri B", reference: "KIR-0001", status: "active", note: "Günlük kiralama", items: [sell(c, 2)] });
  await pushAudit(tid, "tenant.seed", tid, { note: "Nümunə əməliyyatlar icra olundu" });
}

async function ensureBootstrap() {
  /* sistem admini (platform) */
  const superUsername = "superadmin";
  const existingSuper = await redis.hget(USERNAMES_KEY, superUsername);
  if (!existingSuper) {
    const sid = uid();
    await redis.hset(USERS_KEY, String(sid), JSON.stringify({ id: sid, tenantId: "", username: superUsername, passwordHash: hashPassword("superadmin123"), name: "Sistem Admini", role: "superadmin", active: true, createdAt: nowIso() }));
    await redis.hset(USERNAMES_KEY, superUsername, String(sid));
  }
  /* nümunə işletmə */
  const tenantsCount = await redis.hlen(TENANTS_KEY);
  if (tenantsCount > 0) return;
  const tenantId = uid();
  await redis.hset(TENANTS_KEY, String(tenantId), JSON.stringify({ id: tenantId, name: "Nümunə Mağaza", createdAt: nowIso() }));
  const userId = uid();
  const username = "admin";
  await redis.hset(USERS_KEY, String(userId), JSON.stringify({ id: userId, tenantId, username, passwordHash: hashPassword("admin123"), name: "Mağaza Admini", role: "admin", active: true, createdAt: nowIso() }));
  await redis.hset(USERNAMES_KEY, username, String(userId));
  await seedTenant(tenantId);
}

/* ---------------- routes ---------------- */
app.get("/api/health", async (_req, res) => {
  const ping = await redis.ping();
  res.json({ status: "ok", redis: ping });
});

app.use("/api/auth", authRouter);
app.use("/api", requireAuth);

app.get("/api/tenant", async (req, res) => {
  if (!req.user.tenantId) return res.status(404).json({ error: "Tenant tapılmadı" });
  const raw = await redis.hget(TENANTS_KEY, String(req.user.tenantId));
  if (!raw) return res.status(404).json({ error: "Tenant tapılmadı" });
  res.json({ tenant: JSON.parse(raw) });
});

app.put("/api/tenant", async (req, res) => {
  if (!hasPerm(req.user, "tenant")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const raw = await redis.hget(TENANTS_KEY, String(tid));
  if (!raw) return res.status(404).json({ error: "Tenant tapılmadı" });
  const t = JSON.parse(raw);
  const body = req.body || {};
  if (body.name) t.name = String(body.name).trim();
  t.updated = today();
  await redis.hset(TENANTS_KEY, String(tid), JSON.stringify(t));
  res.json({ tenant: t });
});

/* platform (super admin) — işletme/marka idarəetməsi */
function requireSuper(req, res, next) {
  if (!req.user || req.user.role !== "superadmin") return res.status(403).json({ error: "Yalnız sistem admini" });
  next();
}

app.get("/api/tenants", requireSuper, async (_req, res) => {
  const tenants = await hgetAll(TENANTS_KEY);
  const users = await hgetAll(USERS_KEY);
  const list = tenants.map((t) => {
    const members = users.filter((u) => String(u.tenantId) === String(t.id));
    return { ...t, userCount: members.length, admins: members.filter((u) => u.role === "admin").map((u) => u.username) };
  });
  res.json(list.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")));
});

app.post("/api/tenants", requireSuper, async (req, res) => {
  const body = req.body || {};
  const tenantName = String(body.tenantName || "").trim();
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim() || "Admin";
  if (!tenantName || !username || password.length < 4) {
    return res.status(400).json({ error: "tenantName, username, password (>= 4) tələb olunur" });
  }
  const existing = await redis.hget(USERNAMES_KEY, username);
  if (existing) return res.status(409).json({ error: "Bu istifadəçi adı artıq mövcuddur" });
  const tenantId = uid();
  const tenant = { id: tenantId, name: tenantName, createdAt: nowIso() };
  await redis.hset(TENANTS_KEY, String(tenantId), JSON.stringify(tenant));
  const userId = uid();
  const user = { id: userId, tenantId, username, passwordHash: hashPassword(password), name, role: "admin", active: true, createdAt: nowIso() };
  await redis.hset(USERS_KEY, String(userId), JSON.stringify(user));
  await redis.hset(USERNAMES_KEY, username, String(userId));
  await seedTenant(tenantId);
  res.status(201).json({ tenant, admin: publicUser(user) });
});

app.put("/api/tenants/:id", requireSuper, async (req, res) => {
  const id = String(req.params.id);
  const raw = await redis.hget(TENANTS_KEY, id);
  if (!raw) return res.status(404).json({ error: "Marka tapılmadı" });
  const t = JSON.parse(raw);
  const body = req.body || {};
  if (body.name !== undefined) {
    const n = String(body.name).trim();
    if (!n) return res.status(400).json({ error: "Ad tələb olunur" });
    t.name = n;
  }
  if (body.code !== undefined) t.code = String(body.code).trim();
  if (body.note !== undefined) t.note = String(body.note);
  t.updated = nowIso();
  await redis.hset(TENANTS_KEY, String(id), JSON.stringify(t));
  res.json({ tenant: t });
});

const BACKUP_BASES = ["items", "categories", "brands", "suppliers", "customers", "warehouses", "movements", "purchases", "sales", "rentals", "invoices", "maintenance", "cashflow", "audit"];

app.get("/api/tenants/:id/backup", requireSuper, async (req, res) => {
  const id = String(req.params.id);
  const raw = await redis.hget(TENANTS_KEY, id);
  if (!raw) return res.status(404).json({ error: "Marka tapılmadı" });
  const tenant = JSON.parse(raw);
  const users = (await hgetAll(USERS_KEY)).filter((u) => String(u.tenantId) === String(id)).map(publicUser);
  const data = {};
  const counts = {};
  for (const base of BACKUP_BASES) {
    const rows = await hgetAll(scopedKey(id, base));
    data[base] = rows;
    counts[base] = rows.length;
  }
  const generatedAt = nowIso();
  const backup = { type: "runstock-tenant-backup", version: 1, generatedAt, tenant, users, counts, data };
  tenant.lastBackup = generatedAt;
  await redis.hset(TENANTS_KEY, id, JSON.stringify(tenant));
  const slug = String(tenant.name || "brand").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "brand";
  const filename = `runstock-backup-${slug}-${Date.now()}.json`;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(JSON.stringify(backup, null, 2));
});

app.post("/api/tenants/:id/backup/request", requireSuper, async (req, res) => {
  const id = String(req.params.id);
  const raw = await redis.hget(TENANTS_KEY, id);
  if (!raw) return res.status(404).json({ error: "Marka tapılmadı" });
  const t = JSON.parse(raw);
  t.lastBackupRequest = nowIso();
  await redis.hset(TENANTS_KEY, id, JSON.stringify(t));
  res.json({ ok: true, requestedAt: t.lastBackupRequest, downloadUrl: `/api/tenants/${id}/backup` });
});

/* employees/users */
function requireEmployees(req, res, next) {
  if (!hasPerm(req.user, "employees")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  next();
}

app.get("/api/users", requireEmployees, async (req, res) => {
  const tid = req.user.tenantId;
  const users = await hgetAll(USERS_KEY);
  const list = users.filter((u) => String(u.tenantId) === String(tid));
  res.json(list.map(publicUser));
});

app.post("/api/users", requireEmployees, async (req, res) => {
  const tid = req.user.tenantId;
  const body = req.body || {};
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  const role = String(body.role || "worker");
  if (!username || !password || !name) return res.status(400).json({ error: "username, password, name tələb olunur" });
  if (!["admin", "manager", "worker"].includes(role)) return res.status(400).json({ error: "Geçersiz rol" });
  const existing = await redis.hget(USERNAMES_KEY, username);
  if (existing) return res.status(409).json({ error: "Bu istifadəçi adı artıq mövcuddur" });
  const userId = uid();
  const user = { id: userId, tenantId: tid, username, passwordHash: hashPassword(password), name, role, active: body.active !== false, createdAt: nowIso() };
  await redis.hset(USERS_KEY, String(userId), JSON.stringify(user));
  await redis.hset(USERNAMES_KEY, username, String(userId));
  await pushAudit(tid, "user.create", userId, { username, role });
  res.status(201).json(publicUser(user));
});

app.put("/api/users/:id", requireEmployees, async (req, res) => {
  const tid = req.user.tenantId;
  const id = String(req.params.id);
  const raw = await redis.hget(USERS_KEY, id);
  if (!raw) return res.status(404).json({ error: "Tapılmadı" });
  const user = JSON.parse(raw);
  if (String(user.tenantId) !== String(tid)) return res.status(404).json({ error: "Tapılmadı" });
  const body = req.body || {};
  if (body.name) user.name = String(body.name).trim();
  if (body.role && ["admin", "manager", "worker"].includes(body.role)) user.role = body.role;
  if (body.active !== undefined) user.active = !!body.active;
  if (body.password) user.passwordHash = hashPassword(String(body.password));
  await redis.hset(USERS_KEY, id, JSON.stringify(user));
  await pushAudit(tid, "user.update", id, { role: user.role, active: user.active });
  res.json(publicUser(user));
});

app.delete("/api/users/:id", requireEmployees, async (req, res) => {
  const tid = req.user.tenantId;
  const id = String(req.params.id);
  if (id === String(req.user.id)) return res.status(400).json({ error: "Özünüzü silə bilməzsiniz" });
  const raw = await redis.hget(USERS_KEY, id);
  if (!raw) return res.status(404).json({ error: "Tapılmadı" });
  const user = JSON.parse(raw);
  if (String(user.tenantId) !== String(tid)) return res.status(404).json({ error: "Tapılmadı" });
  const users = await hgetAll(USERS_KEY);
  const admins = users.filter((u) => String(u.tenantId) === String(tid) && u.role === "admin" && u.active !== false);
  if (user.role === "admin" && admins.length <= 1) return res.status(400).json({ error: "Sonuncu admin silinə bilməz" });
  await redis.hdel(USERS_KEY, id);
  await redis.hdel(USERNAMES_KEY, String(user.username).toLowerCase());
  await pushAudit(tid, "user.delete", id, { username: user.username });
  res.status(204).end();
});

/* entity CRUD */
app.use("/api/categories", createCrudRoutes({ base: "categories", required: ["name"], uniqueField: "name", normalize: (x) => ({ id: x.id, tenantId: x.tenantId, name: x.name, code: x.code || "", description: x.description || "", createdAt: x.createdAt, updated: x.updated }) }));
app.use("/api/brands", createCrudRoutes({ base: "brands", required: ["name"], uniqueField: "name", normalize: (x) => ({ id: x.id, tenantId: x.tenantId, name: x.name, code: x.code || "", country: x.country || "", description: x.description || "", createdAt: x.createdAt, updated: x.updated }) }));
app.use("/api/suppliers", createCrudRoutes({ base: "suppliers", required: ["name"], uniqueField: "name", normalize: (x) => ({ id: x.id, tenantId: x.tenantId, name: x.name, taxNo: x.taxNo || "", phone: x.phone || "", email: x.email || "", address: x.address || "", note: x.note || "", createdAt: x.createdAt, updated: x.updated }) }));
app.use("/api/customers", createCrudRoutes({ base: "customers", required: ["name"], uniqueField: "name", normalize: (x) => ({ id: x.id, tenantId: x.tenantId, name: x.name, phone: x.phone || "", email: x.email || "", address: x.address || "", taxNo: x.taxNo || "", note: x.note || "", createdAt: x.createdAt, updated: x.updated }) }));
app.use("/api/warehouses", createCrudRoutes({ base: "warehouses", required: ["name"], uniqueField: "name", normalize: (x) => ({ id: x.id, tenantId: x.tenantId, name: x.name, code: x.code || "", address: x.address || "", manager: x.manager || "", note: x.note || "", createdAt: x.createdAt, updated: x.updated }) }));

/* ---------------- Real-time Notifications (SSE) ---------------- */
const sseClients = new Map();

function broadcastNotification(tid, eventData) {
  const clients = sseClients.get(String(tid));
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

app.get("/api/realtime/notifications", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.query.token;
  if (!token) return res.status(401).json({ error: "Token tələb olunur" });

  const userId = await redis.hget(SESSIONS_KEY, token);
  if (!userId) return res.status(401).json({ error: "Sessiya etibarsızdır" });
  const raw = await redis.hget(USERS_KEY, String(userId));
  if (!raw) return res.status(401).json({ error: "İstifadəçi tapılmadı" });
  const user = JSON.parse(raw);
  const tid = String(user.tenantId);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  res.write(":\n\n");

  if (!sseClients.has(tid)) sseClients.set(tid, new Set());
  sseClients.get(tid).add(res);

  const keepAlive = setInterval(() => {
    try {
      res.write(": keepalive\n\n");
    } catch {
      /* ignore */
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    const clients = sseClients.get(tid);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(tid);
    }
  });
});

app.post("/api/notifications/test", requireAuth, async (req, res) => {
  const tid = req.user.tenantId;
  broadcastNotification(tid, {
    title: "OctoRent Bildirişi",
    body: "Sınaq bildirişi: Android və mobil cihazınız uğurla qoşuldu!",
    url: "/mobile/stock",
    tag: "test-notification",
  });
  res.json({ success: true, message: "Sınaq bildirişi göndərildi" });
});

/* items */
app.get("/api/items", async (req, res) => {
  if (!hasPerm(req.user, "read")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const items = await hgetAll(scopedKey(req.user.tenantId, "items"));
  res.json(items.sort((a, b) => Number(a.id) - Number(b.id)));
});

app.post("/api/items", async (req, res) => {
  if (!hasPerm(req.user, "write")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const key = scopedKey(tid, "items");
  const body = req.body || {};
  if (!String(body.sku || "").trim() || !String(body.name || "").trim()) {
    return res.status(400).json({ error: "sku və name tələb olunur" });
  }
  const items = await hgetAll(key);
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
  item.id = numericId();
  item.tenantId = tid;
  item.createdAt = nowIso();
  item.updated = today();
  await hset(key, item);
  await pushAudit(tid, "item.create", item.id, { sku: item.sku });
  broadcastNotification(tid, {
    title: "Yeni Məhsul Əlavə Edildi",
    body: `${item.name} (${item.sku}) uğurla qeydiyyata alındı. İlkin stok: ${item.quantity} ${item.unit || "ədəd"}`,
    url: "/mobile/stock",
    tag: `item-${item.id}`,
  });
  res.status(201).json(item);
});

app.put("/api/items/:id", async (req, res) => {
  if (!hasPerm(req.user, "write")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const key = scopedKey(tid, "items");
  const raw = await redis.hget(key, String(req.params.id));
  if (!raw) return res.status(404).json({ error: "Tapılmadı" });
  const current = JSON.parse(raw);
  const body = req.body || {};
  const items = await hgetAll(key);
  const usedEan = new Set(items.filter((i) => String(i.id) !== String(current.id)).map((i) => i.ean13).filter(Boolean));
  const { item, error } = buildItem(current, body);
  if (error) return res.status(400).json({ error });
  if (!item.sku?.trim() || !item.name?.trim()) return res.status(400).json({ error: "sku və name boş ola bilməz" });
  if (item.ean13 && usedEan.has(item.ean13)) return res.status(409).json({ error: "Bu EAN-13 artıq mövcuddur" });
  item.id = current.id;
  item.tenantId = tid;
  item.updated = today();
  await hset(key, item);
  await pushAudit(tid, "item.update", item.id, body);
  broadcastNotification(tid, {
    title: "Məhsul Yeniləndi",
    body: `${item.name}: məlumat və ya qiymət dəyişdirildi (Qiymət: ${item.price} ₺)`,
    url: "/mobile/stock",
    tag: `item-${item.id}`,
  });
  res.json(item);
});

app.post("/api/items/:id/stock", async (req, res) => {
  if (!hasPerm(req.user, "stock")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const delta = Number(req.body?.delta) || 0;
  const item = await moveItemStock(tid, req.params.id, delta, req.body?.note || "");
  if (!item) return res.status(404).json({ error: "Tapılmadı" });
  await pushAudit(tid, "stock.move", item.id, { delta });
  broadcastNotification(tid, {
    title: delta > 0 ? "Stok Artımı (+)" : "Stok Azalması (-)",
    body: `${item.name}: yeni stok qalığı ${item.quantity} ${item.unit || "ədəd"} (${delta > 0 ? "+" + delta : delta})`,
    url: "/mobile/stock",
    tag: `stock-${item.id}`,
  });
  res.json(item);
});

app.delete("/api/items/:id", async (req, res) => {
  if (!hasPerm(req.user, "write")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  await hdel(scopedKey(req.user.tenantId, "items"), String(req.params.id));
  await pushAudit(req.user.tenantId, "item.delete", req.params.id);
  broadcastNotification(req.user.tenantId, {
    title: "Məhsul Silindi",
    body: "Məhsul bazadan silindi.",
    url: "/mobile/stock",
    tag: `del-${req.params.id}`,
  });
  res.status(204).end();
});

app.get("/api/movements", async (req, res) => {
  if (!hasPerm(req.user, "read")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const list = await hgetAll(scopedKey(req.user.tenantId, "movements"));
  res.json(list.sort((a, b) => (b.at || "").localeCompare(a.at || "")));
});

app.get("/api/audit", async (req, res) => {
  if (!hasPerm(req.user, "read")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const list = await hgetAll(scopedKey(req.user.tenantId, "audit"));
  res.json(list.sort((a, b) => (b.at || "").localeCompare(a.at || "")));
});

/* purchases / sales (documents) — statusa görə stoqa real təsir edir */
const PURCHASE_IN_STATES = new Set(["received", "paid"]);
const SALE_OUT_STATES = new Set(["confirmed", "paid"]);
function docShouldApply(base, doc) {
  if (base === "purchases") return PURCHASE_IN_STATES.has(doc.status);
  if (base === "sales") return SALE_OUT_STATES.has(doc.status);
  return false;
}

async function applyDocStock(tid, base, doc, apply) {
  const sign = base === "purchases" ? 1 : -1;
  const label = base === "purchases" ? "Alış" : "Satış";
  for (const line of doc.items || []) {
    if (line.itemId === undefined || line.itemId === null) continue;
    await moveItemStock(tid, line.itemId, (apply ? 1 : -1) * sign * Math.abs(Number(line.qty) || 0), `${label}: ${doc.reference || doc.id}`);
  }
}

async function performPurchase(tid, data) {
  const doc = { id: uid(), tenantId: tid, type: "purchase", supplier: data.supplier || "", customer: "", reference: data.reference || "", date: data.date || today(), items: data.items, total: Number(data.total) || (data.items || []).reduce((s, l) => s + Number(l.total || 0), 0), note: data.note || "", status: data.status || "received", at: nowIso(), createdAt: nowIso(), updated: today(), stockApplied: false };
  if (docShouldApply("purchases", doc)) {
    await applyDocStock(tid, "purchases", doc, true);
    doc.stockApplied = true;
  }
  await hset(scopedKey(tid, "purchases"), doc);
  await pushAudit(tid, "purchases.create", doc.id);
  return doc;
}

async function performSale(tid, data) {
  const doc = { id: uid(), tenantId: tid, type: "sale", customer: data.customer || "", supplier: "", reference: data.reference || "", date: data.date || today(), items: data.items, total: Number(data.total) || (data.items || []).reduce((s, l) => s + Number(l.total || 0), 0), note: data.note || "", status: data.status || "paid", at: nowIso(), createdAt: nowIso(), updated: today(), stockApplied: false };
  if (docShouldApply("sales", doc)) {
    await applyDocStock(tid, "sales", doc, true);
    doc.stockApplied = true;
  }
  await hset(scopedKey(tid, "sales"), doc);
  await pushAudit(tid, "sales.create", doc.id);
  return doc;
}

async function performRental(tid, data) {
  const doc = { id: uid(), tenantId: tid, type: "rental", customer: data.customer || "", reference: data.reference || "", date: data.date || today(), items: data.items, total: Number(data.total) || (data.items || []).reduce((s, l) => s + Number(l.total || 0), 0), note: data.note || "", status: data.status || "draft", at: nowIso(), createdAt: nowIso(), updated: today(), stockDeducted: false };
  if (RENTAL_OUT_STATES.has(doc.status)) {
    await rentalMoveStock(tid, doc, "out");
    doc.stockDeducted = true;
  }
  await hset(scopedKey(tid, "rentals"), doc);
  await pushAudit(tid, "rental.create", doc.id);
  return doc;
}

function docCrud({ base }) {
  const router = express.Router();
  router.get("/", async (req, res) => {
    if (!hasPerm(req.user, "documents")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
    const list = await hgetAll(scopedKey(req.user.tenantId, base));
    res.json(list.sort((a, b) => (b.at || "").localeCompare(a.at || "")));
  });
  router.post("/", async (req, res) => {
    if (!hasPerm(req.user, "documents")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
    const body = req.body || {};
    if (base === "purchases") {
      if (!body.supplier || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({ error: "Satıcı və məhsullar tələb olunur" });
      }
    } else {
      if (!body.customer || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({ error: "Müştəri və məhsullar tələb olunur" });
      }
    }
    const tid = req.user.tenantId;
    const doc = { id: uid(), tenantId: tid, type: base === "purchases" ? "purchase" : "sale", supplier: body.supplier || "", customer: body.customer || "", reference: body.reference || "", date: body.date || today(), items: body.items, total: Number(body.total) || 0, note: body.note || "", status: body.status || "draft", at: nowIso(), createdAt: nowIso(), updated: today(), stockApplied: false };
    if (docShouldApply(base, doc)) {
      await applyDocStock(tid, base, doc, true);
      doc.stockApplied = true;
    }
    await hset(scopedKey(tid, base), doc);
    await pushAudit(tid, `${base}.create`, doc.id);
    res.status(201).json(doc);
  });
  router.put("/:id", async (req, res) => {
    if (!hasPerm(req.user, "documents")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
    const tid = req.user.tenantId;
    const key = scopedKey(tid, base);
    const raw = await redis.hget(key, String(req.params.id));
    if (!raw) return res.status(404).json({ error: "Tapılmadı" });
    const cur = JSON.parse(raw);
    const doc = { ...cur, ...req.body, id: cur.id, tenantId: tid, updated: today() };
    if (cur.stockApplied === true) {
      await applyDocStock(tid, base, cur, false);
      doc.stockApplied = false;
    }
    if (docShouldApply(base, doc)) {
      await applyDocStock(tid, base, doc, true);
      doc.stockApplied = true;
    }
    await hset(key, doc);
    await pushAudit(tid, `${base}.update`, doc.id);
    res.json(doc);
  });
  router.delete("/:id", async (req, res) => {
    if (!hasPerm(req.user, "documents")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
    const tid = req.user.tenantId;
    const key = scopedKey(tid, base);
    const raw = await redis.hget(key, String(req.params.id));
    if (raw) {
      const cur = JSON.parse(raw);
      if (cur.stockApplied === true) await applyDocStock(tid, base, cur, false);
    }
    await hdel(key, String(req.params.id));
    res.status(204).end();
  });
  return router;
}

app.use("/api/purchases", docCrud({ base: "purchases" }));
app.use("/api/sales", docCrud({ base: "sales" }));

/* rentals (tenant-scoped, stock ledger) */
const RENTAL_OUT_STATES = new Set(["confirmed", "rented", "active"]);
const isRentalOut = (doc) => doc.stockDeducted === true || RENTAL_OUT_STATES.has(doc.status);

async function rentalMoveStock(tenantId, doc, direction) {
  for (const line of doc.items || []) {
    const raw = await redis.hget(scopedKey(tenantId, "items"), String(line.itemId));
    if (!raw) continue;
    const cur = JSON.parse(raw);
    const amount = Math.abs(Number(line.qty) || 0);
    const qty = direction === "out"
      ? Math.max(0, (Number(cur.quantity) || 0) - amount)
      : (Number(cur.quantity) || 0) + amount;
    await hset(scopedKey(tenantId, "items"), { ...cur, quantity: qty, updated: today() });
    const movKey = scopedKey(tenantId, "movements");
    await redis.hset(movKey, uid(), JSON.stringify({ id: uid(), tenantId, type: direction, itemId: cur.id, itemName: cur.name, sku: cur.sku, qty: amount, quantityAfter: qty, date: today(), at: nowIso(), note: (direction === "out" ? "Kiralama: " : "Kiralama iade: ") + (doc.reference || doc.id) }));
  }
}

app.get("/api/rentals", async (req, res) => {
  if (!hasPerm(req.user, "documents")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const list = await hgetAll(scopedKey(req.user.tenantId, "rentals"));
  res.json(list.sort((a, b) => (b.at || "").localeCompare(a.at || "")));
});

app.post("/api/rentals", async (req, res) => {
  if (!hasPerm(req.user, "documents")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const body = req.body || {};
  if (!body.customer || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: "Müştəri və məhsullar tələb olunur" });
  }
  const tid = req.user.tenantId;
  const doc = { id: uid(), tenantId: tid, type: "rental", customer: body.customer, reference: body.reference || "", date: body.date || today(), items: body.items, total: Number(body.total) || 0, note: body.note || "", status: body.status || "draft", at: nowIso(), createdAt: nowIso(), updated: today(), stockDeducted: false };
  try {
    if (RENTAL_OUT_STATES.has(doc.status)) {
      await rentalMoveStock(tid, doc, "out");
      doc.stockDeducted = true;
    }
  } catch (e) {
    console.error(e);
  }
  await hset(scopedKey(tid, "rentals"), doc);
  await pushAudit(tid, "rental.create", doc.id);
  res.status(201).json(doc);
});

app.put("/api/rentals/:id", async (req, res) => {
  if (!hasPerm(req.user, "documents")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const key = scopedKey(tid, "rentals");
  const raw = await redis.hget(key, String(req.params.id));
  if (!raw) return res.status(404).json({ error: "Tapılmadı" });
  const cur = JSON.parse(raw);
  const wasOut = isRentalOut(cur);
  const doc = { ...cur, ...req.body, id: cur.id, tenantId: tid, updated: today() };
  const willOut = RENTAL_OUT_STATES.has(doc.status);
  try {
    if (!wasOut && willOut) {
      await rentalMoveStock(tid, doc, "out");
      doc.stockDeducted = true;
    } else if (wasOut && !willOut) {
      await rentalMoveStock(tid, doc, "in");
      doc.stockDeducted = false;
    }
  } catch (e) {
    console.error(e);
  }
  await hset(key, doc);
  await pushAudit(tid, "rental.update", doc.id);
  res.json(doc);
});

app.delete("/api/rentals/:id", async (req, res) => {
  if (!hasPerm(req.user, "documents")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const key = scopedKey(tid, "rentals");
  const raw = await redis.hget(key, String(req.params.id));
  if (raw) {
    const cur = JSON.parse(raw);
    try {
      if (isRentalOut(cur)) await rentalMoveStock(tid, cur, "in");
    } catch (e) {
      console.error(e);
    }
  }
  await hdel(key, String(req.params.id));
  res.status(204).end();
});

/* invoices (tenant-scoped, OctoRent invoice tracking) */
app.get("/api/invoices", async (req, res) => {
  if (!hasPerm(req.user, "documents") && !hasPerm(req.user, "read")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const list = await hgetAll(scopedKey(tid, "invoices"));
  res.json(list.sort((a, b) => (b.createdAt || b.at || "").localeCompare(a.createdAt || a.at || "")));
});

app.get("/api/invoices/:id", async (req, res) => {
  if (!hasPerm(req.user, "documents") && !hasPerm(req.user, "read")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const raw = await redis.hget(scopedKey(tid, "invoices"), String(req.params.id));
  if (!raw) return res.status(404).json({ error: "Faktura tapılmadı" });
  res.json(JSON.parse(raw));
});

app.post("/api/invoices", async (req, res) => {
  if (!hasPerm(req.user, "documents")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const body = req.body || {};
  const tid = req.user.tenantId;
  const invoiceId = uid();
  const doc = {
    id: invoiceId,
    tenantId: tid,
    customer: body.customer || "",
    customerId: body.customerId || null,
    status: body.status || "active",
    paymentStatus: body.paymentStatus || "unpaid",
    totalAmount: Number(body.totalAmount || body.total) || 0,
    items: Array.isArray(body.items) ? body.items.map((it, idx) => ({
      id: it.id || (Date.now() + idx),
      productId: it.productId || it.itemId,
      sku: it.sku || "",
      name: it.name || it.productName || "",
      rentalPrice: Number(it.rentalPrice || it.price) || 0,
      days: Number(it.days) || 1,
      quantity: Number(it.quantity || it.qty) || 1,
      totalPrice: Number(it.totalPrice || it.total) || 0,
      returnStatus: !!it.returnStatus,
      isPaid: !!it.isPaid,
    })) : [],
    startDate: body.startDate || today(),
    endDate: body.endDate || today(),
    note: body.note || "",
    createdBy: req.user.name || req.user.username || "Sistem",
    createdById: req.user.id,
    closedBy: null,
    closedAt: null,
    paymentDate: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    history: [
      { action: "created", by: req.user.name || req.user.username, at: nowIso(), note: "Faktura yaradıldı" }
    ]
  };

  await hset(scopedKey(tid, "invoices"), doc);
  await pushAudit(tid, "invoice.create", doc.id);
  res.status(201).json(doc);
});

app.put("/api/invoices/:id", async (req, res) => {
  if (!hasPerm(req.user, "documents")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const key = scopedKey(tid, "invoices");
  const raw = await redis.hget(key, String(req.params.id));
  if (!raw) return res.status(404).json({ error: "Faktura tapılmadı" });
  const cur = JSON.parse(raw);
  const body = req.body || {};

  const history = Array.isArray(cur.history) ? [...cur.history] : [];
  if (body.status && body.status !== cur.status) {
    history.push({
      action: `status_changed_to_${body.status}`,
      by: req.user.name || req.user.username,
      at: nowIso(),
      note: `Status dəyişdirildi: ${body.status}`
    });
  }

  const updatedDoc = {
    ...cur,
    ...body,
    id: cur.id,
    tenantId: tid,
    history,
    closedBy: body.status === "closed" ? (req.user.name || req.user.username) : cur.closedBy,
    closedAt: body.status === "closed" ? nowIso() : cur.closedAt,
    updatedAt: nowIso()
  };

  await hset(key, updatedDoc);
  await pushAudit(tid, "invoice.update", updatedDoc.id);
  res.json(updatedDoc);
});

app.put("/api/invoices/:id/pay", async (req, res) => {
  if (!hasPerm(req.user, "documents")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const key = scopedKey(tid, "invoices");
  const raw = await redis.hget(key, String(req.params.id));
  if (!raw) return res.status(404).json({ error: "Faktura tapılmadı" });
  const cur = JSON.parse(raw);

  const history = Array.isArray(cur.history) ? [...cur.history] : [];
  history.push({
    action: "payment_received",
    by: req.user.name || req.user.username,
    at: nowIso(),
    note: "Ödəniş qeydə alındı"
  });

  const updatedItems = (cur.items || []).map((it) => ({ ...it, isPaid: true }));
  const updatedDoc = {
    ...cur,
    paymentStatus: "paid",
    paymentDate: nowIso(),
    items: updatedItems,
    history,
    updatedAt: nowIso()
  };

  await hset(key, updatedDoc);
  await pushAudit(tid, "invoice.pay", updatedDoc.id);
  res.json({ success: true, invoice: updatedDoc });
});

app.put("/api/invoices/:invoiceId/items/:itemId/return", async (req, res) => {
  if (!hasPerm(req.user, "documents")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const key = scopedKey(tid, "invoices");
  const raw = await redis.hget(key, String(req.params.invoiceId));
  if (!raw) return res.status(404).json({ error: "Faktura tapılmadı" });
  const cur = JSON.parse(raw);

  let targetItem = null;
  const items = (cur.items || []).map((it) => {
    if (String(it.id) === String(req.params.itemId)) {
      targetItem = { ...it, returnStatus: true, returnedAt: nowIso() };
      return targetItem;
    }
    return it;
  });

  if (!targetItem) return res.status(404).json({ error: "Faktura kalemi tapılmadı" });

  // Return product stock
  if (targetItem.productId) {
    try {
      const itemRaw = await redis.hget(scopedKey(tid, "items"), String(targetItem.productId));
      if (itemRaw) {
        const prod = JSON.parse(itemRaw);
        const qty = (Number(prod.quantity) || 0) + (Number(targetItem.quantity) || 1);
        await hset(scopedKey(tid, "items"), { ...prod, quantity: qty, updated: today() });
        const movKey = scopedKey(tid, "movements");
        await redis.hset(movKey, uid(), JSON.stringify({
          id: uid(),
          tenantId: tid,
          type: "in",
          itemId: prod.id,
          itemName: prod.name,
          sku: prod.sku,
          qty: Number(targetItem.quantity) || 1,
          quantityAfter: qty,
          date: today(),
          at: nowIso(),
          note: `Faktura #${cur.id} - Məhsul təhvil alındı`
        }));
      }
    } catch (e) {
      console.error("Stock return error:", e);
    }
  }

  const allReturned = items.every((it) => it.returnStatus);
  const history = Array.isArray(cur.history) ? [...cur.history] : [];
  history.push({
    action: "item_returned",
    by: req.user.name || req.user.username,
    at: nowIso(),
    note: `Təhvil alındı: ${targetItem.name || targetItem.sku}`
  });

  const updatedDoc = {
    ...cur,
    items,
    status: allReturned ? "closed" : cur.status,
    closedBy: allReturned ? (req.user.name || req.user.username) : cur.closedBy,
    closedAt: allReturned ? nowIso() : cur.closedAt,
    history,
    updatedAt: nowIso()
  };

  await hset(key, updatedDoc);
  await pushAudit(tid, "invoice.item_return", `${cur.id}:${targetItem.id}`);
  res.json({ success: true, item: targetItem, invoice: updatedDoc });
});

/* maintenance (Servis & Texniki Baxış) */
app.get("/api/maintenance", async (req, res) => {
  if (!hasPerm(req.user, "read")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const list = await hgetAll(scopedKey(tid, "maintenance"));
  res.json(list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
});

app.post("/api/maintenance", async (req, res) => {
  if (!hasPerm(req.user, "write") && !hasPerm(req.user, "stock")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const body = req.body || {};
  const doc = {
    id: uid(),
    tenantId: tid,
    itemId: body.itemId || null,
    itemName: body.itemName || "",
    sku: body.sku || "",
    serialNumber: body.serialNumber || "",
    issue: body.issue || "",
    status: body.status || "in_service", // in_service, repaired, scrapped, pending
    cost: Number(body.cost) || 0,
    technician: body.technician || req.user.name || req.user.username || "",
    note: body.note || "",
    startDate: body.startDate || today(),
    completedDate: body.completedDate || null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await hset(scopedKey(tid, "maintenance"), doc);
  await pushAudit(tid, "maintenance.create", doc.id);
  res.status(201).json(doc);
});

app.put("/api/maintenance/:id", async (req, res) => {
  if (!hasPerm(req.user, "write") && !hasPerm(req.user, "stock")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const key = scopedKey(tid, "maintenance");
  const raw = await redis.hget(key, String(req.params.id));
  if (!raw) return res.status(404).json({ error: "Qeyd tapılmadı" });
  const cur = JSON.parse(raw);
  const updatedDoc = {
    ...cur,
    ...req.body,
    id: cur.id,
    tenantId: tid,
    updatedAt: nowIso(),
  };
  await hset(key, updatedDoc);
  await pushAudit(tid, "maintenance.update", updatedDoc.id);
  res.json(updatedDoc);
});

app.delete("/api/maintenance/:id", async (req, res) => {
  if (!hasPerm(req.user, "write") && !hasPerm(req.user, "stock")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  await hdel(scopedKey(tid, "maintenance"), String(req.params.id));
  res.status(204).end();
});

/* cashflow (Kassa & Maliyyə Hərəkətləri) */
app.get("/api/cashflow", async (req, res) => {
  if (!hasPerm(req.user, "documents") && !hasPerm(req.user, "read")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const list = await hgetAll(scopedKey(tid, "cashflow"));
  res.json(list.sort((a, b) => (b.date || b.createdAt || "").localeCompare(a.date || a.createdAt || "")));
});

app.post("/api/cashflow", async (req, res) => {
  if (!hasPerm(req.user, "documents")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  const body = req.body || {};
  const doc = {
    id: uid(),
    tenantId: tid,
    type: body.type === "expense" ? "expense" : "income", // income or expense
    category: body.category || "Digər", // Kirayə, Satış, Təmir, Əməkhaqqı, İcarə, Kommunal, Digər
    amount: Math.abs(Number(body.amount) || 0),
    paymentMethod: body.paymentMethod || "Nağd", // Nağd, Kart/Pos, Bank Köçürməsi
    party: body.party || "", // Müştəri və ya Şəxs
    description: body.description || "",
    date: body.date || today(),
    createdBy: req.user.name || req.user.username || "",
    createdAt: nowIso(),
  };
  await hset(scopedKey(tid, "cashflow"), doc);
  await pushAudit(tid, "cashflow.create", doc.id);
  res.status(201).json(doc);
});

app.delete("/api/cashflow/:id", async (req, res) => {
  if (!hasPerm(req.user, "documents")) return res.status(403).json({ error: "Yetkiniz yoxdur" });
  const tid = req.user.tenantId;
  await hdel(scopedKey(tid, "cashflow"), String(req.params.id));
  res.status(204).end();
});

ensureBootstrap()
  .then(() => {
    const certFile = process.env.TLS_CERT_FILE;
    const keyFile = process.env.TLS_KEY_FILE;
    if (certFile || keyFile) {
      if (!certFile || !keyFile) throw new Error("TLS_CERT_FILE və TLS_KEY_FILE birlikdə verilməlidir");
      const server = https.createServer({ cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) }, app);
      server.listen(PORT, () => console.log(`API çalışıyor: https://localhost:${PORT}`));
      return;
    }
    app.listen(PORT, () => console.log(`API çalışıyor: http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
