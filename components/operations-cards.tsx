"use client";

import { memo } from "react";
import { Trophy } from "lucide-react";
import { DriverAvatar } from "@/components/driver-avatar";
import { Card } from "@/components/ui/card";
import { num, pct, target, type metrics } from "@/lib/analytics";

type Metrics = ReturnType<typeof metrics>;
export type DriverResult = Metrics & { id: string };

export const DriverLeaders = memo(function DriverLeaders({ drivers, onViewDriver }: { drivers: DriverResult[]; onViewDriver: (driver: string) => void }) {
  return <Card className="panel leader-card">
    <div className="flex items-start justify-between gap-2"><div><h2>คนขับที่ส่งถึงมากที่สุด</h2><p>เรียงตามเที่ยวที่ส่งถึง ถ้าเท่ากันดูจำนวนที่ตรงเวลา</p></div><span className="kpi-icon warm"><Trophy size={20} /></span></div>
    {drivers.length ? <ol className="leader-list">{drivers.map((driver, index) => <li key={driver.id}>
      <button type="button" onClick={() => onViewDriver(driver.id)} aria-label={`ดูเที่ยวของ ${driver.id}`}>
        <span className="leader-rank">{index + 1}</span>
        <span className="driver-identity"><DriverAvatar driverId={driver.id} /><span className="leader-name"><b>{driver.id}</b><small>ตรงเวลา {pct(driver.rate)}</small></span></span>
        <span className="leader-count"><b>{driver.completed}</b><small>เที่ยว</small></span>
      </button>
    </li>)}</ol> : <p className="leader-empty">ไม่มีเที่ยวที่ส่งถึงในตัวกรองนี้</p>}
  </Card>;
});

export const OperationsMix = memo(function OperationsMix({ summary, belowTarget, measuredRoutes }: { summary: Metrics; belowTarget: number; measuredRoutes: number }) {
  const on = summary.total ? summary.onTime / summary.total * 100 : 0;
  const throughLate = summary.total ? (summary.onTime + summary.late) / summary.total * 100 : 0;
  const background = summary.total ? `conic-gradient(var(--status-on-time) 0 ${on}%, var(--status-late) ${on}% ${throughLate}%, var(--status-transit) ${throughLate}% 100%)` : "var(--line-soft)";
  return <Card className="panel operations-mix">
    <h2>สถานะการขนส่ง</h2><p>สัดส่วนของ {num(summary.total)} เที่ยวในตัวกรอง</p>
    <div className="status-ring" style={{ background }} aria-hidden><div><b>{num(summary.total)}</b><small>เที่ยว</small></div></div>
    <ul>{[{ label: "ตรงเวลา", count: summary.onTime, color: "var(--status-on-time)" }, { label: "ล่าช้า", count: summary.late, color: "var(--status-late)" }, { label: "กำลังขนส่ง", count: summary.pending, color: "var(--status-transit)" }].map(item => <li key={item.label}><span style={{ background: item.color }} />{item.label}<b>{item.count} เที่ยว</b></li>)}</ul>
    <div className="ops-risk"><small>เส้นทางต่ำกว่าเป้า {target}%</small><b>{belowTarget}/{measuredRoutes} เส้นทาง</b></div>
  </Card>;
});
