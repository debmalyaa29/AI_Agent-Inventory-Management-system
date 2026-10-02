"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Database, 
  Plus, 
  FileSpreadsheet, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Layers,
  UploadCloud,
  Download
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";

export default function DatasetsListPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchDatasets = () => {
    api.getDatasets()
      .then((data) => {
        setDatasets(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleLoadSample = async () => {
    setSeeding(true);
    try {
      const sample = await api.createSampleDataset();
      if (sample?.id) {
        localStorage.setItem("active_dataset_id", sample.id);
        window.dispatchEvent(new Event("datasetChanged"));
        window.location.href = `/dashboard`;
      } else {
        fetchDatasets();
      }
    } catch (e) {
      console.error("Failed to load sample dataset:", e);
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facility Data Sources"
        description="Dark store dataset connections, DuckDB schemas, data quality metrics, and ML model synchronization."
        actions={
          <div className="flex items-center gap-2">
            <a
              href="/darkstore_inventory_demo.csv"
              download="darkstore_inventory_demo.csv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Demo CSV</span>
            </a>
            <Link href="/datasets/new">
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                New Facility Dataset
              </Button>
            </Link>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : datasets.length === 0 ? (
        <EmptyState
          icon={<Database className="h-10 w-10 text-slate-400" />}
          title="No Datasets Connected"
          description="Upload CSV or Parquet files from your ERP or WMS to initialize decision intelligence, or download our ready-to-use demo dataset."
          action={
            <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-2">
              <Link href="/datasets/new">
                <Button variant="primary" size="sm">
                  Create First Dataset
                </Button>
              </Link>
              <a href="/darkstore_inventory_demo.csv" download="darkstore_inventory_demo.csv">
                <Button variant="outline" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />}>
                  Download Demo CSV
                </Button>
              </a>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLoadSample}
                disabled={seeding}
                leftIcon={<Sparkles className="h-3.5 w-3.5 text-blue-600" />}
              >
                {seeding ? "Loading Store..." : "1-Click Load Sample Store"}
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {datasets.map((ds) => (
            <Card
              key={ds.id}
              className="p-5 flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base">{ds.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{ds.description || "Quick-commerce dark store"}</p>
                  </div>
                  <Badge variant={ds.status === "analyzed" ? "success" : "info"}>
                    {ds.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center my-4 py-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Quality Score</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {ds.quality_score ? `${ds.quality_score}/100` : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Source Files</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {ds.files?.length || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Total Rows</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {Object.values(ds.row_counts || {}).reduce((a: any, b: any) => a + Number(b), 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Capabilities Detected:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(ds.capabilities || ["Inventory", "Demand Forecasting", "Replenishment"]).map(
                      (c: string, ci: number) => (
                        <span
                          key={ci}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700"
                        >
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>{c.replace(/_/g, " ")}</span>
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                <Link
                  href={`/datasets/${ds.id}/upload`}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Upload Files
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  onClick={() => {
                    localStorage.setItem("active_dataset_id", ds.id);
                    window.dispatchEvent(new Event("datasetChanged"));
                    window.location.href = `/dashboard`;
                  }}
                >
                  Select Facility
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
