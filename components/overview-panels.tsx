"use client";

import { memo, type ComponentType } from "react";
import { ArrowDown, ArrowUp, BellRing, CircleCheck, CircleHelp, Clock3, Target, TriangleAlert, Truck, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PanelHeading } from "@/components/ui/panel-heading";
import { scrollToSection, useDashboard } from "@/components/dashboard-context";
import { FleetMonitor } from "@/components/fleet-monitor";
import { DriverLeaders, OperationsMix } from "@/components/operations-cards";
import { num, pct, statusLabels, target, type analyze } from "@/lib/analytics";

type Insight = ReturnType<typeof analyze>;
type RouteResult = Insight["byRoute"][number];

const isBelowTarget = (rate: number | null) => rate !== null && rate < target;
/** Percentage-point gap to target, with a real minus sign: "−0.8" / "+3.5". */
const formatGap = (rate: number) => `${rate - target < 0 ? "−" : "+"}${num(Math.abs(rate - target), 1)}`;

// Chart props hoisted so memoized charts receive the same objects on every render.
const tooltipStyle = { borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 13, boxShadow: "0 8px 24px #0d294214" };
const trendMargin = { left: -14, right: 8, top: 22, bottom: 0 };
// Keeps the first and last points (and their value labels) clear of the axis and the panel edge.
const trendAxisPadding = { left: 28, right: 28 };
const formatPercentTick = (value: number) => `${value}%`;
const formatPointLabel = (value: unknown) => typeof value === "number" ? pct(value) : "";

/* ---------- KPI cards ---------- */

type Kpi = { name: string; value: string; unit?: string; detail: string; icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }> };

function KpiCard({ kpi }: { kpi: Kpi }) {
  return <Card className="kpi">
    <div className="flex items-center justify-between gap-2"><h3>{kpi.name}</h3><span className="kpi-icon"><kpi.icon size={20} aria-hidden /></span></div>
    <div className="kpi-value">{kpi.value}{kpi.unit ? <small> {kpi.unit}</small> : null}</div>
    <p>{kpi.detail}</p>
  </Card>;
}

/** The on-time rate the page is judged by. Its colour follows the result: warm below target, green at or above. */
function OnTimeKpiCard({ rate, onTime, completed }: { rate: number | null; onTime: number; completed: number }) {
  if (rate === null) return <KpiCard kpi={{ name: "อัตราส่งตรงเวลา", value: "–", icon: Target, detail: "ไม่มีเที่ยวที่ส่งถึง" }} />;
  const below = rate < target;
  return <Card className={`kpi ${below ? "kpi-below" : "kpi-met"}`}>
    <div className="flex items-center justify-between gap-2"><h3>อัตราส่งตรงเวลา</h3><span className="kpi-icon warm"><Target size={20} aria-hidden /></span></div>
    <div className="kpi-value">{pct(rate)}
      <span className="kpi-delta">{below ? <ArrowDown size={16} aria-hidden /> : <ArrowUp size={16} aria-hidden />}{formatGap(rate)}<span className="sr-only"> จุดเทียบเป้า</span></span>
    </div>
    <p>{onTime}/{completed} เที่ยวที่ส่งถึง · {below ? "ต่ำกว่า" : "ถึง"}เป้า {target}%</p>
  </Card>;
}

export function KpiSection() {
  const { state: { filters, performance: { summary } }, actions } = useDashboard();
  const others: Kpi[] = [
    { name: "เที่ยวขนส่งทั้งหมด", value: num(summary.total), icon: Truck, detail: `ส่งถึง ${summary.completed} · กำลังขนส่ง ${summary.pending}` },
    { name: "ค่าใช้จ่ายรวม", value: num(summary.cost), unit: "บาท", icon: Wallet, detail: `เฉลี่ย ${num(summary.costPerTrip)} บาท/เที่ยว` },
    { name: "เวลาขนส่งเฉลี่ย", value: num(summary.transit, 1), unit: summary.transit === null ? undefined : "วัน", icon: Clock3, detail: summary.delay === null ? "เฉลี่ยเฉพาะเที่ยวที่ส่งถึง" : `ช้ากว่ากำหนดเฉลี่ย ${num(summary.delay, 1)} วัน` },
  ];
  return <>
    <div className="overview-heading"><h2>ตัวชี้วัดการขนส่ง</h2><button className="text-link" onClick={actions.openMethod}><CircleHelp size={16} aria-hidden /> นิยาม KPI</button></div>
    <div className="kpi-grid">
      <OnTimeKpiCard rate={summary.rate} onTime={summary.onTime} completed={summary.completed} />
      {others.map(kpi => <KpiCard key={kpi.name} kpi={kpi} />)}
    </div>
    {filters.status !== "all" ? <p className="scope-note">KPI และกราฟตรงเวลาใช้ทุกสถานะในเส้นทางและช่วงวันที่ที่เลือก · มุมมองรายการใช้สถานะ «{statusLabels[filters.status]}»</p> : null}
  </>;
}

