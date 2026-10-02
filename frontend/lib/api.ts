const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") || "demo-token" : "demo-token";

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = "API request failed";
    try {
      const err = await res.json();
      errorDetail = err.detail || JSON.stringify(err);
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  // Health
  getHealth: () => fetchApi("/health"),

  // Auth
  getProfile: () => fetchApi("/auth/me"),

  // Datasets
  getDatasets: () => fetchApi("/datasets"),
  getDataset: (id: string) => fetchApi(`/datasets/${id}`),
  createDataset: (name: string, description?: string) =>
    fetchApi("/datasets", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),
  createSampleDataset: () =>
    fetchApi("/datasets/sample", {
      method: "POST",
    }),

  // File Upload
  uploadFiles: (datasetId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    return fetchApi(`/datasets/${datasetId}/upload`, {
      method: "POST",
      body: formData,
    });
  },

  // Schema Mapping
  getMappings: (datasetId: string) => fetchApi(`/datasets/${datasetId}/mapping`),
  confirmMappings: (datasetId: string, mappings: any[]) =>
    fetchApi(`/datasets/${datasetId}/mapping/confirm`, {
      method: "POST",
      body: JSON.stringify({ mappings }),
    }),

  // Pipeline Analysis
  triggerAnalysis: (datasetId: string, confirmedMappings?: any[]) =>
    fetchApi(`/datasets/${datasetId}/analyze`, {
      method: "POST",
      body: JSON.stringify({ confirmed_mappings: confirmedMappings }),
    }),

  // Analytics
  getInventory: (datasetId: string) => fetchApi(`/datasets/${datasetId}/inventory`),
  getProductDetail: (datasetId: string, sku: string) => fetchApi(`/datasets/${datasetId}/products/${sku}`),
  getForecasts: (datasetId: string, horizon: string = "24h") =>
    fetchApi(`/datasets/${datasetId}/forecasts?horizon=${horizon}`),
  getStockoutRisks: (datasetId: string) => fetchApi(`/datasets/${datasetId}/stockout-risks`),
  getAnomalies: (datasetId: string) => fetchApi(`/datasets/${datasetId}/anomalies`),
  getReplenishment: (datasetId: string) => fetchApi(`/datasets/${datasetId}/replenishment`),
  getActionQueue: (datasetId: string) => fetchApi(`/datasets/${datasetId}/action-queue`),

  // Decision & Audit
  decideRecommendation: (datasetId: string, recId: string, action: string, approvedQuantity?: number, reason?: string) =>
    fetchApi(`/recommendations/${recId}/decide?dataset_id=${datasetId}`, {
      method: "POST",
      body: JSON.stringify({ action, approved_quantity: approvedQuantity, reason }),
    }),
  getActionHistory: (datasetId: string) => fetchApi(`/datasets/${datasetId}/action-history`),

  // AI Copilot
  chatWithCopilot: (datasetId: string, message: string, history: any[] = []) =>
    fetchApi("/agent/chat", {
      method: "POST",
      body: JSON.stringify({
        dataset_id: datasetId,
        message,
        conversation_history: history,
      }),
    }),
};
