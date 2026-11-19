export const target = 80;
export const dateBounds = { from: "2026-01-01", to: "2026-03-31" };
export const statusLabels = { on_time: "ตรงเวลา", late: "ล่าช้า", in_transit: "กำลังขนส่ง" } as const;
export type Status = keyof typeof statusLabels;

export const routes = [
  { id: "R-01", label: "กรุงเทพฯ – พิษณุโลก", done: 24, on: 20, pending: 1, km: 385 },
  { id: "R-02", label: "พิษณุโลก – เชียงใหม่", done: 20, on: 11, pending: 1, km: 340 },
  { id: "R-03", label: "กรุงเทพฯ – นครสวรรค์", done: 26, on: 22, pending: 1, km: 240 },
  { id: "R-04", label: "พิษณุโลก – สุโขทัย", done: 24, on: 19, pending: 1, km: 65 },
  { id: "R-05", label: "พิษณุโลก – ตาก", done: 26, on: 19, pending: 1, km: 150 },
  { id: "R-06", label: "ขอนแก่น – พิษณุโลก", done: 24, on: 23, pending: 1, km: 320 },
] as const;
export type Route = (typeof routes)[number];
export const routeById = new Map<string, Route>(routes.map(route => [route.id, route]));
export const reasons =["รอคิวจุดรับสินค้า", "ออกจากคลังช้า", "จราจรติดขัด", "พักรถนอกแผน"] as const;

export type Filters = { route: string; status: "all" | Status; from: string; to: string };
export const defaultFilters: Filters = { route: "all", status: "all", ...dateBounds };
export type Shipment = {
  id: string; route: string; driver: string; orderDate: string; promisedDate: string;
  deliveredDate: string | null; status: Status; cost: number; transitDays: number | null;
  delayDays: number; reason: string | null; distance: number; vehicle: string;
};

function date(offset: number) {
  return new Date(Date.UTC(2026, 0, 1 + offset)).toISOString().slice(0, 10);
}

function makeShipments(): Shipment[] {
  const rows: Shipment[] = [];
  for (const [routeIndex, route] of routes.entries()) {
    for (let i = 0; i < route.done + route.pending; i++) {
      const pending = i >= route.done;
      // Interleave outcomes and dates so week filters have meaningful variation.
      const rank = (i * (route.done === 20 ? 3 : route.done === 26 ? 7 : 5)) % route.done;
      const late = !pending && rank >= route.on;
      const day = pending ? 87 : (i * 11 + routeIndex * 7) % 81;
      const base = 2 + (i % 3 === 0 ? 1 : 0);
      const delay = late ? (route.id === "R-02" ? (rank - route.on < 2 ? 2 : 3) : 1 + (i % 3)) : 0;
      rows.push({
        id: `SHP-26-${String(rows.length + 1).padStart(4, "0")}`, route: route.id,
        driver: `DRV-${String(1 + (i * 5 + routeIndex * 3) % 18).padStart(3, "0")}`,
        orderDate: date(day), promisedDate: date(day + base),
        deliveredDate: pending ? null : date(day + base + delay),
        status: pending ? "in_transit" : late ? "late" : "on_time",
        cost: 2500 + (i * 137 + routeIndex * 453) % 2900,
        transitDays: pending ? null : base + delay, delayDays: delay,
        reason: late ? reasons[route.id === "R-02" ? (rank - route.on < 5 ? 0 : (rank - route.on) % 4) : (i + routeIndex) % 4] : null,
        distance: route.km, vehicle: i % 3 ? "รถ 4 ล้อ" : "รถ 10 ล้อ",
      });
    }
  }
  const costDelta = 590751 - rows.reduce((total, row) => total + row.cost, 0);
  const adjustment = Math.trunc(costDelta / rows.length);
  const completed = rows.filter(row => row.transitDays !== null);
  let transitDelta = 455 - completed.reduce((total, row) => total + row.transitDays!, 0);
  completed.forEach(row => {
    if (!transitDelta || row.status === "late") return;
    const step = Math.sign(transitDelta);
    row.transitDays! += step;
    row.deliveredDate = date(Math.round((Date.parse(row.orderDate) - Date.UTC(2026, 0, 1)) / 86400000) + row.transitDays!);
    if (step > 0 && row.deliveredDate > row.promisedDate) row.promisedDate = row.deliveredDate;
    transitDelta -= step;
  });
  rows.forEach((row, i) => { row.cost += adjustment + (i === 0 ? costDelta - adjustment * rows.length : 0); });
  return rows;
}

