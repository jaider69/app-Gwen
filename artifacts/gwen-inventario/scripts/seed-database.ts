/**
 * Seed generator for Gwen Inventario (Opción A).
 *
 * Runs in Node (via `npx tsx scripts/seed-database.ts`) and writes a single
 * `seed-data.json` file containing every AsyncStorage key the app expects,
 * pre-populated with realistic data simulating ~3 months of a corner store.
 *
 * The data is internally consistent: each product's sale/entry/adjustment
 * movements are simulated forward so that `stockAfter` of every movement and
 * the final `Product.stock` always line up (no negative stock, no orphans).
 *
 * The companion loader `src/data/seed/seedLoader.ts` injects this JSON into the
 * device's AsyncStorage the first time the app runs in dev mode.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const NOW = Date.now();
const DAY = 86_400_000;
const isoDaysAgo = (d: number) => new Date(NOW - d * DAY).toISOString();
const isoDaysFromNow = (d: number) => new Date(NOW + d * DAY).toISOString();

// ---------------------------------------------------------------------------
// Fixed identities so the session, store and users all line up.
// ---------------------------------------------------------------------------
const STORE_ID = 'store_demo';
const USER_ID = 'user_demo';
const USER_NAME = 'Carlos Mendoza';
const USER_EMAIL = 'carlos@mitienda.com';

// ---------------------------------------------------------------------------
// Categories (mirrors DEFAULT_CATEGORIES in productService.ts)
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { id: 'cat_bebidas', name: 'Bebidas' },
  { id: 'cat_snacks', name: 'Snacks' },
  { id: 'cat_lacteos', name: 'Lácteos' },
  { id: 'cat_granos', name: 'Granos' },
  { id: 'cat_enlatados', name: 'Enlatados' },
  { id: 'cat_aseo', name: 'Aseo' },
  { id: 'cat_dulces', name: 'Dulces' },
  { id: 'cat_panaderia', name: 'Panadería' },
  { id: 'cat_otros', name: 'Otros' },
];

// ---------------------------------------------------------------------------
// Product blueprints. `start` = opening stock ~90 days ago. `entries` and
// `adjustments` are movements; `final` is the desired ending stock (which
// drives the health state we want to showcase). `soldTotal` is derived.
// ---------------------------------------------------------------------------
type Entry = { d: number; q: number };
type Adjust = { d: number; q: number; note: string };

interface ProductBlueprint {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  supplier: string;
  unit: string;
  price: number;
  minimumStock: number;
  expiresInDays?: number;
  start: number;
  entries: Entry[];
  adjustments: Adjust[];
  final: number;
}

const PRODUCTS: ProductBlueprint[] = [
  {
    id: 'prod_coca', name: 'Coca Cola 600ml', brand: 'Coca-Cola', categoryId: 'cat_bebidas',
    supplier: 'Coca-Cola FEMSA', unit: 'unidad', price: 3500, minimumStock: 6,
    expiresInDays: 60, start: 40, entries: [{ d: 85, q: 24 }, { d: 50, q: 18 }], adjustments: [], final: 24,
  },
  {
    id: 'prod_agua', name: 'Agua Cristal 600ml', brand: 'Cristal', categoryId: 'cat_bebidas',
    supplier: 'Postobón', unit: 'unidad', price: 2000, minimumStock: 10,
    expiresInDays: 90, start: 50, entries: [{ d: 85, q: 30 }], adjustments: [], final: 30,
  },
  {
    id: 'prod_papitas', name: 'Papitas Margarita', brand: 'Margarita', categoryId: 'cat_snacks',
    supplier: 'Barcel', unit: 'paquete', price: 2800, minimumStock: 5,
    expiresInDays: 45, start: 25, entries: [{ d: 85, q: 15 }],
    adjustments: [{ d: 30, q: -2, note: 'Merma por humedad' }], final: 15,
  },
  {
    id: 'prod_leche', name: 'Leche Alquería 1L', brand: 'Alquería', categoryId: 'cat_lacteos',
    supplier: 'Alquería', unit: 'litro', price: 4200, minimumStock: 6,
    expiresInDays: 3, start: 20, entries: [{ d: 82, q: 12 }], adjustments: [], final: 5,
  },
  {
    id: 'prod_yogur', name: 'Yogur Kumis 170g', brand: 'Alquería', categoryId: 'cat_lacteos',
    supplier: 'Alquería', unit: 'unidad', price: 2500, minimumStock: 6,
    expiresInDays: 7, start: 22, entries: [{ d: 84, q: 12 }], adjustments: [], final: 12,
  },
  {
    id: 'prod_arroz', name: 'Arroz Diana 1kg', brand: 'Diana', categoryId: 'cat_granos',
    supplier: 'Diana', unit: 'bolsa', price: 3800, minimumStock: 5,
    expiresInDays: 180, start: 30, entries: [{ d: 85, q: 20 }], adjustments: [], final: 20,
  },
  {
    id: 'prod_frijol', name: 'Frijol Rojo 500g', brand: 'Local', categoryId: 'cat_granos',
    supplier: 'Distribuciones del Valle', unit: 'bolsa', price: 4500, minimumStock: 4,
    expiresInDays: 365, start: 25, entries: [{ d: 83, q: 18 }], adjustments: [], final: 18,
  },
  {
    id: 'prod_atun', name: 'Atún Van Camps', brand: 'Van Camps', categoryId: 'cat_enlatados',
    supplier: 'Van Camps', unit: 'lata', price: 5200, minimumStock: 8,
    expiresInDays: 730, start: 35, entries: [{ d: 85, q: 24 }],
    adjustments: [{ d: 20, q: -1, note: 'Lata abollada' }], final: 24,
  },
  {
    id: 'prod_sopa', name: 'Sopa Maggi Pollo', brand: 'Maggi', categoryId: 'cat_enlatados',
    supplier: 'Nestlé', unit: 'unidad', price: 1800, minimumStock: 6,
    expiresInDays: 365, start: 18, entries: [{ d: 80, q: 10 }], adjustments: [], final: 10,
  },
  {
    id: 'prod_detergente', name: 'Detergente Ariel 800g', brand: 'Ariel', categoryId: 'cat_aseo',
    supplier: 'Procter & Gamble', unit: 'unidad', price: 12000, minimumStock: 3,
    start: 12, entries: [{ d: 78, q: 6 }], adjustments: [], final: 3,
  },
  {
    id: 'prod_jet', name: 'Chocolatina Jet 40g', brand: 'Jet', categoryId: 'cat_dulces',
    supplier: 'Nacional de Chocolates', unit: 'unidad', price: 1500, minimumStock: 10,
    expiresInDays: 120, start: 45, entries: [{ d: 85, q: 30 }],
    adjustments: [{ d: 40, q: -3, note: 'Producto vencido retirado' }], final: 30,
  },
  {
    id: 'prod_pan', name: 'Pan Tajado Bimbo', brand: 'Bimbo', categoryId: 'cat_panaderia',
    supplier: 'Bimbo', unit: 'unidad', price: 6500, minimumStock: 4,
    expiresInDays: 1, start: 15, entries: [{ d: 82, q: 10 }], adjustments: [], final: 0,
  },
];

// ---------------------------------------------------------------------------
// Completed sales are distributed across 8 time slots. Each product is sold in
// a rotating subset of those slots; its `soldTotal` (derived below) is split
// across the included slots so stock stays consistent.
// ---------------------------------------------------------------------------
const SALE_SLOTS = [5, 12, 20, 28, 37, 46, 58, 72];

function deriveSoldTotal(p: ProductBlueprint): number {
  const entriesSum = p.entries.reduce((s, e) => s + e.q, 0);
  const adjSum = p.adjustments.reduce((s, a) => s + a.q, 0);
  return p.start + entriesSum + adjSum - p.final;
}

function slotsForProduct(index: number): number[] {
  const slots: number[] = [];
  for (let s = 0; s < SALE_SLOTS.length; s += 1) {
    if ((s + index) % 8 < 6) slots.push(s);
  }
  if (slots.length === 0) slots.push(index % SALE_SLOTS.length);
  return slots;
}

function splitTotal(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

// Build, per product, the list of sale events { slot, qty } from completed sales.
interface SaleEvent { slot: number; qty: number; }
const saleEventsByProduct = new Map<string, SaleEvent[]>();
PRODUCTS.forEach((p, idx) => {
  const slots = slotsForProduct(idx);
  const soldTotal = deriveSoldTotal(p);
  const chunks = splitTotal(soldTotal, slots.length);
  saleEventsByProduct.set(p.id, slots.map((slot, i) => ({ slot, qty: chunks[i] })));
});

// ---------------------------------------------------------------------------
// Assemble the final records.
// ---------------------------------------------------------------------------
let movementCounter = 0;
let saleCounter = 0;
let itemCounter = 0;

const createdAt = isoDaysAgo(90);
const store = {
  id: STORE_ID, storeId: STORE_ID, name: 'Mi Tiendita del Barrio',
  address: 'Calle 10 #5-20, Barrio Centro', createdAt, updatedAt: isoDaysAgo(0),
};

const user = {
  id: USER_ID, userId: USER_ID, storeId: STORE_ID, displayName: USER_NAME,
  email: USER_EMAIL, createdAt, updatedAt: isoDaysAgo(0),
};

const categories = CATEGORIES.map((c) => ({
  id: c.id, storeId: STORE_ID, name: c.name, createdAt, updatedAt: isoDaysAgo(0),
}));

const products: any[] = [];
const movements: any[] = [];

for (const p of PRODUCTS) {
  const expiresAt = p.expiresInDays !== undefined ? isoDaysFromNow(p.expiresInDays) : undefined;

  // Collect and order every movement for this product chronologically.
  type Pending = { type: 'entry' | 'sale' | 'adjustment'; d: number; q: number; note?: string; slot?: number };
  const pending: Pending[] = [];
  for (const e of p.entries) pending.push({ type: 'entry', d: e.d, q: e.q, note: 'Reposición de inventario' });
  for (const a of p.adjustments) pending.push({ type: 'adjustment', d: a.d, q: a.q, note: a.note });
  for (const ev of saleEventsByProduct.get(p.id) ?? []) {
    pending.push({ type: 'sale', d: SALE_SLOTS[ev.slot], q: ev.qty, slot: ev.slot });
  }
  // Oldest first (larger days-ago first). Entries/adjustments before sales on the same day.
  pending.sort((a, b) => (b.d - a.d) || ((a.type === 'sale' ? 1 : 0) - (b.type === 'sale' ? 1 : 0)));

  let running = p.start;
  for (const m of pending) {
    const occurredAt = isoDaysAgo(m.d);
    const stockBefore = running;
    if (m.type === 'sale') running -= m.q;
    else running += m.q;
    const stockAfter = running;
    movementCounter += 1;
    movements.push({
      id: `mov_${movementCounter}`,
      storeId: STORE_ID,
      productId: p.id,
      userId: USER_ID,
      userName: USER_NAME,
      quantity: Math.abs(m.q),
      type: m.type,
      occurredAt,
      stockBefore,
      stockAfter,
      note: m.note,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
  }

  products.push({
    id: p.id, storeId: STORE_ID, name: p.name, brand: p.brand, categoryId: p.categoryId,
    supplier: p.supplier, unit: p.unit, stock: running, price: p.price,
    minimumStock: p.minimumStock, expiresAt, createdAt, updatedAt: isoDaysAgo(0),
  });
}

// ---------------------------------------------------------------------------
// Build Sale + SaleItem records from the completed sale events.
// ---------------------------------------------------------------------------
const sales: any[] = [];
const saleItems: any[] = [];

// Group completed sale events by slot.
const eventsBySlot = new Map<number, { productId: string; qty: number }[]>();
for (const p of PRODUCTS) {
  for (const ev of saleEventsByProduct.get(p.id) ?? []) {
    if (!eventsBySlot.has(ev.slot)) eventsBySlot.set(ev.slot, []);
    eventsBySlot.get(ev.slot)!.push({ productId: p.id, qty: ev.qty });
  }
}

for (let slotIndex = 0; slotIndex < SALE_SLOTS.length; slotIndex += 1) {
  const lines = eventsBySlot.get(slotIndex) ?? [];
  if (lines.length === 0) continue;
  saleCounter += 1;
  const saleId = `sale_${saleCounter}`;
  const soldAt = isoDaysAgo(SALE_SLOTS[slotIndex]);
  let total = 0;
  for (const line of lines) {
    const product = products.find((pr) => pr.id === line.productId)!;
    const subtotal = product.price * line.qty;
    total += subtotal;
    itemCounter += 1;
    saleItems.push({
      id: `item_${itemCounter}`, storeId: STORE_ID, saleId, productId: product.id,
      productName: product.name, quantity: line.qty, unitPrice: product.price,
      subtotal, createdAt: soldAt, updatedAt: soldAt,
    });
  }
  sales.push({
    id: saleId, storeId: STORE_ID, userId: USER_ID, userName: USER_NAME,
    soldAt, total, status: 'completed', createdAt: soldAt, updatedAt: soldAt,
  });
}

// A couple of cancelled / draft sales for variety (no stock impact, no movements).
const extraSales: Array<{ status: 'cancelled' | 'draft'; daysAgo: number; lines: Array<[string, number]> }> = [
  { status: 'cancelled', daysAgo: 15, lines: [['prod_coca', 2], ['prod_papitas', 1]] },
  { status: 'cancelled', daysAgo: 33, lines: [['prod_jet', 3]] },
  { status: 'draft', daysAgo: 2, lines: [['prod_agua', 1], ['prod_leche', 1]] },
  { status: 'draft', daysAgo: 9, lines: [['prod_arroz', 2]] },
];
for (const extra of extraSales) {
  saleCounter += 1;
  const saleId = `sale_${saleCounter}`;
  const soldAt = isoDaysAgo(extra.daysAgo);
  let total = 0;
  for (const [productId, qty] of extra.lines) {
    const product = products.find((pr) => pr.id === productId)!;
    const subtotal = product.price * qty;
    total += subtotal;
    itemCounter += 1;
    saleItems.push({
      id: `item_${itemCounter}`, storeId: STORE_ID, saleId, productId,
      productName: product.name, quantity: qty, unitPrice: product.price,
      subtotal, createdAt: soldAt, updatedAt: soldAt,
    });
  }
  sales.push({
    id: saleId, storeId: STORE_ID, userId: USER_ID, userName: USER_NAME,
    soldAt, total, status: extra.status, createdAt: soldAt, updatedAt: soldAt,
  });
}

// ---------------------------------------------------------------------------
// Mock auth session + user so the app auto-signs-in against this data.
// ---------------------------------------------------------------------------
const session = {
  userId: USER_ID, storeId: STORE_ID, storeName: store.name, email: USER_EMAIL,
  displayName: USER_NAME, accessToken: 'mock_token_seed', refreshToken: 'mock_refresh_seed',
  expiresAt: NOW + 7 * DAY * 1000,
};
const mockUsers = {
  [USER_EMAIL]: { password: 'demo1234', displayName: USER_NAME, storeName: store.name },
};

// ---------------------------------------------------------------------------
// Assemble the AsyncStorage map and write it out.
// ---------------------------------------------------------------------------
const storageMap: Record<string, unknown> = {
  '@gwen-inventario/stores': [store],
  '@gwen-inventario/users': [user],
  '@gwen-inventario/categories': categories,
  '@gwen-inventario/products': products,
  '@gwen-inventario/inventory_movements': movements,
  '@gwen-inventario/sales': sales,
  '@gwen-inventario/sale_items': saleItems,
  '@gwen-inventario/sync_queue': [],
  '@gwen-inventario/mock-auth-session': session,
  '@gwen-inventario/mock-auth-users': mockUsers,
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../src/data/seed');
const outFile = resolve(outDir, 'seed-data.json');
mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(storageMap, null, 2), 'utf-8');

// ---------------------------------------------------------------------------
// Console report so we can eyeball the resulting health states.
// ---------------------------------------------------------------------------
const EXPIRY_WINDOW = 30;
function health(p: any) {
  const low = p.stock <= p.minimumStock;
  const out = p.stock === 0;
  let expiring = false;
  if (p.expiresAt) {
    const days = Math.ceil((new Date(`${p.expiresAt}T00:00:00`).getTime() - NOW) / (1000 * 60 * 60 * 24));
    expiring = days >= 0 && days <= EXPIRY_WINDOW;
  }
  const status = out ? 'AGOTADO' : low ? 'STOCK BAJO' : expiring ? 'POR VENCER' : 'normal';
  return { status, low, out, expiring };
}

console.log('\n=== Gwen Inventario — Seed generado ===');
console.log(`Archivo: ${outFile}`);
console.log(`Tienda: ${store.name} (${STORE_ID})`);
console.log(`Usuario: ${USER_NAME} <${USER_EMAIL}>  ·  contraseña: demo1234`);
console.log(`Categorías: ${categories.length} · Productos: ${products.length}`);
console.log(`Movimientos: ${movements.length} · Ventas: ${sales.length} · Items de venta: ${saleItems.length}\n`);
console.log('Producto'.padEnd(26), 'Stock', 'Mín', 'Estado');
console.log('-'.repeat(52));
for (const p of products) {
  const h = health(p);
  console.log(p.name.padEnd(26), String(p.stock).padStart(4), String(p.minimumStock).padStart(3), ' ', h.status);
}
const completed = sales.filter((s) => s.status === 'completed').length;
console.log('\nVentas completadas:', completed, '· canceladas:', sales.filter((s) => s.status === 'cancelled').length, '· borrador:', sales.filter((s) => s.status === 'draft').length);
console.log('Ventas totales (completadas):', sales.filter((s) => s.status === 'completed').reduce((t, s) => t + s.total, 0).toLocaleString('es-CO'), '\n');
