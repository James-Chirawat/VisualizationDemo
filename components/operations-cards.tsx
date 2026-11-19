"use client";

import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { num, pct, target, type metrics } from "@/lib/analytics";

type Metrics = ReturnType<typeof metrics>;
export type DriverResult = Metrics & { id: string };

export function DriverLeaders({ drivers, onViewDriver }: { drivers: DriverResult[]; onViewDriver: (driver: string) => void }) {
  return <Card className="panel leader-card">
    <div className="flex items-start justify-between gap-2"><div><h2>พนักงานปิดเที่ยวสูงสุด</h2><p>เรียงตามจำนวนเที่ยวที่ส่งถึงแล้ว</p></div><span className="kpi-icon warm"><Trophy size={17} /></span></div>
    {drivers.length ? <ol className="leader-list">{drivers.map((driver, index) => <li key={driver.id}>
      <button type="button" onClick={() => onViewDriver(driver.id)} aria-label={`ดูเที่ยวของ ${driver.id}`}>
        <span className="leader-rank">{index + 1}</span>
        <span className="leader-name"><b>{driver.id}</b><small>ตรงเวลา {pct(driver.rate)}</small></span>
        <span className="leader-count"><b>{driver.completed}</b><small>เที่ยว</small></span>
      </button>
    </li>)}</ol> : <p className="leader-empty">ไม่มีเที่ยวที่ส่งถึงในตัวกรองนี้</p>}
  </Card>;
}

export function OperationsMix({ summary, belowTarget, measuredRoutes }: { summary: Metrics; belowTarget: number; measuredRoutes: number }) {
  const on = summary.total ? summary.onTime / summary.total * 100 : 0;
  const throughLate = summary.total ? (summary.onTime + summary.late) / summary.total * 100 : 0;
  const background = summary.total ? `conic-gradient(#368e7e 0 ${on}%, #dc864d ${on}% ${throughLate}%, #7499c2 ${throughLate}% 100%)` : "#e7edf2";
  return <Card className="panel operations-mix">
    <h2>สถานะการขนส่ง</h2><p>สัดส่วนของเที่ยวในตัวกรอง</p>
    <div className="status-ring" style={{ background }}><div><b>{num(summary.total)}</b><small>เที่ยวทั้งหมด</small></div></div>
    <ul>{[{ label: "ตรงเวลา", count: summary.onTime, color: "#368e7e" }, { label: "ล่าช้า", count: summary.late, color: "#dc864d" }, { label: "กำลังขนส่ง", count: summary.pending, color: "#7499c2" }].map(item => <li key={item.label}><span style={{ background: item.color }} />{item.label}<b>{item.count} เที่ยว</b></li>)}</ul>
    <div className="ops-risk"><small>เส้นทางต่ำกว่าเป้า {target}%</small><b>{belowTarget}/{measuredRoutes} เส้นทาง</b></div>
  </Card>;
}
