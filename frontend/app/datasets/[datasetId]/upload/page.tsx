"use client";

import React, { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  UploadCloud, 
  FileText, 
  ArrowRight, 
  Trash2, 
  AlertCircle,
  FileSpreadsheet,
  Download,
  Sparkles,
  Zap
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function DatasetUploadPage() {
  const params = useParams();
  const router = useRouter();
  const datasetId = params?.datasetId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const stageSampleDataset = async (filename: string, displayName: string) => {
    try {
      setUploading(true);
      const res = await fetch(`/sample_datasets/${filename}`);
      if (!res.ok) throw new Error("Could not fetch test dataset file");
      const blob = await res.blob();
      const sampleFile = new File([blob], filename, { type: "text/csv" });
      setFiles((prev) => [...prev.filter((f) => f.name !== filename), sampleFile]);
      setErrorMsg("");
    } catch (err: any) {
      setErrorMsg(`Failed to load ${displayName}: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndProceed = async () => {
    if (files.length === 0) {
      setErrorMsg("Please select at least one CSV, XLSX, or Parquet file.");
      return;
    }
    setUploading(true);
    setErrorMsg("");
    try {
      await api.uploadFiles(datasetId, files);
      router.push(`/datasets/${datasetId}/mapping`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload files.");
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <PageHeader
        title="Upload Facility Datasets"
        description="Ingest CSV, Excel, or Parquet files from your WMS, ERP, or spreadsheet exports."
        breadcrumbs={[
          { label: "Data Sources", href: "/datasets" },
          { label: "File Ingestion" },
        ]}
      />

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1-Click Ready Test Datasets Box */}
      <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/80 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>Ready-to-Use Test Datasets</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Test stockouts, negative anomalies, phantom discrepancies, and MOQ replenishment with 1 click.
            </p>
          </div>
          <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full w-fit">
            Ready in /test_datasets/
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
            <div>
              <div className="text-xs font-semibold text-slate-800">Quick-Commerce (50 SKUs)</div>
              <div className="text-[10px] text-slate-500">Beverages, Dairy, Produce, Bakery</div>
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href="/sample_datasets/quick_commerce_darkstore_inventory.csv"
                download="quick_commerce_darkstore_inventory.csv"
                title="Download CSV"
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={() => stageSampleDataset("quick_commerce_darkstore_inventory.csv", "Quick-Commerce")}
                className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 transition shadow-xs cursor-pointer"
              >
                <Zap className="h-3 w-3" />
                <span>Stage File</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
            <div>
              <div className="text-xs font-semibold text-slate-800">Pharmacy Care (35 SKUs)</div>
              <div className="text-[10px] text-slate-500">OTC, First Aid, Supplements, Devices</div>
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href="/sample_datasets/pharmacy_quick_care_35_skus.csv"
                download="pharmacy_quick_care_35_skus.csv"
                title="Download CSV"
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={() => stageSampleDataset("pharmacy_quick_care_35_skus.csv", "Pharmacy Care")}
                className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 transition shadow-xs cursor-pointer"
              >
                <Zap className="h-3 w-3" />
                <span>Stage File</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-10 text-center bg-white hover:bg-blue-50/20 transition-colors"
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".csv,.xlsx,.xls,.parquet"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="h-12 w-12 mx-auto rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
          <UploadCloud className="h-6 w-6" />
        </div>
        <div className="text-sm font-semibold text-slate-900">
          Click to upload or drag and drop files here
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Supports CSV, XLSX, Parquet (e.g. inventory.csv, sales.csv, products.csv, suppliers.csv)
        </div>
      </div>

      {/* Staged Files List */}
      {files.length > 0 && (
        <Card className="p-4 space-y-2.5">
          <div className="text-xs font-semibold text-slate-700">
            Files Staged for Ingestion ({files.length})
          </div>
          <div className="space-y-1.5">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-900">{file.name}</span>
                  <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="secondary"
          onClick={() => router.push("/datasets")}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={files.length === 0}
          isLoading={uploading}
          rightIcon={<ArrowRight className="h-4 w-4" />}
          onClick={handleUploadAndProceed}
        >
          Confirm & Profile Schema
        </Button>
      </div>
    </div>
  );
}
