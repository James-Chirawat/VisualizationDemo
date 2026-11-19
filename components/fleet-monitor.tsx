"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, Pause, Play, Truck } from "lucide-react";
import { DriverAvatar } from "@/components/driver-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { routes, type Shipment } from "@/lib/analytics";

const cities = [
  { name: "เชียงใหม่", x: 49, y: 43, dx: 10, dy: -4 },
  { name: "สุโขทัย", x: 74, y: 111, dx: -38, dy: -10 },
  { name: "พิษณุโลก", x: 124, y: 140, dx: 10, dy: -12 },
  { name: "ตาก", x: 34, y: 150, dx: -10, dy: 17 },
  { name: "ขอนแก่น", x: 207, y: 162, dx: -33, dy: 17 },
  { name: "นครสวรรค์", x: 81, y: 198, dx: -46, dy: 17 },
  { name: "กรุงเทพฯ", x: 110, y: 272, dx: 11, dy: 6 },
] as const;

type RouteId = (typeof routes)[number]["id"];
const corridors: Record<RouteId, { path: string; color: string; seconds: number; start: number }> = {
  "R-01": { path: "M110 272 C118 251 137 234 140 213 S133 184 130 170 S126 151 124 140", color: "#65cfff", seconds: 32, start: 0.34 },
  "R-02": { path: "M124 140 C129 122 111 104 105 87 S83 72 73 63 Q57 57 49 43", color: "#ffc579", seconds: 29, start: 0.64 },
  "R-03": { path: "M110 272 C104 257 83 253 86 237 Q91 219 81 198", color: "#a5e5a9", seconds: 24, start: 0.51 },
  "R-04": { path: "M124 140 C108 143 98 125 90 122 Q80 120 74 111", color: "#c6b1ff", seconds: 18, start: 0.53 },
  "R-05": { path: "M124 140 C106 156 92 150 82 154 S62 165 49 157 L34 150", color: "#ff9ead", seconds: 22, start: 0.68 },
  "R-06": { path: "M207 162 C195 144 180 165 167 154 S146 134 124 140", color: "#f4df80", seconds: 28, start: 0.44 },
};

