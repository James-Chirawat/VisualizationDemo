"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Navigation, Pause, Play, Truck } from "lucide-react";
import { DriverAvatar } from "@/components/driver-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { routeById, routes, type Route, type Shipment } from "@/lib/analytics";
import { reducedMotionQuery, useMediaQuery } from "@/lib/use-media-query";

/*
 * Motion follows the map-route skill (.claude/skills/map-route):
 *  - each route draws itself from the origin with a quad in-out ease, and the vehicle rides the drawing head;
 *  - the vehicle is a dot with a pulse halo; the travelled part is solid, the rest stays faint;
 *  - the remaining distance counts down, and on arrival a red pin drops with one bounce;
 *  - calm: one pin and one destination card at a time (the route you point at), no extra arrows.
 * Positions are written straight to the DOM from a requestAnimationFrame loop, so React does not re-render per frame.
 */

const cities = [
  { name: "เชียงใหม่", x: 49, y: 43, dx: 10, dy: -4 },
  { name: "สุโขทัย", x: 74, y: 111, dx: -38, dy: -10 },
  { name: "พิษณุโลก", x: 124, y: 140, dx: 10, dy: -12 },
  { name: "ตาก", x: 34, y: 150, dx: -10, dy: 17 },
  { name: "ขอนแก่น", x: 207, y: 162, dx: -33, dy: 17 },
  { name: "นครสวรรค์", x: 81, y: 198, dx: -46, dy: 17 },
  { name: "กรุงเทพฯ", x: 110, y: 272, dx: 11, dy: 6 },
] as const;

type RouteId = Route["id"];
/** Paths run origin → destination. `start` is where the vehicle is when the page opens; `seconds` sets its pace. */
const corridors: Record<RouteId, { path: string; color: string; seconds: number; start: number; end: [number, number] }> = {
  "R-01": { path: "M110 272 C118 251 137 234 140 213 S133 184 130 170 S126 151 124 140", color: "#65cfff", seconds: 32, start: 0.34, end: [124, 140] },
  "R-02": { path: "M124 140 C129 122 111 104 105 87 S83 72 73 63 Q57 57 49 43", color: "#ffc579", seconds: 29, start: 0.64, end: [49, 43] },
  "R-03": { path: "M110 272 C104 257 83 253 86 237 Q91 219 81 198", color: "#a5e5a9", seconds: 24, start: 0.51, end: [81, 198] },
  "R-04": { path: "M124 140 C108 143 98 125 90 122 Q80 120 74 111", color: "#c6b1ff", seconds: 18, start: 0.53, end: [74, 111] },
  "R-05": { path: "M124 140 C106 156 92 150 82 154 S62 165 49 157 L34 150", color: "#ff9ead", seconds: 22, start: 0.68, end: [34, 150] },
  "R-06": { path: "M207 162 C195 144 180 165 167 154 S146 134 124 140", color: "#f4df80", seconds: 28, start: 0.44, end: [124, 140] },
};

const PACE = 2.5;          // a full trip takes corridor.seconds × PACE seconds of demo time
const DRAW = 1.6;          // route draw-in, seconds
const STAGGER = 0.12;      // between routes
const ARRIVE_HOLD = 3;     // seconds parked at the destination before the next trip starts
const SPEED_KMH = 60;      // assumed average speed for the ETA
const easeInOut = (x: number) => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

type Trip = { trip: Shipment; route: Route; corridor: (typeof corridors)[RouteId]; destination: string; index: number };
type Frame = { progress: number; arrived: boolean };

/** Where a vehicle is at `clock` seconds after the draw-in: travels from its start, parks, then loops as a new trip. */
function frameAt(start: number, period: number, clock: number): Frame {
  const travel = start + clock / period;
  if (travel < 1) return { progress: travel, arrived: false };
  const sinceArrival = (travel - 1) * period;
  const inCycle = sinceArrival % (period + ARRIVE_HOLD);
  return inCycle < ARRIVE_HOLD ? { progress: 1, arrived: true } : { progress: (inCycle - ARRIVE_HOLD) / period, arrived: false };
}

