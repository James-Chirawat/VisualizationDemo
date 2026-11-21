"use client";

import { useState } from "react";
import { ChevronDown, ListFilter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDashboard } from "@/components/dashboard-context";
import { dateBounds, formatRange, routes, statusLabels, type Filters } from "@/lib/analytics";

function dateProblem(key: "from" | "to", value: string, filters: Filters) {
  if (!value) return key === "from" ? "เลือกวันที่สั่งเริ่มต้น" : "เลือกวันที่สั่งสิ้นสุด";
  if (value < dateBounds.from || value > dateBounds.to) return `ข้อมูลมีเฉพาะช่วง ${formatRange(dateBounds.from, dateBounds.to)}`;
  const from = key === "from" ? value : filters.from;
  const to = key === "to" ? value : filters.to;
  return from > to ? "วันที่เริ่มต้นต้องไม่หลังวันที่สิ้นสุด" : "";
}

export function FiltersBar() {
  const { state: { filters }, actions } = useDashboard();
  const [dateError, setDateError] = useState("");
  const [datesOpen, setDatesOpen] = useState(false);

  function changeDate(key: "from" | "to", value: string) {
    const problem = dateProblem(key, value, filters);
    setDateError(problem);
    if (!problem) actions.setFilter(key, value);
  }

  const dateProps = { "aria-invalid": Boolean(dateError), "aria-describedby": dateError ? "date-error" : undefined };

  return <Card className="filters">
    <div className="flex items-center gap-2 text-sm font-bold"><ListFilter size={16} aria-hidden /> ตัวกรองข้อมูล</div>
    <label className="field"><span>เส้นทาง</span><span className="select">
      <select value={filters.route} onChange={event => actions.setFilter("route", event.target.value)}>
        <option value="all">ทุกเส้นทาง</option>
        {routes.map(route => <option key={route.id} value={route.id}>{route.id} · {route.label}</option>)}
      </select><ChevronDown size={16} aria-hidden />
    </span></label>
    <label className="field"><span>สถานะ</span><span className="select">
      <select value={filters.status} onChange={event => actions.setFilter("status", event.target.value as Filters["status"])}>
        <option value="all">ทุกสถานะ</option>
        {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select><ChevronDown size={16} aria-hidden />
    </span></label>
    <div className="filter-more">
      <Button type="button" className="secondary" aria-expanded={datesOpen} aria-controls="date-filter-fields" onClick={() => setDatesOpen(open => !open)}>
        {datesOpen ? "ซ่อนตัวกรองเพิ่มเติม" : "ตัวกรองเพิ่มเติม"} <ChevronDown size={15} aria-hidden />
      </Button>
      <small>{formatRange(filters.from, filters.to)}</small>
    </div>
    <div className="filter-dates" id="date-filter-fields" data-open={datesOpen}>
    <label className="field"><span>วันที่สั่งเริ่มต้น</span><input type="date" min={dateBounds.from} max={filters.to} value={filters.from} {...dateProps} onChange={event => changeDate("from", event.target.value)} /></label>
    <label className="field"><span>วันที่สั่งสิ้นสุด</span><input type="date" min={filters.from} max={dateBounds.to} value={filters.to} {...dateProps} onChange={event => changeDate("to", event.target.value)} /></label>
    </div>
    <Button className="secondary reset" onClick={() => { actions.resetAll(); setDateError(""); }}><RotateCcw size={16} aria-hidden /> รีเซ็ต</Button>
    {dateError ? <p id="date-error" role="alert" className="filter-error">{dateError} · ยังใช้ช่วง {formatRange(filters.from, filters.to)}</p> : null}
  </Card>;
}