export const shipments = makeShipments();
export const nf = new Intl.NumberFormat("en-US");
export const pct = (n: number | null) => n === null ? "–" : `${n.toFixed(1)}%`;
export const num = (n: number | null, decimals = 0) => n === null ? "–" : nf.format(Number(n.toFixed(decimals)));

// One Thai date style everywhere on screen (Buddhist year, like the "ไตรมาส 1 / 2569" tag). CSV export keeps ISO dates.
const fullDate = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
export const formatDate = (iso: string | null) => iso ? fullDate.format(new Date(iso)) : "–";
export const formatShortDate = (iso: string | null) => iso ? shortDate.format(new Date(iso)) : "–";
export const formatRange = (from: string, to: string) => `${formatDate(from)} – ${formatDate(to)}`;

export function filterRows(filters: Filters) {
  return shipments.filter(row =>
    (filters.route === "all" || filters.route === row.route) &&
    (filters.status === "all" || filters.status === row.status) &&
    row.orderDate >= filters.from && row.orderDate <= filters.to,
  );
}

export function metrics(rows: Shipment[]) {
  const onTime = rows.filter(row => row.status === "on_time").length;
  const lateRows = rows.filter(row => row.status === "late");
  const completed = onTime + lateRows.length;
  const cost = rows.reduce((total, row) => total + row.cost, 0);
  return {
    total: rows.length, completed, onTime, late: lateRows.length, pending: rows.length - completed,
    rate: completed ? onTime / completed * 100 : null,
    cost, costPerTrip: rows.length ? cost / rows.length : null,
    transit: completed ? rows.reduce((total, row) => total + (row.transitDays ?? 0), 0) / completed : null,
    delay: lateRows.length ? lateRows.reduce((total, row) => total + row.delayDays, 0) / lateRows.length : null,
  };
}

export function analyze(filters: Filters) {
  const rows = filterRows(filters);
  const summary = metrics(rows);
  const byRoute = routes.filter(route => filters.route === "all" || route.id === filters.route)
    .map(route => ({ id: route.id, label: route.label, ...metrics(rows.filter(row => row.route === route.id)) }));
  const byReason = reasons.map(reason => ({ reason, count: rows.filter(row => row.reason === reason).length }))
    .filter(item => item.count).sort((a, b) => b.count - a.count);
  const allDrivers = [...new Set(rows.map(row => row.driver))].map(id => ({
    id, ...metrics(rows.filter(row => row.driver === id)),
  }));
  const drivers = allDrivers.toSorted((a, b) => b.late - a.late || b.total - a.total).slice(0, 5);
  const leaders = allDrivers.filter(driver => driver.completed > 0)
    .sort((a, b) => b.completed - a.completed || b.onTime - a.onTime || a.id.localeCompare(b.id)).slice(0, 5);
  const months = ["ม.ค.", "ก.พ.", "มี.ค."].map((month, i) => ({
    month, ...metrics(rows.filter(row => row.orderDate.startsWith(`2026-0${i + 1}`))),
  }));
  const worst = byRoute.filter(route => route.rate !== null).sort((a, b) => a.rate! - b.rate!)[0] ?? null;
  const comparison = filters.route === "all" ? null : metrics(filterRows({ ...filters, route: "all" }).filter(row => row.route !== filters.route));
  return { rows, summary, byRoute, byReason, drivers, leaders, months, worst, comparison };
}

export function readFilters(value: unknown): Filters | null {
  if (typeof value !== "object" || !value) return null;
  const { route, status, from, to } = value as Partial<Filters>;
  if ((route !== "all" && !routeById.has(route ?? "")) ||
      (status !== "all" && !Object.keys(statusLabels).includes(status ?? "")) ||
      typeof from !== "string" || typeof to !== "string" ||
      !validDate(from) || !validDate(to) || from > to) return null;
  return { route: route!, status: status!, from, to };
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < dateBounds.from || value > dateBounds.to) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}