/* ---------- Attention strip: the one thing to act on ---------- */

function topReason(rows: Insight["rows"], routeId: string) {
  const counts = new Map<string, number>();
  for (const row of rows) if (row.route === routeId && row.reason) counts.set(row.reason, (counts.get(row.reason) ?? 0) + 1);
  return [...counts].toSorted((a, b) => b[1] - a[1])[0] ?? null;
}

export function AttentionStrip() {
  const { state: { filters, performance: { byRoute, rows, summary } }, actions } = useDashboard();
  // Rates per route only compare fairly across all statuses.
  if (!summary.completed) return null;
  const measured = byRoute.filter(route => route.rate !== null);
  const below = measured.filter(route => isBelowTarget(route.rate)).toSorted((a, b) => a.rate! - b.rate!);

  if (!below.length) {
    return <section className="attention attention-ok" aria-label="สถานะเทียบเป้าหมาย">
      <span className="attention-icon"><CircleCheck size={20} aria-hidden /></span>
      <div><p className="attention-title">ทุกเส้นทางส่งตรงเวลาถึงเป้า {target}%</p><p>{measured.length} เส้นทางในตัวกรองนี้</p></div>
    </section>;
  }

  const worst = below[0];
  const reason = topReason(rows, worst.id);
  return <section className="attention" aria-label="เรื่องที่ควรดูก่อน">
    <span className="attention-icon"><TriangleAlert size={20} aria-hidden /></span>
    <div>
      <p className="attention-title"><span className="code">{worst.id}</span> {worst.label} ส่งตรงเวลา {pct(worst.rate)} · ต่ำกว่าเป้า {num(target - worst.rate!, 1)} จุดเปอร์เซ็นต์</p>
      <p>ล่าช้า {worst.late} จาก {worst.completed} เที่ยว{reason ? ` · สาเหตุที่บันทึกบ่อยสุด: ${reason[0]} (${reason[1]} เที่ยว)` : ""}{below.length > 1 ? ` · ต่ำกว่าเป้าอีก ${below.length - 1} เส้นทาง` : ""}</p>
    </div>
    <div className="attention-actions">
      {filters.route !== worst.id ? <Button className="primary" onClick={() => actions.inspectRoute(worst.id)}>ดู {worst.id}</Button> : null}
      <Button className="secondary" onClick={() => scrollToSection("alerts")}><BellRing size={16} aria-hidden /> แจ้งทีมผ่าน LINE</Button>
    </div>
  </section>;
}

/* ---------- Monthly trend ---------- */

/** Y axis starts just below the data (never above target − 10), so differences near the target are visible. */
function trendAxis(months: Insight["months"]) {
  const rates = months.flatMap(month => month.rate === null ? [] : [month.rate]);
  const floor = Math.max(0, Math.min(target - 10, Math.floor((Math.min(...rates) - 5) / 10) * 10));
  const step = 100 - floor > 50 ? 25 : 10;
  const ticks: number[] = [];
  for (let tick = floor; tick <= 100; tick += step) ticks.push(tick);
  return { domain: [floor, 100] as [number, number], ticks };
}

const TrendChart = memo(function TrendChart({ months }: { months: Insight["months"] }) {
  const axis = trendAxis(months);
  return <div className="chart chart-trend" role="img" aria-label={`อัตราส่งตรงเวลารายเดือน เป้าหมาย ${target}%: ${months.map(month => `${month.month} ${pct(month.rate)}`).join(", ")}`}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={months} margin={trendMargin}>
        <defs><linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--chart-fill)", stopOpacity: .28 }} />
          <stop offset="100%" style={{ stopColor: "var(--chart-fill)", stopOpacity: .02 }} />
        </linearGradient></defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 13 }} padding={trendAxisPadding} />
        <YAxis domain={axis.domain} ticks={axis.ticks} tickFormatter={formatPercentTick} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDataOverflow />
        <Tooltip contentStyle={tooltipStyle} formatter={value => [pct(Number(value)), "อัตราตรงเวลา"]} />
        <ReferenceLine y={target} strokeDasharray="4 4" />
        <Area className="trend-area" type="linear" dataKey="rate" strokeWidth={3} fill="url(#trend-fill)" dot={{ r: 4, strokeWidth: 2 }} isAnimationActive={false}>
          <LabelList dataKey="rate" position="top" offset={10} formatter={formatPointLabel} className="trend-label" />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  </div>;
});

