"use client";

import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { analyze, defaultFilters, routeById, type Filters, type Route, type Shipment } from "@/lib/analytics";
import { prefersReducedMotion } from "@/lib/use-media-query";

export type SectionId = "overview" | "analysis" | "shipments" | "alerts";
export type ShipmentSort = "latest" | "delay" | "cost";
export type DashboardDialog = { kind: "shipment"; shipment: Shipment } | { kind: "method" } | null;

export function scrollToSection(id: SectionId) {
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
  history.replaceState(null, "", `#${id}`);
}

/* ---------- Dashboard data: filters, derived insight, open dialog ---------- */

interface DashboardContextValue {
  state: { filters: Filters; insight: ReturnType<typeof analyze>; dialog: DashboardDialog };
  actions: DashboardActions;
  meta: { activeRoute: Route | undefined; scope: string };
}

interface DashboardActions {
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  /** Filter to one route ("all" clears it). */
  focusRoute: (route: string) => void;
  /** Show every status for a route, then jump to the analysis section. */
  inspectRoute: (route: string) => void;
  /** Search the shipment table for a driver and jump to it. */
  showDriverTrips: (driver: string) => void;
  resetAll: () => void;
  openShipment: (shipment: Shipment) => void;
  openMethod: () => void;
  closeDialog: () => void;
}

/* ---------- Shipment table query: kept separate so typing in search does not re-render the charts ---------- */

interface ShipmentQueryContextValue {
  state: { search: string; sort: ShipmentSort; page: number };
  actions: { setSearch: (search: string) => void; setSort: (sort: ShipmentSort) => void; setPage: (page: number) => void };
}

const DashboardContext = createContext<DashboardContextValue | null>(null);
const ShipmentQueryContext = createContext<ShipmentQueryContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [dialog, setDialog] = useState<DashboardDialog>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ShipmentSort>("latest");
  const [page, setPage] = useState(0);
  const insight = useMemo(() => analyze(filters), [filters]);

  // Only setState functions are captured, so actions keep one identity for the provider's lifetime.
  const actions = useMemo<DashboardActions>(() => {
    const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setFilters(current => ({ ...current, [key]: value }));
      setPage(0);
    };
    return {
      setFilter,
      focusRoute: route => setFilter("route", route),
      inspectRoute: route => {
        setFilters(current => ({ ...current, route, status: "all" }));
        setPage(0);
        scrollToSection("analysis");
      },
      showDriverTrips: driver => {
        setSearch(driver);
        setPage(0);
        scrollToSection("shipments");
      },
      resetAll: () => {
        setFilters(defaultFilters);
        setSearch("");
        setSort("latest");
        setPage(0);
      },
      openShipment: shipment => setDialog({ kind: "shipment", shipment }),
      openMethod: () => setDialog({ kind: "method" }),
      closeDialog: () => setDialog(null),
    };
  }, []);

  const dashboard = useMemo<DashboardContextValue>(() => {
    const activeRoute = routeById.get(filters.route);
    return {
      state: { filters, insight, dialog },
      actions,
      meta: { activeRoute, scope: activeRoute ? `${activeRoute.id} · ${activeRoute.label}` : "ทุกเส้นทาง" },
    };
  }, [filters, insight, dialog, actions]);

  const query = useMemo<ShipmentQueryContextValue>(() => ({
    state: { search, sort, page },
    actions: {
      setSearch: value => { setSearch(value); setPage(0); },
      setSort: value => { setSort(value); setPage(0); },
      setPage,
    },
  }), [search, sort, page]);

  return <DashboardContext value={dashboard}><ShipmentQueryContext value={query}>{children}</ShipmentQueryContext></DashboardContext>;
}

export function useDashboard() {
  const value = use(DashboardContext);
  if (!value) throw new Error("useDashboard must be used inside <DashboardProvider>");
  return value;
}

export function useShipmentQuery() {
  const value = use(ShipmentQueryContext);
  if (!value) throw new Error("useShipmentQuery must be used inside <DashboardProvider>");
  return value;
}