export function FleetMonitor({ rows, onViewTrip }: { rows: Shipment[]; onViewTrip: (trip: Shipment) => void }) {
  const trucks = rows.flatMap(trip => {
    const route = routes.find(item => item.id === trip.route);
    return trip.status === "in_transit" && route ? [{ trip, route, corridor: corridors[route.id] }] : [];
  });
  const shownRoutes = routes.filter(route => trucks.some(item => item.route.id === route.id));
  const map = useRef<SVGSVGElement>(null);
  const [paused, setPaused] = useState(false);
  const [prefersStill, setPrefersStill] = useState(false);
  const [focusedRoute, setFocusedRoute] = useState<RouteId | null>(null);
  const highlighted = shownRoutes.some(route => route.id === focusedRoute) ? focusedRoute : null;
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
    if (isPlaying) map.current?.unpauseAnimations();
    else map.current?.pauseAnimations();
  }, [isPlaying, trucks.length]);

  return <Card className="fleet-panel">
    <div className="fleet-header">
      <div className="fleet-tag"><Navigation size={14} /> Fleet Monitor</div>
      <span className="fleet-sim">GPS จำลอง</span>
      <h2>ติดตามรถบนเส้นทาง</h2>
      <p><b>{trucks.length} คัน</b> บน <b>{shownRoutes.length} เส้นทาง</b> ในตัวกรองนี้</p>
    </div>
    <div className="fleet-map">
      {trucks.length ? <>
        <svg ref={map} viewBox="0 0 238 302" role="img" aria-label="แผนผังเส้นทางขนส่งจำลอง รถแต่ละคันวิ่งจากต้นทางไปยังปลายทางตามสีของเส้นทาง">
          <defs>
            <pattern id="fleet-grid" width="19" height="19" patternUnits="userSpaceOnUse"><path d="M19 0 H0 V19" fill="none" stroke="#42667b" strokeWidth=".65" opacity=".4" /></pattern>
            <linearGradient id="fleet-land" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#1c3b4d" /><stop offset="1" stopColor="#102c41" /></linearGradient>
          </defs>
          <rect width="238" height="302" rx="13" fill="url(#fleet-land)" />
          <path d="M0 12 31 7 69 28 85 52 67 81 46 88 51 110 27 133 0 149Z M238 2 172 6 148 39 161 58 152 78 175 113 216 127 238 111Z" fill="#244c50" opacity=".55" />
          <path d="M152 302 Q136 280 154 269 T199 254 Q221 244 238 251V302Z" fill="#133a56" />
          <rect width="238" height="302" rx="13" fill="url(#fleet-grid)" />
          <path d="M14 36V18m0 0-4 7m4-7 4 7" stroke="#b6d4e4" strokeWidth="1.3" fill="none" />
          <text x="14" y="47" textAnchor="middle" fill="#b6d4e4" fontSize="8">N</text>
          {routes.map(route => {
            const corridor = corridors[route.id];
            const active = shownRoutes.some(item => item.id === route.id);
            return <g key={route.id} opacity={!active ? .25 : highlighted && highlighted !== route.id ? .33 : 1}>
              <path d={corridor.path} fill="none" stroke="#0b2232" strokeWidth="7" strokeLinecap="round" />
              <path data-route-path={route.id} d={corridor.path} fill="none" stroke={active ? corridor.color : "#91aeb9"} strokeWidth={highlighted === route.id ? 3.7 : 2.5} strokeLinecap="round" />
            </g>;
          })}
          {cities.map(city => <g key={city.name}>
            <circle cx={city.x} cy={city.y} r={city.name === "พิษณุโลก" ? 4.8 : 3.5} fill="#172f41" stroke="#ecf6fd" strokeWidth="1.45" />
            <text x={city.x + city.dx} y={city.y + city.dy} className="fleet-city">{city.name}</text>
          </g>)}
          {trucks.map(({ trip, route, corridor }) => {
            const duration = corridor.seconds + "s";
            const start = -corridor.seconds * corridor.start + "s";
            return <g key={trip.id} opacity={highlighted && highlighted !== route.id ? .38 : 1} data-vehicle={trip.id} data-vehicle-route={route.id}>
              <animateMotion dur={duration} begin={start} repeatCount="indefinite" rotate="auto" path={corridor.path} />
              <g>
                <animate attributeName="opacity" dur={duration} begin={start} repeatCount="indefinite" values="0;1;1;0" keyTimes="0;.04;.95;1" />
                <rect x="-8.3" y="-5" width="16.6" height="10" rx="3.5" fill="#081d2a" opacity=".9" />
                <rect x="-7" y="-3.5" width="9" height="7" rx="1.5" fill={corridor.color} />
                <path d="M3 -3.5H5.5L7 -1.5V3.5H3Z" fill="#f0f7fc" />
                <path d="M5.2 -1.8H6.2V1.8H5.2Z" fill="#174262" />
              </g>
            </g>;
          })}
        </svg>
        <Button type="button" className="fleet-control" disabled={prefersStill} onClick={() => setPaused(value => !value)} aria-label={isPlaying ? "หยุดรถจำลอง" : "เล่นรถจำลอง"} title={prefersStill ? "เครื่องตั้งค่าให้ลดการเคลื่อนไหว" : undefined}>{isPlaying ? <Pause size={15} /> : <Play size={15} />}</Button>
      </> : <div className="fleet-empty"><Truck size={25} /><p>ไม่มีรถกำลังขนส่งในตัวกรองนี้</p></div>}
    </div>
    {trucks.length > 0 && <p className="fleet-caption">แผนผังเส้นทาง · สีตรงกับรายการรถ</p>}
    <div className="fleet-list" aria-label="รถกำลังขนส่ง">
      {trucks.map(({ trip, route, corridor }) => <button key={trip.id} type="button" className={highlighted === route.id ? "fleet-route-highlighted" : undefined}
        onMouseEnter={() => setFocusedRoute(route.id)} onMouseLeave={() => setFocusedRoute(null)}
        onFocus={() => setFocusedRoute(route.id)} onBlur={() => setFocusedRoute(null)}
        onClick={() => onViewTrip(trip)} aria-label={`เปิดเที่ยว ${route.id} ${route.label} คนขับ ${trip.driver}`}>
        <span style={{ backgroundColor: corridor.color }} />
        <span className="fleet-route-label"><b>{trip.route}</b><small>{route.label}</small></span>
        <span className="fleet-driver"><DriverAvatar driverId={trip.driver} /><small>{trip.driver}</small></span>
      </button>)}
    </div>
  </Card>;
}