export function TrendPanel() {
  const { state: { performance: insight } } = useDashboard();
  return <div className="executive-trend">
    <Card className="panel">
      <PanelHeading title="แนวโน้มรายเดือน" subtitle="คิดตามเดือนที่สั่งและเที่ยวที่ส่งถึงแล้ว" aside={<span className="legend"><i /> เป้าหมาย {target}%</span>} />
      {insight.summary.completed ? <>
        <TrendChart months={insight.months} />
        <dl className="trend-months">{insight.months.map(month => <div key={month.month}>
          <dt>{month.month}</dt>
          <dd>{pct(month.rate)}<small>{month.completed} เที่ยว</small></dd>
        </div>)}</dl>
      </> : <EmptyState>ไม่มีข้อมูลสำหรับแสดงแนวโน้ม</EmptyState>}
    </Card>
  </div>;
}

/* ---------- On-time rate by route: one list of clickable bars ---------- */

function RouteRow({ route, selected, onSelect }: { route: RouteResult; selected: boolean; onSelect: (route: string) => void }) {
  const below = isBelowTarget(route.rate);
  return <li>
    <button type="button" className="route-row" aria-pressed={selected} data-below={below} title={route.label}
      onClick={() => onSelect(selected ? "all" : route.id)}
      aria-label={`${route.id} ${route.label} ส่งตรงเวลา ${pct(route.rate)}${below ? " ต่ำกว่าเป้า" : ""}`}>
      <span className="route-list-id">{route.id}</span>
      <span className="route-track" aria-hidden><span style={{ width: `${route.rate ?? 0}%` }} /><i style={{ left: `${target}%` }} /></span>
      <span className="route-rate" aria-hidden>{below ? <ArrowDown size={16} /> : null}{pct(route.rate)}</span>
    </button>
  </li>;
}

const RouteList = memo(function RouteList({ byRoute, selectedRoute, onSelect }: { byRoute: Insight["byRoute"]; selectedRoute: string; onSelect: (route: string) => void }) {
  return <ul className="route-list">
    {byRoute.map(route => <RouteRow key={route.id} route={route} selected={selectedRoute === route.id} onSelect={onSelect} />)}
  </ul>;
});

export function RoutePerformancePanel() {
  const { state: { filters, performance: insight }, actions } = useDashboard();
  return <Card className="panel route-performance">
    <PanelHeading title="อัตราตรงเวลารายเส้นทาง" subtitle="กดแถวเพื่อกรองเส้นทาง · เส้นประคือเป้า" aside={<span className="legend"><i /> {target}%</span>} />
    {insight.summary.completed ? <RouteList byRoute={insight.byRoute} selectedRoute={filters.route} onSelect={actions.focusRoute} /> : <EmptyState>ไม่มีเที่ยวที่ส่งถึงในตัวกรองนี้</EmptyState>}
  </Card>;
}

/* ---------- Right rail and driver leaders ---------- */

export function DriverLeadersPanel() {
  const { state: { performance: insight }, actions } = useDashboard();
  return <DriverLeaders drivers={insight.leaders} onViewDriver={actions.showDriverTrips} />;
}

export function OperationsRail() {
  const { state: { filters, insight: { rows, summary }, performance: { byRoute } }, actions } = useDashboard();
  const measured = byRoute.filter(route => route.rate !== null);
  return <aside className="executive-rail" aria-label="ภาพรวมปฏิบัติการ">
    <FleetMonitor rows={rows} onViewTrip={actions.openShipment} />
    <OperationsMix statusScope={filters.status === "all" ? "ทุกสถานะ" : statusLabels[filters.status]} summary={summary} belowTarget={measured.filter(route => isBelowTarget(route.rate)).length} measuredRoutes={measured.length} />
  </aside>;
}