function remainingText(km: number, progress: number, arrived: boolean) {
  if (arrived) return "ถึงปลายทางแล้ว";
  const left = km * (1 - progress);
  const minutes = left / SPEED_KMH * 60;
  const eta = minutes < 55 ? `~${Math.max(5, Math.round(minutes / 5) * 5)} นาที` : `~${Math.round(minutes / 30) / 2} ชม.`;
  return `เหลือ ${Math.round(left)} กม. · ${eta}`;
}

/** Red destination pin (the map-route skill keeps it red whatever the route colour); drops in with one bounce. */
function DestinationPin({ at: [x, y] }: { at: [number, number] }) {
  return <g transform={`translate(${x} ${y})`}>
    <ellipse className="fleet-pin-shadow" rx="3.6" ry="1.3" fill="#000" opacity=".35" />
    <g className="fleet-pin"><path d="M0 0C-1.2-3.6-6-6.4-6-11a6 6 0 0 1 12 0c0 4.6-4.8 7.4-6 11Z" fill="#f0483e" /><circle cy="-11" r="2.3" fill="#fff" /></g>
  </g>;
}

type Nodes = { head?: SVGGElement | null; trail?: SVGPathElement | null; base?: SVGPathElement | null; bar?: HTMLElement | null; eta?: HTMLElement | null; row?: HTMLElement | null; cardEta?: HTMLElement | null };

