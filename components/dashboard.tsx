"use client";
import { useMemo, useState, type ReactNode } from "react";
import { Activity, ArrowUpRight, CalendarDays, ChartNoAxesCombined, ChevronDown, CircleHelp, ClipboardList, Clock3, Download, ListFilter, MapPinned, PackageCheck, RotateCcw, Sparkles, Target, Truck, Wallet, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChatPanel } from "@/components/chat-panel";
import { analyze, dateBounds, defaultFilters, num, pct, routes, statusLabels, target, type Filters, type Shipment } from "@/lib/analytics";

const nav = [{ label: "ภาพรวม", id: "overview", icon: ChartNoAxesCombined }, { label: "เจาะลึกข้อมูล", id: "analysis", icon: MapPinned }, { label: "รายการขนส่ง", id: "shipments", icon: ClipboardList }];
const chartTooltip = { borderRadius: 12, borderColor: "#dde5eb", fontSize: 13, boxShadow: "0 8px 24px #0d294214" };
const pageSize = 10;

function Heading({ title, subtitle, aside }: { title: string; subtitle?: string; aside?: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold tracking-tight">{title}</h2>{subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}</div>{aside}</div>;
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="grid min-h-44 place-content-center rounded-xl border border-dashed border-line bg-slate-50 px-5 text-center text-sm text-muted">{children}</div>;
}

function StatusBadge({ row }: { row: Shipment }) { return <span className={`status ${row.status}`}>{statusLabels[row.status]}</span>; }

function downloadCsv(rows: Shipment[]) {
  const header = ["shipment_id", "route_code", "driver_id", "order_date", "promised_date", "delivery_date", "status", "freight_cost", "transit_days", "delay_days", "reported_reason"];
  const body = rows.map(row => [row.id, row.route, row.driver, row.orderDate, row.promisedDate, row.deliveredDate, statusLabels[row.status], row.cost, row.transitDays, row.delayDays, row.reason]);
  const content = [header, ...body].map(row => row.map(value => '"' + String(value ?? "").replaceAll('"', '""') + '"').join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = "routelens-shipments.csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Dashboard({ qwenReady }: { qwenReady: boolean }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [chatOpen, setChatOpen] = useState(false);
  const [active, setActive] = useState("overview");
  const [currentPage, setCurrentPage] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"latest" | "delay" | "cost">("latest");
  const [detail, setDetail] = useState<Shipment | null>(null);
  const [method, setMethod] = useState(false);
  const insight = useMemo(() => analyze(filters), [filters]);
  const { summary, byRoute, byReason, drivers, months, worst, comparison } = insight;
  const visibleRows = useMemo(() => insight.rows.filter(row => {
    const term = search.trim().toLowerCase();
    return !term || [row.id, row.route, row.driver, routes.find(route => route.id === row.route)?.label].some(value => value?.toLowerCase().includes(term));
  }).sort((a, b) => sort === "cost" ? b.cost - a.cost : sort === "delay" ? b.delayDays - a.delayDays : b.orderDate.localeCompare(a.orderDate)), [insight.rows, search, sort]);
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const page = Math.min(currentPage, pageCount - 1);
  const activeRoute = routes.find(route => route.id === filters.route);
  const routeGap = summary.rate !== null && comparison?.rate != null ? summary.rate - comparison.rate : null;
  const scope = activeRoute ? `${activeRoute.id} · ${activeRoute.label}` : "ทุกเส้นทาง";
  function change<K extends keyof Filters>(key: K, value: Filters[K]) { setFilters(current => ({ ...current, [key]: value })); setCurrentPage(0); }
  function go(id: string) { setActive(id); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }
  const kpis = [
    { name: "อัตราส่งตรงเวลา", value: pct(summary.rate), detail: summary.completed ? `${summary.onTime}/${summary.completed} เที่ยวที่ส่งถึง · เป้า ${target}%` : "ไม่มีเที่ยวที่ส่งถึง", icon: Target, warm: true },
    { name: "เที่ยวขนส่งทั้งหมด", value: num(summary.total), detail: `ส่งถึง ${summary.completed} · กำลังขนส่ง ${summary.pending}`, icon: Truck },
    { name: "ค่าใช้จ่ายรวม", value: num(summary.cost), detail: `เฉลี่ย ${num(summary.costPerTrip)} บาท/เที่ยว`, icon: Wallet },
    { name: "เวลาขนส่งเฉลี่ย", value: num(summary.transit, 2), detail: summary.delay === null ? "เฉลี่ยเฉพาะเที่ยวที่ส่งถึง" : `ช้ากว่ากำหนดเฉลี่ย ${num(summary.delay, 1)} วัน`, icon: Clock3 },
  ];

  return <div className="app-shell">
    <aside className="side">
      <a href="#overview" className="brand" onClick={() => setActive("overview")}><span className="brand-mark"><Truck size={22} /></span><span><b>RouteLens</b><small>LOGISTICS INTELLIGENCE</small></span></a>
      <div className="side-menu">{nav.map(item => <button key={item.id} className={active === item.id ? "selected" : ""} onClick={() => go(item.id)}><item.icon size={18} /> {item.label}</button>)}</div>
      <div className="side-bottom"><button className="side-help" onClick={() => setMethod(true)}><CircleHelp size={17} /> วิธีอ่านตัวเลข</button><div className="side-foot"><span>DATA VISUALIZATION</span><p>สาธิตการสอบสอน</p></div></div>
    </aside>
    <div className="min-w-0">
      <header className="topbar"><div className="flex min-w-0 items-center gap-2.5"><span className="mobile-brand"><Truck size={18} /></span><span className="hidden items-center gap-2 text-sm text-muted sm:flex"><Activity size={16} /> ศูนย์วิเคราะห์ข้อมูล <span className="text-slate-300">/</span></span><b className="text-sm">ติดตามการขนส่ง</b></div><Button className="ai-button" onClick={() => setChatOpen(true)}><Sparkles size={16} /> AI Analyst</Button></header>
      <main id="overview" className="main">
        <div className="intro">
          <div><span className="tag"><span /> ข้อมูลจำลอง · ไตรมาส 1 / 2569</span><h1>ภาพรวมการขนส่ง</h1><p>ติดตามความตรงเวลา ค่าใช้จ่าย และจุดที่ควรตรวจต่อในแต่ละเส้นทาง</p></div>
          <Button className="secondary" onClick={() => downloadCsv(insight.rows)} disabled={!summary.total}><Download size={16} /> ส่งออก CSV</Button>
        </div>
        <Card className="filters">
          <div className="flex items-center gap-2 text-sm font-bold"><ListFilter size={17} /> ตัวกรอง</div>
          <label className="field"><span>เส้นทาง</span><span className="select"><select value={filters.route} onChange={event => change("route", event.target.value)}><option value="all">ทุกเส้นทาง</option>{routes.map(route => <option key={route.id} value={route.id}>{route.id} · {route.label}</option>)}</select><ChevronDown size={15} /></span></label>
          <label className="field"><span>สถานะ</span><span className="select"><select value={filters.status} onChange={event => change("status", event.target.value as Filters["status"])}><option value="all">ทุกสถานะ</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><ChevronDown size={15} /></span></label>
          <label className="field"><span>วันที่สั่งเริ่มต้น</span><input type="date" min={dateBounds.from} max={filters.to} value={filters.from} onChange={event => { if (event.target.value >= dateBounds.from && event.target.value <= filters.to) change("from", event.target.value); }} /></label>
          <label className="field"><span>วันที่สั่งสิ้นสุด</span><input type="date" min={filters.from} max={dateBounds.to} value={filters.to} onChange={event => { if (event.target.value >= filters.from && event.target.value <= dateBounds.to) change("to", event.target.value); }} /></label>
          <Button className="secondary reset" onClick={() => { setFilters(defaultFilters); setCurrentPage(0); setSearch(""); setSort("latest"); }}><RotateCcw size={15} /> รีเซ็ต</Button>
        </Card>
        <div className="kpi-grid">{kpis.map(kpi => <Card key={kpi.name} className="kpi"><div className="flex items-center justify-between gap-2"><h2>{kpi.name}</h2><span className={`kpi-icon ${kpi.warm ? "warm" : ""}`}><kpi.icon size={17} /></span></div><div className="kpi-value">{kpi.value}<small>{kpi.name === "ค่าใช้จ่ายรวม" ? " บาท" : kpi.name === "เวลาขนส่งเฉลี่ย" && summary.transit !== null ? " วัน" : ""}</small></div><p>{kpi.detail}</p></Card>)}</div>
        {filters.status !== "all" && <p className="scope-note">กำลังดูเฉพาะสถานะ «{statusLabels[filters.status]}» อัตราตรงเวลาใช้เฉพาะเที่ยวที่เหลือในตัวกรองนี้</p>}
        <div className="chart-grid">
          <Card className="panel"><Heading title="อัตราตรงเวลารายเส้นทาง" subtitle="คลิกแท่งกราฟหรือปุ่มเส้นทางเพื่อกรอง" aside={<span className="legend"><i /> เป้าหมาย 80%</span>} />
            {summary.completed ? <><div className="chart chart-routes" aria-label="กราฟเปรียบเทียบอัตราตรงเวลารายเส้นทาง"><ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={byRoute} margin={{ top: 6, right: 12, left: 4, bottom: 0 }} barSize={19}>
                <CartesianGrid horizontal={false} stroke="#e8eef2" /><XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={value => `${value}%`} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#52647a" }} />
                <YAxis type="category" dataKey="id" width={45} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#344b61" }} />
                <Tooltip contentStyle={chartTooltip} labelFormatter={label => routes.find(route => route.id === label)?.label ?? label} formatter={(value) => [pct(Number(value)), "อัตราตรงเวลา"]} />
                <ReferenceLine x={target} stroke="#b26627" strokeDasharray="4 4" />
                <Bar dataKey="rate" radius={[0, 5, 5, 0]} isAnimationActive={false} onClick={(data) => { if (data.payload?.id) change("route", data.payload.id); }} className="cursor-pointer">{byRoute.map(route => <Cell key={route.id} fill={route.rate !== null && route.rate < target ? "#d77b3d" : "#2c729b"} />)}</Bar>
              </BarChart>
            </ResponsiveContainer></div><div className="route-buttons">{byRoute.map(route => <Button key={route.id} className={`route-chip ${filters.route === route.id ? "route-selected" : ""}`} onClick={() => change("route", filters.route === route.id ? "all" : route.id)} aria-pressed={filters.route === route.id}>{route.id} <b>{pct(route.rate)}</b></Button>)}</div></> : <Empty>ไม่มีเที่ยวที่ส่งถึงในตัวกรองนี้</Empty>}
          </Card>
          <Card className="panel"><Heading title="แนวโน้มรายเดือน" subtitle="คิดตามเดือนที่สั่งและเที่ยวที่ส่งถึงแล้ว" />
            {summary.completed ? <div className="chart chart-trend" aria-label="แนวโน้มอัตราส่งตรงเวลารายเดือน"><ResponsiveContainer width="100%" height="100%"><AreaChart data={months} margin={{ left: -9, right: 12, top: 12, bottom: 3 }}>
              <defs><linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#479bd0" stopOpacity=".30" /><stop offset="100%" stopColor="#479bd0" stopOpacity=".02" /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#e8eef2" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#52647a" }} /><YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#52647a" }} /><Tooltip contentStyle={chartTooltip} formatter={value => [pct(Number(value)), "อัตราตรงเวลา"]} /><ReferenceLine y={target} stroke="#b26627" strokeDasharray="4 4" /><Area type="linear" dataKey="rate" stroke="#2377a7" strokeWidth={3} fill="url(#trend-fill)" dot={{ r: 4, fill: "#2377a7" }} isAnimationActive={false} />
            </AreaChart></ResponsiveContainer></div> : <Empty>ไม่มีข้อมูลสำหรับแสดงแนวโน้ม</Empty>}
          </Card>
        </div>
        <section id="analysis" className="section-block">
          <Heading title="เจาะลึกผลการขนส่ง" subtitle={scope} aside={<Button className="ai-button" onClick={() => setChatOpen(true)}><Sparkles size={16} /> ถาม AI เกี่ยวกับข้อมูลนี้</Button>} />
          <div className="analysis-grid">
            <Card className="panel"><Heading title="สิ่งที่ข้อมูลบอก" subtitle="เทียบผลกับเป้าหมาย และดูฐานคำนวณ" />
              {summary.total ? <div className="finding"><span className="kpi-icon warm"><Target size={18} /></span><div>
                <b>{activeRoute ? `${activeRoute.id} อยู่ที่ ${pct(summary.rate)}` : worst ? `${worst.id} ต่ำสุดที่ ${pct(worst.rate)}` : "ยังไม่มีอัตราตรงเวลา"}</b>
                <p>{activeRoute && summary.completed ? `ตรงเวลา ${summary.onTime} จาก ${summary.completed} เที่ยวที่ส่งถึง` : worst ? `ตรงเวลา ${worst.onTime} จาก ${worst.completed} เที่ยวที่ส่งถึง` : "ขยายตัวกรองเพื่อดูเที่ยวที่ส่งถึง"}</p>
                {routeGap !== null && <p>ต่างจากเส้นทางอื่น {routeGap > 0 ? "+" : ""}{num(routeGap, 1)} จุดเปอร์เซ็นต์ ในช่วงและสถานะเดียวกัน</p>}
                {!activeRoute && worst && <Button className="mt-3 bg-white text-[#174a69] shadow-sm" onClick={() => change("route", worst.id)}>เจาะ {worst.id} <ArrowUpRight size={14} /></Button>}
              </div></div> : <Empty>ไม่มีเที่ยวขนส่งในตัวกรองนี้</Empty>}
              {byReason[0] && <p className="mt-4 text-sm text-muted"><b className="text-ink">ตรวจต่อ</b> · เทียบเวลาออกรถและคิวจุดรับกับบันทึกจริงก่อนสรุปสาเหตุ</p>}
            </Card>
            <Card className="panel"><Heading title="สาเหตุที่บันทึกเมื่อส่งล่าช้า" subtitle={`${summary.late} เที่ยวล่าช้าในตัวกรองปัจจุบัน`} />
              {byReason.length ? <div className="reason-list">{byReason.map(item => <div key={item.reason}><div className="mb-1 flex items-center justify-between gap-2 text-sm"><span>{item.reason}</span><b>{item.count} เที่ยว</b></div><div className="reason-track"><div style={{ width: `${item.count / summary.late * 100}%` }} /></div></div>)}</div> : <Empty>ไม่มีเที่ยวล่าช้าในตัวกรองนี้</Empty>}
            </Card>
            <Card className="panel"><Heading title="เปรียบเทียบรายคนขับ" subtitle="สูงสุด 5 คน เรียงตามจำนวนเที่ยวล่าช้า" />
              {drivers.length ? <div className="overflow-x-auto"><table className="data-table compact"><thead><tr><th>รหัสคนขับ</th><th>ส่งถึง</th><th>ล่าช้า</th><th>ตรงเวลา</th></tr></thead><tbody>{drivers.map(driver => <tr key={driver.id}><td><b>{driver.id}</b></td><td>{driver.completed}</td><td>{driver.late}</td><td>{pct(driver.rate)}</td></tr>)}</tbody></table></div> : <Empty>ไม่มีรายการคนขับ</Empty>}
            </Card>
          </div>
        </section>
        <Card id="shipments" className="panel section-block">
          <Heading title="รายการขนส่ง" subtitle={`พบ ${visibleRows.length} จาก ${summary.total} เที่ยวในตัวกรอง · กดรหัสรายการเพื่อเปิดรายละเอียด`} />
          <div className="mb-3 flex flex-wrap items-center gap-2"><input className="table-input" type="search" placeholder="ค้นหารหัสเที่ยว เส้นทาง หรือคนขับ" aria-label="ค้นหารายการขนส่ง" value={search} onChange={event => { setSearch(event.target.value); setCurrentPage(0); }} /><span className="select"><select aria-label="เรียงรายการ" value={sort} onChange={event => { setSort(event.target.value as typeof sort); setCurrentPage(0); }}><option value="latest">วันที่สั่งล่าสุด</option><option value="delay">ล่าช้ามากที่สุด</option><option value="cost">ค่าใช้จ่ายสูงสุด</option></select><ChevronDown size={15} /></span></div>
          {visibleRows.length ? <><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>รหัสเที่ยว</th><th>เส้นทาง</th><th>คนขับ</th><th>วันที่สั่ง</th><th>ส่งถึง</th><th>สถานะ</th><th className="text-right">ค่าใช้จ่าย (บาท)</th></tr></thead><tbody>
            {visibleRows.slice(page * pageSize, (page + 1) * pageSize).map(row => <tr key={row.id}><td><button className="text-link" onClick={() => setDetail(row)}>{row.id}</button></td><td>{row.route}</td><td>{row.driver}</td><td>{row.orderDate}</td><td>{row.deliveredDate ?? "–"}</td><td><StatusBadge row={row} /></td><td className="text-right tabular-nums">{num(row.cost)}</td></tr>)}
          </tbody></table></div><div className="mt-4 flex items-center justify-between gap-2 text-sm"><span className="text-muted">หน้า {page + 1} จาก {pageCount}</span><div className="flex gap-2"><Button className="secondary" disabled={page === 0} onClick={() => setCurrentPage(page - 1)}>ก่อนหน้า</Button><Button className="secondary" disabled={page + 1 === pageCount} onClick={() => setCurrentPage(page + 1)}>ถัดไป</Button></div></div></> : <Empty>ไม่พบรายการ ลองปรับตัวกรองหรือคำค้น</Empty>}
        </Card>
        <footer className="footer"><span>RouteLens · ชุดข้อมูลจำลองเพื่อการสอน</span><button className="text-link" onClick={() => setMethod(true)}>ดูนิยาม KPI</button></footer>
      </main>
    </div>
    <ChatPanel filters={filters} qwenReady={qwenReady} open={chatOpen} setOpen={setChatOpen} />
    <Dialog.Root open={Boolean(detail) || method} onOpenChange={open => { if (!open) { setDetail(null); setMethod(false); } }}>
      <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-[#0c1b2a]/45" /><Dialog.Content className="detail-dialog"><div className="mb-4 flex items-center justify-between gap-3"><span className="kpi-icon">{detail ? <PackageCheck size={22} /> : <CircleHelp size={22} />}</span><Dialog.Close asChild><Button className="icon-button" aria-label="ปิดรายละเอียด"><X size={20} /></Button></Dialog.Close></div>
        <Dialog.Title className="text-xl font-bold">{detail?.id ?? "นิยามและฐานคำนวณ"}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted">{detail ? `${detail.route} · ${routes.find(route => route.id === detail.route)?.label}` : "ทุก KPI ใช้ข้อมูลจำลองตามตัวกรองในหน้า Dashboard"}</Dialog.Description>
        {detail ? <><div className="mt-4"><StatusBadge row={detail} /></div><dl className="detail-grid">{[["วันที่สั่ง", detail.orderDate], ["กำหนดส่ง", detail.promisedDate], ["ส่งถึงจริง", detail.deliveredDate ?? "ยังไม่ถึง"], ["คนขับ", detail.driver], ["รถ", detail.vehicle], ["ระยะทาง", `${detail.distance} กม.`], ["ค่าใช้จ่าย", `${num(detail.cost)} บาท`], ["วันขนส่ง", detail.transitDays == null ? "–" : `${detail.transitDays} วัน`], ["วันล่าช้า", detail.status === "in_transit" ? "–" : `${detail.delayDays} วัน`], ["สาเหตุที่บันทึก", detail.reason ?? "–"]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></> :
          <ul className="method-list"><li><b>ส่งตรงเวลา</b> · เที่ยวที่ส่งถึงไม่เกินกำหนด ÷ เที่ยวที่ส่งถึงแล้ว × 100</li><li><b>ค่าใช้จ่ายต่อเที่ยว</b> · ค่าใช้จ่ายรวม ÷ เที่ยวทั้งหมดที่ผ่านตัวกรอง</li><li><b>เวลาขนส่งเฉลี่ย</b> · วันส่งถึงลบวันสั่ง เฉลี่ยเฉพาะเที่ยวที่ส่งถึง</li><li><b>วันล่าช้าเฉลี่ย</b> · วันส่งถึงลบวันกำหนด เฉลี่ยเฉพาะเที่ยวที่ล่าช้า</li><li><b>ช่วงวันที่</b> · ใช้วันที่สั่งซื้อ และรวมวันเริ่มต้นกับวันสิ้นสุด</li></ul>}
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
  </div>;
}
