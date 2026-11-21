"use client";

import type { ReactNode } from "react";
import { CircleHelp, PackageCheck, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-context";
import { StatusBadge } from "@/components/shipments-table";
import { formatDate, num, routeById, type Shipment } from "@/lib/analytics";

/** Shared modal shell: overlay, icon, close button, title and description. */
function DialogFrame({ open, onClose, icon, title, description, children }: { open: boolean; onClose: () => void; icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={next => { if (!next) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content className="detail-dialog">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="kpi-icon">{icon}</span>
          <Dialog.Close asChild><Button className="icon-button" aria-label="ปิดรายละเอียด"><X size={20} aria-hidden /></Button></Dialog.Close>
        </div>
        <Dialog.Title className="text-xl font-bold">{title}</Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function ShipmentDetailDialog({ shipment, onClose }: { shipment: Shipment | null; onClose: () => void }) {
  if (!shipment) return null;
  const fields: [string, string][] = [
    ["วันที่สั่ง", formatDate(shipment.orderDate)],
    ["กำหนดส่ง", formatDate(shipment.promisedDate)],
    ["ส่งถึงจริง", shipment.deliveredDate ? formatDate(shipment.deliveredDate) : "ยังไม่ถึง"],
    ["คนขับ", shipment.driver],
    ["รถ", shipment.vehicle],
    ["ระยะทาง", `${shipment.distance} กม.`],
    ["ค่าใช้จ่าย", `${num(shipment.cost)} บาท`],
    ["วันขนส่ง", shipment.transitDays === null ? "–" : `${shipment.transitDays} วัน`],
    ["วันล่าช้า", shipment.status === "in_transit" ? "–" : `${shipment.delayDays} วัน`],
    ["สาเหตุที่บันทึก", shipment.reason ?? "–"],
  ];
  return <DialogFrame open onClose={onClose} icon={<PackageCheck size={24} aria-hidden />} title={shipment.id} description={`${shipment.route} · ${routeById.get(shipment.route)?.label ?? ""}`}>
    <div className="mt-4"><StatusBadge shipment={shipment} /></div>
    <dl className="detail-grid">{fields.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
  </DialogFrame>;
}

// Static content, hoisted so it is created once.
const kpiDefinitions = <ul className="method-list">
  <li><b>ส่งตรงเวลา</b> · เที่ยวที่ส่งถึงไม่เกินกำหนด ÷ เที่ยวที่ส่งถึงแล้ว × 100</li>
  <li><b>ค่าใช้จ่ายต่อเที่ยว</b> · ค่าใช้จ่ายรวม ÷ เที่ยวทั้งหมดที่ผ่านตัวกรอง</li>
  <li><b>เวลาขนส่งเฉลี่ย</b> · วันส่งถึงลบวันสั่ง เฉลี่ยเฉพาะเที่ยวที่ส่งถึง</li>
  <li><b>วันล่าช้าเฉลี่ย</b> · วันส่งถึงลบวันกำหนด เฉลี่ยเฉพาะเที่ยวที่ล่าช้า</li>
  <li><b>ช่วงวันที่</b> · ใช้วันที่สั่งซื้อ และรวมวันเริ่มต้นกับวันสิ้นสุด</li>
</ul>;

function KpiMethodDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <DialogFrame open={open} onClose={onClose} icon={<CircleHelp size={24} aria-hidden />} title="นิยามและฐานคำนวณ" description="KPI หลักคำนวณจากทุกสถานะในเส้นทางและช่วงวันที่ที่เลือก">
    {kpiDefinitions}
  </DialogFrame>;
}

export function DashboardDialogs() {
  const { state: { dialog }, actions: { closeDialog } } = useDashboard();
  return <>
    <ShipmentDetailDialog shipment={dialog?.kind === "shipment" ? dialog.shipment : null} onClose={closeDialog} />
    <KpiMethodDialog open={dialog?.kind === "method"} onClose={closeDialog} />
  </>;
}
