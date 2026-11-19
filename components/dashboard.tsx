"use client";

import { ArrowDown } from "lucide-react";
import { DashboardProvider, scrollToSection, useDashboard } from "@/components/dashboard-context";
import { TopNav } from "@/components/top-nav";
import { FiltersBar } from "@/components/filters-bar";
import { AttentionStrip, DriverLeadersPanel, KpiSection, OperationsRail, RoutePerformancePanel, TrendPanel } from "@/components/overview-panels";
import { AnalysisSection } from "@/components/analysis-section";
import { ShipmentsTable } from "@/components/shipments-table";
import { DashboardDialogs } from "@/components/dashboard-dialogs";
import { LineAlerts, LineLogo } from "@/components/line-alerts";
import { ChatPanel } from "@/components/chat-panel";

// Static page header, hoisted so it is not rebuilt when filters change.
const pageHeader = <div className="page-header">
  <div>
    <span className="tag"><span /> ข้อมูลจำลอง · ไตรมาส 1 / 2569</span>
    <h1>ภาพรวมการขนส่ง</h1>
    <p>ติดตามความตรงเวลา ค่าใช้จ่าย และจุดที่ควรตรวจต่อในแต่ละเส้นทาง</p>
  </div>
  <a href="#alerts" className="hero-connection" onClick={event => { event.preventDefault(); scrollToSection("alerts"); }}>
    <LineLogo size={32} /><span><b>แจ้งเตือนผ่าน LINE OA</b><small>เชื่อมต่อแล้ว · จำลอง</small></span><ArrowDown size={16} aria-hidden />
  </a>
</div>;

function AlertsSection() {
  const { state: { filters }, actions } = useDashboard();
  return <LineAlerts filters={filters} onViewRoute={actions.inspectRoute} />;
}

function AssistantLauncher() {
  const { state: { filters } } = useDashboard();
  return <ChatPanel filters={filters} />;
}

function Footer() {
  const { actions } = useDashboard();
  return <footer className="footer"><span>RouteLens · ชุดข้อมูลจำลอง</span><button className="text-link" onClick={actions.openMethod}>ดูนิยาม KPI</button></footer>;
}

export function Dashboard() {
  return <DashboardProvider>
    <div className="app-shell">
      <TopNav />
      <main id="overview" className="main">
        {pageHeader}
        <FiltersBar />
        <KpiSection />
        <AttentionStrip />
        <div className="executive-grid">
          <div className="executive-main">
            <TrendPanel />
            <div className="executive-details"><DriverLeadersPanel /><RoutePerformancePanel /></div>
          </div>
          <OperationsRail />
        </div>
        <AnalysisSection />
        <ShipmentsTable />
        <AlertsSection />
        <Footer />
      </main>
    </div>
    <AssistantLauncher />
    <DashboardDialogs />
  </DashboardProvider>;
}
