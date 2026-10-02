"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Boxes, 
  ShoppingCart, 
  AlertTriangle, 
  TrendingUp, 
  ShieldAlert, 
  DollarSign, 
  ArrowRight,
  Sparkles,
  Bot,
  Activity,
  Layers,
  ArrowUpRight,
  PackageCheck,
  CheckCircle2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  CartesianGrid
} from "recharts";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/EmptyState";
import { useGsapContext, getGSAP } from "@/lib/gsap";

const RISK_COLORS = ["#dc2626", "#ea580c", "#d97706", "#059669"];

export default function OverviewDashboardPage() {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Subtle dashboard entrance animation (Priority: Productivity)
  useGsapContext((ctx) => {
    const { gsap } = getGSAP();
    gsap.from(".dash-header", { opacity: 0, y: -10, duration: 0.35, ease: "power2.out" });
    gsap.from(".kpi-stat-card", { opacity: 0, y: 15, duration: 0.4, stagger: 0.06, ease: "power2.out" });
    gsap.from(".dash-chart-section", { opacity: 0, y: 15, duration: 0.45, delay: 0.15, ease: "power2.out" });
  }, containerRef, [containerRef]);
  const [activeDatasetId, setActiveDatasetId] = useState<string>("");
  const [activeDatasetName, setActiveDatasetName] = useState<string>("");
  const [inventoryData, setInventoryData] = useState<any>({ items: [], total_skus: 0, total_inventory_value: 0 });
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [stockoutRisks, setStockoutRisks] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = (dsId: string) => {
    if (!dsId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.getInventory(dsId).catch(() => ({ items: [], total_skus: 0, total_inventory_value: 0 })),
      api.getReplenishment(dsId).catch(() => []),
      api.getStockoutRisks(dsId).catch(() => []),
      api.getAnomalies(dsId).catch(() => []),
      api.getDataset(dsId).catch(() => null)
    ]).then(([inv, recs, risks, anoms, ds]) => {
      setInventoryData(inv || { items: [], total_skus: 0, total_inventory_value: 0 });
      setRecommendations(Array.isArray(recs) ? recs : []);
      setStockoutRisks(Array.isArray(risks) ? risks : []);
      setAnomalies(Array.isArray(anoms) ? anoms : []);
      if (ds && ds.name) setActiveDatasetName(ds.name);
      setLoading(false);
    });
  };

  useEffect(() => {
    const dsId = localStorage.getItem("active_dataset_id");
    api.getDatasets().then((list) => {
      if (list && list.length > 0) {
        const match = list.find((d: any) => d.id === dsId);
        const selected = match || list[0];
        setActiveDatasetId(selected.id);
        setActiveDatasetName(selected.name);
        localStorage.setItem("active_dataset_id", selected.id);
        loadAll(selected.id);
      } else {
        setActiveDatasetId("");
        setActiveDatasetName("");
        localStorage.removeItem("active_dataset_id");
        setLoading(false);
      }
    }).catch(() => {
      setActiveDatasetId("");
      localStorage.removeItem("active_dataset_id");
      setLoading(false);
    });

    const handleDatasetChanged = () => {
      const updated = localStorage.getItem("active_dataset_id") || "";
      setActiveDatasetId(updated);
      loadAll(updated);
    };

    window.addEventListener("datasetChanged", handleDatasetChanged);
    return () => window.removeEventListener("datasetChanged", handleDatasetChanged);
  }, []);

  const criticalStockouts = stockoutRisks.filter((r) => r.risk_level === "CRITICAL").length;
  const highStockouts = stockoutRisks.filter((r) => r.risk_level === "HIGH").length;
  const pendingOrders = recommendations.filter((r) => r.recommended_order > 0).length;

  // Chart data: Top 6 Replenishment Products
  const topReplenishmentData = recommendations
    .filter((r) => r.recommended_order > 0)
    .slice(0, 6)
    .map((r) => ({
      name: r.product_name?.length > 14 ? r.product_name.slice(0, 14) + "..." : r.product_name,
      orderQty: r.recommended_order,
      stock: r.current_stock,
      demand: r.predicted_demand
    }));

  // Risk Distribution Data
  const riskDistData = [
    { name: "Critical", value: criticalStockouts },
    { name: "High", value: highStockouts },
    { name: "Medium", value: stockoutRisks.filter((r) => r.risk_level === "MEDIUM").length },
    { name: "Low", value: stockoutRisks.filter((r) => r.risk_level === "LOW").length },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-slate-200 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  const handleLoadSample = async () => {
    setLoading(true);
    try {
      const sample = await api.createSampleDataset();
      if (sample?.id) {
        setActiveDatasetId(sample.id);
        setActiveDatasetName(sample.name);
        localStorage.setItem("active_dataset_id", sample.id);
        loadAll(sample.id);
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error("Failed to load sample dataset:", e);
      setLoading(false);
    }
  };

  if (!activeDatasetId) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4">
        <div className="h-16 w-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
          <Boxes className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Your Store Workspace is Ready</h2>
        <p className="text-xs text-slate-500 mt-2 mb-6 max-w-sm mx-auto leading-relaxed">
          You are signed in to your personal store workspace. Connect your dark store inventory CSV or import sample quick-commerce data to explore.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/datasets/new">
            <Button variant="primary" leftIcon={<Sparkles className="h-4 w-4" />}>
              Connect Your Store CSV
            </Button>
          </Link>
          <Button variant="outline" onClick={handleLoadSample} leftIcon={<Layers className="h-4 w-4" />}>
            Load Sample Store Data
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Header */}
      <div className="dash-header">
        <PageHeader
          title="Inventory Decision Dashboard"
          description={`Real-time quick-commerce operations, stock health, and replenishment intelligence for ${activeDatasetName || "Active Facility"}.`}
          badge={
            <Badge variant="info" size="md">
              Live Facility
            </Badge>
          }
          actions={
            <>
              <Link href={`/datasets/${activeDatasetId}/recommendations`}>
                <Button
                  variant="primary"
                  leftIcon={<ShoppingCart className="h-4 w-4" />}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Review Reorders ({pendingOrders})
                </Button>
              </Link>
              <Link href="/copilot">
                <Button
                  variant="secondary"
                  leftIcon={<Bot className="h-4 w-4 text-blue-600" />}
                >
                  Ask Copilot
                </Button>
              </Link>
            </>
          }
        />
      </div>

      {/* 4 KPI Cards (TasteSkill / 21st standards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-stat-card">
          <StatCard
            label="Total Inventory"
            value={(inventoryData.total_inventory_units || 0).toLocaleString()}
            supportingText={`${inventoryData.total_skus || 0} active SKUs in catalog`}
            trend={{ value: "Stable", isNeutral: true }}
            icon={<Boxes className="h-4 w-4" />}
          />
        </div>

        <div className="kpi-stat-card">
          <StatCard
            label="Inventory Valuation"
            value={`$${(inventoryData.total_inventory_value || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            supportingText="Active asset value"
            trend={{ value: "+2.4% vs last cycle", isPositive: true }}
            icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
            variant="success"
          />
        </div>

        <div className="kpi-stat-card">
          <StatCard
            label="Critical Depletions"
            value={criticalStockouts}
            supportingText="Stockouts projected in < 4h"
            trend={{
              value: criticalStockouts > 0 ? "Immediate Action" : "Healthy",
              isPositive: criticalStockouts === 0,
            }}
            icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
            variant={criticalStockouts > 0 ? "critical" : "default"}
          />
        </div>

        <div className="kpi-stat-card">
          <StatCard
            label="Pending Purchase Orders"
            value={pendingOrders}
            supportingText="Recommended for approval"
            trend={{ value: `${recommendations.length} total SKUs evaluated`, isNeutral: true }}
            icon={<ShoppingCart className="h-4 w-4 text-blue-600" />}
            variant={pendingOrders > 0 ? "warning" : "default"}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="dash-chart-section grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Top Replenishments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Products Requiring Replenishment</CardTitle>
              <CardDescription>Recommended reorder volume vs currently held physical stock</CardDescription>
            </div>
            <Link
              href={`/datasets/${activeDatasetId}/recommendations`}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View Full Queue</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {topReplenishmentData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  All inventory healthy. No replenishments currently required.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topReplenishmentData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="orderQty"
                      name="Recommended Reorder"
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="stock"
                      name="On-Hand Stock"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Donut Chart: Risk Distribution */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Catalog Stockout Urgency</CardTitle>
            <CardDescription>Risk severity breakdown across active SKUs</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="h-48 w-full flex items-center justify-center">
              {riskDistData.length === 0 ? (
                <div className="text-xs text-slate-400 text-center">
                  No stockout risks detected in catalog.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistData}
                      innerRadius={48}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {riskDistData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600 shrink-0" />
                <span>Critical: {criticalStockouts}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />
                <span>High: {highStockouts}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                <span>Medium: {stockoutRisks.filter((r) => r.risk_level === "MEDIUM").length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
                <span>Low: {stockoutRisks.filter((r) => r.risk_level === "LOW").length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Action Queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <div>
              <CardTitle>Priority Replenishment Queue</CardTitle>
              <CardDescription>AI-ranked recommendations requiring human approval</CardDescription>
            </div>
          </div>
          <Link
            href={`/datasets/${activeDatasetId}/recommendations`}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Full Order Management</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map((r, i) => (
              <div
                key={r.id || i}
                className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge
                      variant={r.priority_level === "CRITICAL" ? "critical" : "warning"}
                    >
                      #{i + 1} {r.priority_level}
                    </Badge>
                    <span className="font-mono text-xs text-slate-500">
                      Stock: {r.current_stock?.toFixed(0)}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">{r.product_name}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.reason}</p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-600">
                    Order: {r.recommended_order?.toFixed(0)} units
                  </span>
                  <Link
                    href={`/datasets/${activeDatasetId}/recommendations`}
                    className="text-slate-700 hover:text-blue-600 font-semibold flex items-center gap-1"
                  >
                    <span>Approve</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
