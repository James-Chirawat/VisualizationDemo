"use client";

import { useDeferredValue, useMemo } from "react";
import { ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PanelHeading } from "@/components/ui/panel-heading";
import { useDashboard, useShipmentQuery, type ShipmentSort } from "@/components/dashboard-context";
import { formatDate, num, routeById, statusLabels, type Shipment } from "@/lib/analytics";

const pageSize = 10;

const comparators: Record<ShipmentSort, (a: Shipment, b: Shipment) => number> = {
  latest: (a, b) => b.orderDate.localeCompare(a.orderDate),
  delay: (a, b) => b.delayDays - a.delayDays,
  cost: (a, b) => b.cost - a.cost,
};

export function StatusBadge({ shipment }: { shipment: Shipment }) {
  return <span className={`status ${shipment.status}`}>{statusLabels[shipment.status]}</span>;
}

function downloadCsv(rows: Shipment[]) {
  const header = ["shipment_id", "route_code", "driver_id", "order_date", "promised_date", "delivery_date", "status", "freight_cost", "transit_days", "delay_days", "reported_reason"];
  const body = rows.map(row => [row.id, row.route, row.driver, row.orderDate, row.promisedDate, row.deliveredDate, statusLabels[row.status], row.cost, row.transitDays, row.delayDays, row.reason]);
  const content = [header, ...body].map(row => row.map(value => '"' + String(value ?? "").replaceAll('"', '""') + '"').join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿", content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "routelens-shipments.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function matches(row: Shipment, term: string) {
  return [row.id, row.route, row.driver, routeById.get(row.route)?.label].some(value => value?.toLowerCase().includes(term));
}

export function ShipmentsTable() {
  const { state: { filters, insight: { rows, summary } }, actions: { openShipment } } = useDashboard();
  const { state: { search, sort, page: requestedPage }, actions } = useShipmentQuery();
  // The input updates immediately; the filtered list catches up without blocking typing.
  const deferredSearch = useDeferredValue(search);

  const visibleRows = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return (term ? rows.filter(row => matches(row, term)) : rows).toSorted(comparators[sort]);
  }, [rows, deferredSearch, sort]);

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const page = Math.min(requestedPage, pageCount - 1);

  return <Card as="section" id="shipments" className="panel section-block" aria-labelledby="shipments-title">
    <PanelHeading id="shipments-title" title="รายการขนส่ง" subtitle={`พบ ${visibleRows.length} จาก ${summary.total} เที่ยวในตัวกรอง · ${filters.status === "all" ? "ทุกสถานะ" : statusLabels[filters.status]} · กดรหัสรายการเพื่อเปิดรายละเอียด`}
      aside={<Button className="secondary" onClick={() => downloadCsv(visibleRows)} disabled={!visibleRows.length || search !== deferredSearch}><Download size={16} aria-hidden /> ส่งออก {num(visibleRows.length)} รายการ</Button>} />
    <div className="shipment-controls">
      <label className="field shipment-search"><span>ค้นหา</span><input className="table-input" type="search" placeholder="รหัสเที่ยว เส้นทาง หรือคนขับ" value={search} onChange={event => actions.setSearch(event.target.value)} /></label>
      <label className="field"><span>เรียงตาม</span><span className="select">
        <select value={sort} onChange={event => actions.setSort(event.target.value as ShipmentSort)}>
          <option value="latest">วันที่สั่งล่าสุด</option><option value="delay">ล่าช้ามากที่สุด</option><option value="cost">ค่าใช้จ่ายสูงสุด</option>
        </select><ChevronDown size={16} aria-hidden />
      </span></label>
    </div>
    {visibleRows.length ? <>
      <div className="table-scroll"><table className="data-table shipment-table">
        <caption className="sr-only">รายการขนส่ง หน้า {page + 1} จาก {pageCount}</caption>
        <thead><tr><th scope="col">รหัสเที่ยว</th><th scope="col">เส้นทาง</th><th scope="col">คนขับ</th><th scope="col">วันที่สั่ง</th><th scope="col">ส่งถึง</th><th scope="col">สถานะ</th><th scope="col" className="text-right">ค่าใช้จ่าย (บาท)</th></tr></thead>
        <tbody>{visibleRows.slice(page * pageSize, (page + 1) * pageSize).map(row => <tr key={row.id}>
          <td className="cell-id"><button className="text-link" onClick={() => openShipment(row)}>{row.id}</button></td>
          <td className="cell-route" data-label="เส้นทาง">{row.route}</td>
          <td className="cell-driver" data-label="คนขับ">{row.driver}</td>
          <td className="cell-ordered" data-label="วันที่สั่ง">{formatDate(row.orderDate)}</td>
          <td className="cell-delivered" data-label="ส่งถึง">{formatDate(row.deliveredDate)}</td>
          <td className="cell-status"><StatusBadge shipment={row} /></td>
          <td className="cell-cost text-right tabular-nums" data-label="ค่าใช้จ่าย (บาท)">{num(row.cost)}</td>
        </tr>)}</tbody>
      </table></div>
      <div className="mt-4 flex items-center justify-between gap-2 text-sm">
        <span className="text-muted" aria-live="polite">หน้า {page + 1} จาก {pageCount}</span>
        <div className="flex gap-2">
          <Button className="secondary" disabled={page === 0} onClick={() => actions.setPage(page - 1)}>ก่อนหน้า</Button>
          <Button className="secondary" disabled={page + 1 === pageCount} onClick={() => actions.setPage(page + 1)}>ถัดไป</Button>
        </div>
      </div>
    </> : <EmptyState>ไม่พบรายการ ลองปรับตัวกรองหรือคำค้น</EmptyState>}
  </Card>;
}
