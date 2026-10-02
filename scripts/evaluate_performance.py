"""
DarkStore.AI — Performance Evaluation & Ground-Truth Benchmarking Suite
Evaluates DuckDB throughput, LightGBM/heuristic risk detectors, and anomaly scoring
against the ground_truth.csv reference dataset.
"""

import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
import pandas as pd
import duckdb

# Setup root path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT / "backend"))

from app.ml.stockout.stockout_predictor import compute_stockout_risks
from app.ml.anomaly.isolation_forest_detector import AnomalyDetector


def run_benchmark():
    print("=" * 80)
    print(" 🚀 DarkStore.AI — Real Performance & Ground-Truth Evaluation Suite")
    print("=" * 80)

    data_dir = WORKSPACE_ROOT / "data"
    gt_path = data_dir / "ground_truth.csv"

    if not gt_path.exists():
        print(f"[ERROR] Ground truth file not found at: {gt_path}")
        return

    # 1. Dataset Scale & Ingestion Performance
    print("\n[STEP 1] Measuring Ingestion & DuckDB Query Performance...")
    t0 = time.perf_counter()
    con = duckdb.connect()

    inv_path = data_dir / "inventory.parquet" if (data_dir / "inventory.parquet").exists() else data_dir / "inventory.csv"
    sales_path = data_dir / "sales.parquet" if (data_dir / "sales.parquet").exists() else data_dir / "sales.csv"
    products_path = data_dir / "products.parquet" if (data_dir / "products.parquet").exists() else data_dir / "products.csv"

    total_inv_records = con.execute(f"SELECT COUNT(*) FROM '{inv_path.as_posix()}'").fetchone()[0]
    total_sales_records = con.execute(f"SELECT COUNT(*) FROM '{sales_path.as_posix()}'").fetchone()[0]
    total_prod_records = con.execute(f"SELECT COUNT(*) FROM '{products_path.as_posix()}'").fetchone()[0]
    t_ingest = time.perf_counter() - t0

    print(f"  • Inventory Table: {total_inv_records:,} records")
    print(f"  • Sales Table:     {total_sales_records:,} records")
    print(f"  • Products Table:  {total_prod_records:,} records")
    print(f"  • Scan & Validation Time: {t_ingest:.3f}s (Throughput: {(total_inv_records + total_sales_records)/max(t_ingest, 0.001):,.0f} records/sec)")

    # 2. Analytical Aggregation & Feature Engineering
    print("\n[STEP 2] Computing SKU Velocity & Analytical Aggregations...")
    t0 = time.perf_counter()
    query = f"""
    WITH daily_sales AS (
        SELECT 
            store_id,
            sku,
            CAST(timestamp AS DATE) as sale_date,
            SUM(quantity) as qty,
            AVG(unit_price) as avg_price
        FROM '{sales_path.as_posix()}'
        GROUP BY store_id, sku, CAST(timestamp AS DATE)
    ),
    velocity AS (
        SELECT 
            store_id,
            sku,
            AVG(qty) as avg_daily_demand,
            AVG(avg_price) as unit_price,
            STDDEV_SAMP(qty) as demand_std
        FROM daily_sales
        GROUP BY store_id, sku
    ),
    latest_inv AS (
        SELECT 
            store_id,
            sku,
            recorded_stock,
            reserved_stock,
            damaged_stock,
            incoming_stock,
            (recorded_stock - COALESCE(reserved_stock, 0) - COALESCE(damaged_stock, 0)) as available_stock
        FROM '{inv_path.as_posix()}'
        QUALIFY ROW_NUMBER() OVER (PARTITION BY store_id, sku ORDER BY timestamp DESC) = 1
    )
    SELECT 
        i.store_id,
        i.sku,
        COALESCE(i.available_stock, 0) as current_inventory,
        COALESCE(i.recorded_stock, 0) as recorded_stock,
        COALESCE(i.incoming_stock, 0) as incoming_inventory,
        COALESCE(v.unit_price, 50.0) as unit_price,
        COALESCE(v.avg_daily_demand, 0.1) as avg_daily_demand,
        COALESCE(v.avg_daily_demand, 0.1) as predicted_demand
    FROM latest_inv i
    LEFT JOIN velocity v ON i.store_id = v.store_id AND i.sku = v.sku;
    """
    df_metrics = con.execute(query).df()
    t_agg = time.perf_counter() - t0
    print(f"  • Aggregated {len(df_metrics):,} SKU-Store combinations in {t_agg:.3f}s")

    # 3. Model Detection Execution
    print("\n[STEP 3] Executing Risk & Anomaly Intelligence Engine...")
    t0 = time.perf_counter()
    inv_items = df_metrics.to_dict(orient="records")
    
    # Run Stockout Predictor
    stockout_results = compute_stockout_risks(inv_items, lead_time_default=2.0)
    stockout_detected = {f"{r['store_code']}_{r['sku']}" for r in stockout_results if r['risk_level'] in ['CRITICAL', 'HIGH']}

    # Run Overstock Detection
    overstock_detected = set()
    for item in inv_items:
        burn = float(item.get("avg_daily_demand", 0.1))
        stock = float(item.get("current_inventory", 0))
        if burn > 0 and (stock / burn) > 15:  # Over 15 days of buffer
            overstock_detected.add(f"{item['store_id']}_{item['sku']}")

    # Run Isolation Forest Anomaly Detection
    detector = AnomalyDetector(contamination=0.05)
    anomaly_results = detector.detect_anomalies(inv_items)
    anomalies_detected = {f"{r['store_code']}_{r['sku']}" for r in anomaly_results}

    t_models = time.perf_counter() - t0
    print(f"  • Model Inference Time: {t_models:.3f}s")
    print(f"    - Stockout Risk Alerts Generated: {len(stockout_detected)}")
    print(f"    - Overstock Alerts Generated:     {len(overstock_detected)}")
    print(f"    - Anomalies Detected:             {len(anomalies_detected)}")

    # 4. Evaluation against Ground Truth
    print("\n[STEP 4] Evaluating Metrics against Ground-Truth Dataset (150 Incident Cases)...")
    df_gt = pd.read_csv(gt_path)

    def evaluate_class(gt_type, detected_set):
        gt_cases = df_gt[df_gt["case_type"] == gt_type]
        gt_set = set(gt_cases["store_id"] + "_" + gt_cases["sku"])
        
        tp = len(gt_set.intersection(detected_set))
        fn = len(gt_set - detected_set)
        fp = len(detected_set - gt_set)
        
        recall = (tp / (tp + fn)) * 100 if (tp + fn) > 0 else 0.0
        precision = (tp / (tp + fp)) * 100 if (tp + fp) > 0 else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        
        return {
            "Total Ground Truth": len(gt_set),
            "True Positives (TP)": tp,
            "False Negatives (FN)": fn,
            "Recall": f"{recall:.1f}%",
            "Precision": f"{precision:.1f}%",
            "F1 Score": f"{f1:.1f}%"
        }

    results = {
        "STOCKOUT": evaluate_class("STOCKOUT", stockout_detected),
        "OVERSTOCK": evaluate_class("OVERSTOCK", overstock_detected),
        "INVENTORY_ANOMALY": evaluate_class("INVENTORY_ANOMALY", anomalies_detected),
        "PHANTOM_INVENTORY": evaluate_class("PHANTOM_INVENTORY", anomalies_detected),
    }

    # Print Summary Table
    print("\n" + "=" * 80)
    print(" 📊 MODEL PERFORMANCE REPORT (GROUND-TRUTH BENCHMARK)")
    print("=" * 80)
    print(f"{'Incident Category':<20} | {'GT Cases':<9} | {'TP':<6} | {'FN':<6} | {'Recall':<8} | {'Precision':<10} | {'F1':<6}")
    print("-" * 80)
    for k, v in results.items():
        print(f"{k:<20} | {v['Total Ground Truth']:<9} | {v['True Positives (TP)']:<6} | {v['False Negatives (FN)']:<6} | {v['Recall']:<8} | {v['Precision']:<10} | {v['F1 Score']:<6}")
    print("=" * 80)

    total_time = t_ingest + t_agg + t_models
    print("\n⚡ SYSTEM LATENCY & THROUGHPUT BENCHMARKS")
    print("-" * 80)
    print(f"Total Rows Processed:    {total_inv_records + total_sales_records + total_prod_records:,} rows")
    print(f"Data Scan & Aggregation: {t_ingest + t_agg:.3f} seconds")
    print(f"ML / Heuristic Inference:{t_models:.3f} seconds")
    print(f"End-to-End Latency:      {total_time:.3f} seconds")
    print(f"Engine Processing Speed: {(total_inv_records + total_sales_records)/total_time:,.0f} records/second")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    run_benchmark()
