"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, ChartNoAxesCombined, ClipboardList, MapPinned, Truck } from "lucide-react";
import { RouteLensMark } from "@/components/ui/routelens-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { scrollToSection, type SectionId } from "@/components/dashboard-context";
import { prefersReducedMotion } from "@/lib/use-media-query";

const items = [
  { label: "ภาพรวม", short: "ภาพรวม", id: "overview", icon: ChartNoAxesCombined },
  { label: "ติดตามรถ", short: "ติดตามรถ", id: "fleet", icon: Truck },
  { label: "เจาะลึกข้อมูล", short: "เจาะลึก", id: "analysis", icon: MapPinned },
  { label: "รายการขนส่ง", short: "รายการ", id: "shipments", icon: ClipboardList },
  { label: "LINE OA", short: "LINE OA", id: "alerts", icon: BellRing },
] as const satisfies readonly { label: string; short: string; id: SectionId; icon: unknown }[];
const sectionIds = ["fleet", "analysis", "shipments", "alerts"] as const;

/** Which section sits under the sticky top bar. Owned here so scrolling re-renders only the nav. */
function useActiveSection() {
  const [active, setActive] = useState<SectionId>("overview");
  useEffect(() => {
    // A few rect reads per scroll event; React skips the render when the section is unchanged.
    const update = () => {
      const offset = (document.querySelector(".topbar")?.getBoundingClientRect().height ?? 0) + 32;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      const current = atBottom ? sectionIds.at(-1) : sectionIds.findLast(id => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= offset);
      setActive(current ?? "overview");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  return [active, setActive] as const;
}

export function TopNav() {
  const [active, setActive] = useActiveSection();
  const nav = useRef<HTMLElement>(null);

  // On phones the nav scrolls sideways; keep the current tab in view.
  useEffect(() => {
    const item = nav.current?.querySelector<HTMLElement>("[aria-current]");
    if (!nav.current || !item || nav.current.scrollWidth <= nav.current.clientWidth) return;
    const offset = item.getBoundingClientRect().left - nav.current.getBoundingClientRect().left;
    nav.current.scrollTo({ left: nav.current.scrollLeft + offset - (nav.current.clientWidth - item.offsetWidth) / 2, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [active]);

  function go(id: SectionId) {
    setActive(id);
    scrollToSection(id);
  }

  return <header className="topbar">
    <div className="topbar-inner">
      <a href="#overview" className="topbar-brand" onClick={event => { event.preventDefault(); go("overview"); }}>
        <RouteLensMark size={30} className="brand-mark" /><b>RouteLens</b>
      </a>
      <div className="topbar-actions">
        <nav ref={nav} className="topbar-nav" aria-label="เมนูแดชบอร์ด">
          {items.map(item => <a key={item.id} href={`#${item.id}`} aria-label={item.label} aria-current={active === item.id ? "location" : undefined} onClick={event => { event.preventDefault(); go(item.id); }}>
            <item.icon size={16} aria-hidden /><span className="nav-full">{item.label}</span><span className="nav-short" aria-hidden>{item.short}</span>
          </a>)}
        </nav>
        <ThemeToggle />
      </div>
    </div>
  </header>;
}