export const FleetMonitor = memo(function FleetMonitor({ rows, onViewTrip }: { rows: Shipment[]; onViewTrip: (trip: Shipment) => void }) {
  const trucks = useMemo<Trip[]>(() => rows.flatMap(trip => {
    const route = routeById.get(trip.route);
    return trip.status === "in_transit" && route
      ? [{ trip, route, corridor: corridors[route.id], destination: route.label.split(" – ")[1] ?? route.label, index: 0 }]
      : [];
  }).map((item, index) => ({ ...item, index })), [rows]);
  const activeRouteIds = new Set(trucks.map(item => item.route.id));
  const shownRoutes = routes.filter(route => activeRouteIds.has(route.id));

  const [paused, setPaused] = useState(false);
  const prefersStill = useMediaQuery(reducedMotionQuery);
  const [focusedRoute, setFocusedRoute] = useState<RouteId | null>(null);
  const highlighted = focusedRoute && activeRouteIds.has(focusedRoute) ? focusedRoute : null;
  // Routes whose vehicle is parked at its destination. Changes only on arrival/departure, so a render then is cheap.
  const [arrivedRoutes, setArrivedRoutes] = useState<ReadonlySet<RouteId>>(new Set());
  const isPlaying = !paused && !prefersStill;

  const mapBox = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, Nodes>());
  const node = (id: string) => { let entry = nodes.current.get(id); if (!entry) nodes.current.set(id, entry = {}); return entry; };
  // Demo clock: survives pausing and re-renders, restarts the draw-in when the set of vehicles changes.
  const clock = useRef({ elapsed: 0, last: 0 });
  const playing = useRef(isPlaying);
  playing.current = isPlaying;

  useEffect(() => {
    clock.current = { elapsed: 0, last: performance.now() };
    const lengths = new Map(trucks.map(item => [item.trip.id, node(item.trip.id).base?.getTotalLength() ?? 0]));
    let frame = 0;
    let visible = true;
    let arrivedKey = "-"; // forces the first frame to sync arrivals after the vehicle set changes

    const paint = (now: number) => {
      const state = clock.current;
      if (playing.current) state.elapsed += Math.min(.1, (now - state.last) / 1000);
      state.last = now;
      const still = !playing.current && state.elapsed === 0; // reduced motion from the start: no draw-in
      const arrivedNow: RouteId[] = [];
      for (const item of trucks) {
        const n = node(item.trip.id);
        const period = item.corridor.seconds * PACE;
        const delay = item.index * STAGGER;
        const drawn = still ? 1 : easeInOut(clamp01((state.elapsed - delay) / DRAW));
        const after = Math.max(0, state.elapsed - delay - DRAW);
        const { progress, arrived } = drawn < 1 ? { progress: item.corridor.start * drawn, arrived: false } : frameAt(item.corridor.start, period, after);
        const length = lengths.get(item.trip.id) ?? 0;
        const point = n.base?.getPointAtLength(length * progress);
        if (point && n.head) n.head.setAttribute("transform", `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
        n.head?.setAttribute("opacity", drawn > 0 ? "1" : "0");
        n.base?.style.setProperty("stroke-dashoffset", String(1 - drawn));
        n.trail?.style.setProperty("stroke-dashoffset", String(1 - progress));
        n.bar?.style.setProperty("width", `${(progress * 100).toFixed(1)}%`);
        const text = remainingText(item.route.km, progress, arrived);
        if (n.eta && n.eta.textContent !== text) n.eta.textContent = text;
        if (n.cardEta && n.cardEta.textContent !== text) n.cardEta.textContent = text;
        n.row?.toggleAttribute("data-arrived", arrived);
        n.head?.toggleAttribute("data-arrived", arrived);
        if (arrived) arrivedNow.push(item.route.id);
      }
      // Only touch React state when the set of parked vehicles actually changes.
      const key = arrivedNow.join();
      if (key !== arrivedKey) { arrivedKey = key; setArrivedRoutes(new Set(arrivedNow)); }
      if (visible) frame = requestAnimationFrame(paint);
    };

    // Only animate while the map is on screen.
    const observer = new IntersectionObserver(([entry]) => {
      const wasVisible = visible;
      visible = entry.isIntersecting;
      if (visible && !wasVisible) { clock.current.last = performance.now(); frame = requestAnimationFrame(paint); }
      if (!visible) cancelAnimationFrame(frame);
    });
    if (mapBox.current) observer.observe(mapBox.current);
    frame = requestAnimationFrame(paint);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [trucks]);

  const focus = trucks.find(item => item.route.id === highlighted);

  return <Card className="fleet-panel">
    <div className="fleet-header">
      <div className="fleet-tag"><Navigation size={16} aria-hidden /> Fleet Monitor</div>
      <span className="fleet-sim">GPS จำลอง</span>
      <h2>ติดตามรถบนเส้นทาง</h2>
      <p><b>{trucks.length} คัน</b> บน <b>{shownRoutes.length} เส้นทาง</b> ในตัวกรองนี้</p>
    </div>
    <div ref={mapBox} className="fleet-map" data-playing={isPlaying}>
      {trucks.length ? <>
        <svg viewBox="0 0 238 302" role="img" aria-label="แผนผังเส้นทางขนส่งจำลอง รถแต่ละคันวิ่งจากต้นทางไปยังปลายทางตามสีของเส้นทาง ส่วนที่วิ่งแล้วเป็นเส้นทึบ">
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

          {/* Routes with no vehicle in this filter stay as faint context. */}
          {routes.filter(route => !activeRouteIds.has(route.id)).map(route => <path key={route.id} d={corridors[route.id].path} fill="none" stroke="#91aeb9" strokeWidth="2" strokeLinecap="round" opacity=".22" />)}

          {trucks.map(({ trip, route, corridor }) => {
            const dim = highlighted && highlighted !== route.id;
            const width = highlighted === route.id ? 3.8 : 2.6;
            return <g key={trip.id} className="fleet-route" opacity={dim ? .3 : 1}>
              <path d={corridor.path} fill="none" stroke="#0b2232" strokeWidth={width + 4.5} strokeLinecap="round" />
              {/* Whole route, faint; draws itself in on load. */}
              <path ref={el => { node(trip.id).base = el; }} d={corridor.path} pathLength={1} className="fleet-route-base" fill="none" stroke={corridor.color} strokeWidth={width} strokeLinecap="round" />
              {/* Travelled part, solid, up to the vehicle. */}
              <path ref={el => { node(trip.id).trail = el; }} d={corridor.path} pathLength={1} className="fleet-route-trail" fill="none" stroke={corridor.color} strokeWidth={width} strokeLinecap="round" />
            </g>;
          })}

          {cities.map(city => <g key={city.name}>
            <circle cx={city.x} cy={city.y} r={city.name === "พิษณุโลก" ? 4.8 : 3.5} fill="#172f41" stroke="#ecf6fd" strokeWidth="1.45" />
            <text x={city.x + city.dx} y={city.y + city.dy} className="fleet-city">{city.name}</text>
          </g>)}

          {trucks.map(({ trip, route, corridor }) => <g key={trip.id} ref={el => { node(trip.id).head = el; }} className="fleet-head" opacity="0"
            data-dim={highlighted && highlighted !== route.id ? true : undefined} data-vehicle={trip.id} data-vehicle-route={route.id}>
            <circle className="fleet-head-pulse" r="7" fill={corridor.color} />
            <circle r="4.4" fill="#f4fbff" />
            <circle r="2.7" fill={corridor.color} />
          </g>)}

          {/* A pin drops where a vehicle has just arrived (and where you point). Keyed so the drop replays each time. */}
          {trucks.filter(item => arrivedRoutes.has(item.route.id) && item.route.id !== highlighted).map(item => <DestinationPin key={`arrived-${item.route.id}`} at={item.corridor.end} />)}
          {/* One card at a time: the route being pointed at. */}
          {focus ? <g key={focus.route.id} className="fleet-focus">
            <DestinationPin at={focus.corridor.end} />
            <foreignObject x={Math.min(238 - 114, Math.max(4, focus.corridor.end[0] - 57))} y={focus.corridor.end[1] - 52 < 4 ? focus.corridor.end[1] + 6 : focus.corridor.end[1] - 52} width="114" height="34">
              <div className="fleet-card">
                <b>{focus.destination}</b>
                <span><i style={{ background: focus.corridor.color }} /><em ref={el => { node(focus.trip.id).cardEta = el; }}>{remainingText(focus.route.km, focus.corridor.start, false)}</em></span>
              </div>
            </foreignObject>
          </g> : null}
        </svg>
        <Button type="button" className="fleet-control" disabled={prefersStill} onClick={() => setPaused(value => !value)} aria-label={isPlaying ? "หยุดรถจำลอง" : "เล่นรถจำลอง"} title={prefersStill ? "เครื่องตั้งค่าให้ลดการเคลื่อนไหว" : undefined}>{isPlaying ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}</Button>
      </> : <div className="fleet-empty"><Truck size={24} aria-hidden /><p>ไม่มีรถกำลังขนส่งในตัวกรองนี้</p></div>}
    </div>
    {trucks.length > 0 ? <p className="fleet-caption">เส้นทึบคือช่วงที่วิ่งแล้ว · ชี้ที่รายการเพื่อดูปลายทาง</p> : null}
    <div className="fleet-list" aria-label="รถกำลังขนส่ง">
      {trucks.map(({ trip, route, corridor }) => <button key={trip.id} ref={el => { node(trip.id).row = el; }} type="button" className={highlighted === route.id ? "fleet-route-highlighted" : undefined}
        onMouseEnter={() => setFocusedRoute(route.id)} onMouseLeave={() => setFocusedRoute(null)}
        onFocus={() => setFocusedRoute(route.id)} onBlur={() => setFocusedRoute(null)}
        onClick={() => onViewTrip(trip)} aria-label={`เปิดเที่ยว ${route.id} ${route.label} คนขับ ${trip.driver}`}>
        <span style={{ backgroundColor: corridor.color }} />
        <span className="fleet-route-label">
          <span className="fleet-route-title"><b>{trip.route}</b><small>{route.label}</small></span>
          <span className="fleet-route-meta">
            <span className="fleet-progress" aria-hidden><i ref={el => { node(trip.id).bar = el; }} style={{ background: corridor.color, width: `${corridor.start * 100}%` }} /></span>
            <small className="fleet-eta" ref={el => { node(trip.id).eta = el; }}>{remainingText(route.km, corridor.start, false)}</small>
          </span>
        </span>
        <span className="fleet-driver"><DriverAvatar driverId={trip.driver} /><small>{trip.driver}</small></span>
      </button>)}
    </div>
  </Card>;
});
