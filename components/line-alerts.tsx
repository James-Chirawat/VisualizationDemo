"use client";

import { useState } from "react";
import Image from "next/image";
import { BellRing, CheckCircle2, MapPin, Route, Send, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { analyze, num, pct, routes, target, type Filters, type Shipment } from "@/lib/analytics";

export function LineLogo({ size = 44 }: { size?: number }) {
  return <Image className="line-brand" src="/line-brand.png" width={size} height={size} alt="" unoptimized />;
}

const dateFormat = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
const displayDate = (date: string) => dateFormat.format(new Date(date));

function ShipmentTimeline({ shipment }: { shipment: Shipment }) {
  const events = [
    { date: shipment.orderDate, label: "รับรายการขนส่ง", detail: "บันทึกคำสั่งขนส่ง" },
    { date: shipment.promisedDate, label: "กำหนดส่ง", detail: "วันที่ตกลงส่งถึงปลายทาง" },
    { date: shipment.deliveredDate, label: "ส่งถึงปลายทาง", detail: shipment.delayDays ? `ช้ากว่ากำหนด ${shipment.delayDays} วัน` : "ถึงภายในกำหนด" },
  ];
  return <>
    <div className="route-trip-heading"><span>ไทม์ไลน์เที่ยวตัวอย่าง</span><b>{shipment.id}</b></div>
    <ol className="route-timeline">{events.map((event, index) => <li key={event.label}>
      <time dateTime={event.date ?? undefined}>{event.date ? displayDate(event.date) : "–"}</time>
      <span className="route-timeline-dot" data-last={index === events.length - 1} aria-hidden />
      <div><b>{event.label}</b><p>{event.detail}</p></div>
    </li>)}</ol>
    <div className="route-driver"><Truck size={16} /><div><b>{shipment.driver}</b><span>{shipment.vehicle} · {num(shipment.distance)} กม.</span></div></div>
  </>;
}

export function LineAlerts({ filters, onViewRoute }: { filters: Filters; onViewRoute: (route: string) => void }) {
  const { worst, rows } = analyze({ ...filters, status: "all" });
  const route = routes.find(item => item.id === worst?.id);
  const [origin, destination] = route?.label.split(" – ") ?? [];
  const completedTrips = rows.filter(row => row.route === worst?.id && row.deliveredDate);
  const example = completedTrips.find(row => row.status === "late") ?? completedTrips[0];
  const [lastPreview, setLastPreview] = useState<{ key: string; time: string } | null>(null);
  const belowTarget = worst?.rate != null && worst.rate < target;
  const previewKey = `${filters.from}|${filters.to}|${worst?.id ?? ""}`;
  const sent = lastPreview?.key === previewKey;

  return (
    <section id="alerts" className="section-block" aria-labelledby="alerts-title">
      <div className="section-heading">
        <div><h2 id="alerts-title">แจ้งเตือนผ่าน LINE OA</h2><p>แจ้งทีมคลังเมื่ออัตราส่งตรงเวลารายเส้นทางต่ำกว่า {target}%</p></div>
        <span className="connection-pill"><ShieldCheck size={15} /> เชื่อมต่อแล้ว · จำลอง</span>
      </div>
      <div className="alert-grid">
        <Card className="panel alert-settings">
          <div className="flex items-center gap-3"><LineLogo /><div><h3>RouteLens Logistics</h3><p>LINE Official Account · บัญชีสาธิต</p></div></div>
          <dl className="alert-rules">
            <div><dt>เงื่อนไข</dt><dd>อัตราตรงเวลา &lt; {target}%</dd></div>
            <div><dt>ผู้รับ</dt><dd>ทีมควบคุมการขนส่ง</dd></div>
            <div><dt>ขอบเขต</dt><dd>{filters.route === "all" ? "เส้นทางต่ำสุด" : filters.route} · ทุกสถานะ</dd></div>
            <div><dt>ช่วงวันที่สั่ง</dt><dd>{filters.from} ถึง {filters.to}</dd></div>
          </dl>
          <Button className="line-action" disabled={!belowTarget} onClick={() => setLastPreview({ key: previewKey, time: new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date()) })}>
            <Send size={16} /> จำลองส่งแจ้งเตือน
          </Button>
          <p className="alert-feedback" role="status">{sent ? <><CheckCircle2 size={15} /> ส่งแจ้งเตือนจำลองแล้ว เวลา {lastPreview.time} น.</> : "การส่งจำลองจะแสดงในตัวอย่างข้อความบนหน้านี้"}</p>
        </Card>
        <Card className="panel alert-preview">
          <div className="alert-preview-heading"><div><h3>ตัวอย่าง Flex Message</h3><p>มุมมองของผู้รับแจ้งเตือน</p></div><span className={sent ? "connection-pill" : "preview-label"}>{sent ? "ส่งแล้ว · จำลอง" : "ตัวอย่าง"}</span></div>
          <div className="message-stage">
            {worst && belowTarget ? <div className="flex-example route-message">
              <div className="route-message-header">
                <div className="route-message-top"><Route size={17} /><b>{worst.id}</b><span>แจ้งเตือนเส้นทาง</span></div>
                <div className="route-message-stops">
                  <div><span>ต้นทาง</span><strong>{origin}</strong></div>
                  <div><span>ปลายทาง</span><strong><MapPin size={17} aria-hidden />{destination}</strong></div>
                </div>
              </div>
              <div className="route-message-body">
                <div className="route-message-metrics"><div><b>{pct(worst.rate)}</b><span>ส่งตรงเวลา · เป้า {target}%</span></div><div><b>{worst.late}/{worst.completed}</b><span>เที่ยวล่าช้า</span></div><div><b>{num(worst.delay, 1)} วัน</b><span>ล่าช้าเฉลี่ย</span></div></div>
                {example && <ShipmentTimeline shipment={example} />}
                <Button className="route-cta" onClick={() => onViewRoute(worst.id)}>ดูข้อมูลเส้นทาง {worst.id}</Button>
              </div>
            </div> : <div className="alert-empty"><BellRing size={22} /><p>{worst ? `ไม่มีเส้นทางต่ำกว่า ${target}% ในช่วงที่เลือก` : "ยังไม่มีเที่ยวที่ส่งถึงในช่วงที่เลือก"}</p></div>}
          </div>
        </Card>
      </div>
    </section>
  );
}
