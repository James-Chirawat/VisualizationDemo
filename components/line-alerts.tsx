"use client";

import { useState } from "react";
import Image from "next/image";
import { BellRing, CheckCircle2, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { analyze, num, pct, target, type Filters } from "@/lib/analytics";

export function LineLogo({ size = 44 }: { size?: number }) {
  return <Image className="line-brand" src="/line-brand.png" width={size} height={size} alt="" unoptimized />;
}

export function LineAlerts({ filters, onViewRoute }: { filters: Filters; onViewRoute: (route: string) => void }) {
  const { worst } = analyze({ ...filters, status: "all" });
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
            {worst && belowTarget ? <div className="flex-example">
              <div className="flex-example-title"><BellRing size={16} /> แจ้งเตือนการขนส่ง</div>
              <div className="flex-example-body">
                <p className="font-bold">{worst.id} · {worst.label}</p>
                <div className="flex items-end justify-between gap-2"><strong>{pct(worst.rate)}</strong><span>เป้าหมาย {target}%</span></div>
                <dl><div><dt>ส่งล่าช้า</dt><dd>{worst.late} จาก {worst.completed} เที่ยว</dd></div><div><dt>ล่าช้าเฉลี่ย</dt><dd>{num(worst.delay, 1)} วัน</dd></div></dl>
                <Button className="w-full bg-[#e9f2f7] text-[#19485f] hover:bg-[#dbeaf3]" onClick={() => onViewRoute(worst.id)}>ดูข้อมูล {worst.id}</Button>
              </div>
            </div> : <div className="alert-empty"><BellRing size={22} /><p>{worst ? `ไม่มีเส้นทางต่ำกว่า ${target}% ในช่วงที่เลือก` : "ยังไม่มีเที่ยวที่ส่งถึงในช่วงที่เลือก"}</p></div>}
          </div>
        </Card>
      </div>
    </section>
  );
}
