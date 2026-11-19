"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, Pause, Play, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { routes, type Shipment } from "@/lib/analytics";

const road = "M 112 28 C 112 56 55 55 55 93 S 177 116 177 155 S 66 175 66 211 S 144 239 144 272";
const vehicleColors = ["#1bb0db", "#f2a358", "#76d59a", "#9e92f9", "#f77989", "#e2ce6b"];
const loopSeconds = 27;

export function FleetMonitor({ rows, onViewTrip }: { rows: Shipment[]; onViewTrip: (trip: Shipment) => void }) {
  const trucks = rows.filter(row => row.status === "in_transit");
  const map = useRef<SVGSVGElement>(null);
  const [paused, setPaused] = useState(false);
  const [prefersStill, setPrefersStill] = useState(false);
  const isPlaying = !paused && !prefersStill;

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => {
      if (motion.matches) map.current?.pauseAnimations();
      setPrefersStill(motion.matches);
    };
    syncMotion();
    motion.addEventListener("change", syncMotion);
    return () => motion.removeEventListener("change", syncMotion);
  }, []);
  useEffect(() => {
    const svg = map.current;
    if (isPlaying) svg?.unpauseAnimations();
    else svg?.pauseAnimations();
  }, [isPlaying, trucks.length]);

  return <Card className="fleet-panel">
    <div className="fleet-header">
      <div className="fleet-tag"><Navigation size={14} /> Fleet Monitor</div>
      <span className="fleet-sim">GPS จำลอง</span>
      <h2>ติดตามรถบนเส้นทาง</h2>
      <p><b>{trucks.length} คัน</b> กำลังขนส่งในชุดข้อมูลที่เลือก</p>
    </div>
    <div className="fleet-map">
      {trucks.length ? <>
        <svg ref={map} viewBox="0 0 232 298" role="img" aria-label="ภาพจำลองรถหลายคันเคลื่อนที่บนเส้นทางคดเคี้ยว">
          <defs><pattern id="fleet-grid" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M 14 0 L 0 0 0 14" fill="none" stroke="#426076" strokeOpacity=".48" /></pattern></defs>
          <rect x="1" y="1" width="230" height="296" rx="15" fill="url(#fleet-grid)" />
          <path d={road} fill="none" stroke="#3d6077" strokeWidth="32" strokeLinecap="round" />
          <path d={road} fill="none" stroke="#21333f" strokeWidth="28" strokeLinecap="round" />
          <path d={road} fill="none" stroke="#7e95a5" strokeWidth="1.3" strokeDasharray="5 6" />
          <circle cx="112" cy="28" r="7" fill="#122e43" stroke="#8addbd" strokeWidth="3" />
          <circle cx="144" cy="272" r="7" fill="#122e43" stroke="#8bd1ff" strokeWidth="3" />
          <text x="128" y="29" fill="#bad0df" fontSize="11">ต้นทาง</text>
          <text x="156" y="282" fill="#bad0df" fontSize="11">ปลายทาง</text>
          {trucks.map((trip, index) => <g key={trip.id} data-vehicle={trip.id}>
            <animateMotion dur={`${loopSeconds}s`} begin={`${-(index + 0.6) * (loopSeconds / trucks.length)}s`} repeatCount="indefinite" rotate="auto" path={road} />
            <circle r="16" fill={vehicleColors[index]} fillOpacity=".19" />
            <rect x="-12" y="-7" width="24" height="14" rx="4" fill="#0b2434" />
            <rect x="-11" y="-6" width="15" height="12" rx="2" fill={vehicleColors[index]} />
            <path d="M 5 -5 H 8 L 11 -2 V 5 H 5 Z" fill="#f0f7fc" />
            <path d="M 8 -2 H 10 V 2 H 8 Z" fill="#174262" />
          </g>)}
        </svg>
        <Button type="button" className="fleet-control" disabled={prefersStill} onClick={() => setPaused(value => !value)} aria-label={isPlaying ? "หยุดรถจำลอง" : "เล่นรถจำลอง"} title={prefersStill ? "เครื่องตั้งค่าให้ลดการเคลื่อนไหว" : undefined}>{isPlaying ? <Pause size={15} /> : <Play size={15} />}</Button>
      </> : <div className="fleet-empty"><Truck size={25} /><p>ไม่มีรถกำลังขนส่งในตัวกรองนี้</p></div>}
    </div>
    <div className="fleet-list" aria-label="รถกำลังขนส่ง">
      {trucks.map((trip, index) => <button key={trip.id} type="button" onClick={() => onViewTrip(trip)}>
        <span style={{ backgroundColor: vehicleColors[index] }} />
        <span><b>{trip.route}</b><small>{routes.find(route => route.id === trip.route)?.label}</small></span>
        <small>{trip.driver}</small>
      </button>)}
    </div>
  </Card>;
}
