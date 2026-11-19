"use client";

import { ArrowUpRight, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PanelHeading } from "@/components/ui/panel-heading";
import { DriverAvatar } from "@/components/driver-avatar";
import { useDashboard } from "@/components/dashboard-context";
import { num, pct } from "@/lib/analytics";

function FindingPanel() {
  const { state: { insight: { summary, worst, comparison, byReason } }, actions, meta: { activeRoute } } = useDashboard();
  const routeGap = summary.rate !== null && comparison?.rate != null ? summary.rate - comparison.rate : null;
  const headline = activeRoute ? `${activeRoute.id} อยู่ที่ ${pct(summary.rate)}` : worst ? `${worst.id} ต่ำสุดที่ ${pct(worst.rate)}` : "ยังไม่มีอัตราตรงเวลา";
  const basis = activeRoute && summary.completed ? `ตรงเวลา ${summary.onTime} จาก ${summary.completed} เที่ยวที่ส่งถึง`
    : worst ? `ตรงเวลา ${worst.onTime} จาก ${worst.completed} เที่ยวที่ส่งถึง` : "ขยายตัวกรองเพื่อดูเที่ยวที่ส่งถึง";

  return <Card className="panel">
    <PanelHeading level={3} title="สิ่งที่ข้อมูลบอก" subtitle="เทียบผลกับเป้าหมาย และดูฐานคำนวณ" />
    {summary.total ? <div className="finding">
      <span className="kpi-icon warm"><Target size={20} aria-hidden /></span>
      <div>
        <b>{headline}</b>
        <p>{basis}</p>
        {routeGap !== null ? <p>ต่างจากเส้นทางอื่น {routeGap > 0 ? "+" : ""}{num(routeGap, 1)} จุดเปอร์เซ็นต์ ในช่วงและสถานะเดียวกัน</p> : null}
        {!activeRoute && worst ? <Button className="secondary mt-3" onClick={() => actions.focusRoute(worst.id)}>เจาะ {worst.id} <ArrowUpRight size={16} aria-hidden /></Button> : null}
      </div>
    </div> : <EmptyState>ไม่มีเที่ยวขนส่งในตัวกรองนี้</EmptyState>}
    {byReason.length ? <p className="mt-4 text-sm text-muted"><b className="text-ink">ตรวจต่อ</b> · เทียบเวลาออกรถและคิวจุดรับกับบันทึกจริงก่อนสรุปสาเหตุ</p> : null}
  </Card>;
}

function LateReasonsPanel() {
  const { state: { insight: { summary, byReason } } } = useDashboard();
  return <Card className="panel">
    <PanelHeading level={3} title="สาเหตุที่บันทึกเมื่อส่งล่าช้า" subtitle={`${summary.late} เที่ยวล่าช้าในตัวกรองปัจจุบัน`} />
    {byReason.length ? <div className="reason-list">{byReason.map(item => <div key={item.reason}>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm"><span>{item.reason}</span><b>{item.count} เที่ยว</b></div>
      <div className="reason-track"><div style={{ width: `${item.count / summary.late * 100}%` }} /></div>
    </div>)}</div> : <EmptyState>ไม่มีเที่ยวล่าช้าในตัวกรองนี้</EmptyState>}
  </Card>;
}

function LateDriversPanel() {
  const { state: { insight: { drivers } } } = useDashboard();
  return <Card className="panel">
    <PanelHeading level={3} title="คนขับที่ล่าช้าบ่อย" subtitle="สูงสุด 5 คน เรียงตามจำนวนเที่ยวล่าช้า" />
    {drivers.length ? <div className="table-scroll"><table className="data-table compact">
      <thead><tr><th scope="col">รหัสคนขับ</th><th scope="col">ส่งถึง</th><th scope="col">ล่าช้า</th><th scope="col">ตรงเวลา</th></tr></thead>
      <tbody>{drivers.map(driver => <tr key={driver.id}>
        <td><span className="driver-identity"><DriverAvatar driverId={driver.id} /><b>{driver.id}</b></span></td>
        <td>{driver.completed}</td><td>{driver.late}</td><td>{pct(driver.rate)}</td>
      </tr>)}</tbody>
    </table></div> : <EmptyState>ไม่มีรายการคนขับ</EmptyState>}
  </Card>;
}

export function AnalysisSection() {
  const { meta: { scope } } = useDashboard();
  return <section id="analysis" className="section-block" aria-labelledby="analysis-title">
    <PanelHeading id="analysis-title" title="เจาะลึกผลการขนส่ง" subtitle={scope} />
    <div className="analysis-grid"><FindingPanel /><LateReasonsPanel /><LateDriversPanel /></div>
  </section>;
}
