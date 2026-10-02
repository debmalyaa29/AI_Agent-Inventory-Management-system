import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
import pandas as pd
from app.ml.stockout.stockout_predictor import compute_stockout_risks
from app.ml.anomaly.isolation_forest_detector import AnomalyDetector
from app.optimization.replenishment import compute_replenishment
from app.optimization.priority import rank_action_queue


def test_scenario_stress_dataset():
    csv_path = backend_dir.parent / "data" / "test_scenario" / "unified_inventory_stress_test.csv"
    if not csv_path.exists():
        csv_path = Path("c:/build_with_ai/data/test_scenario/unified_inventory_stress_test.csv")
    assert csv_path.exists(), f"Test dataset not found at {csv_path}"

    df = pd.read_csv(csv_path)
    assert len(df) == 20

    # Build inventory rows
    items = []
    for _, r in df.iterrows():
        items.append({
            "sku": r["item_code"],
            "product_name": r["product_name"],
            "current_inventory": float(r["available_qty"]),
            "expected_inventory": float(r["expected_inventory"]),
            "avg_daily_demand": float(r["daily_demand"]),
            "lead_time_days": float(r["delivery_days"]),
            "moq": int(r["moq"]),
            "pack_size": int(r["pack_size"]),
            "unit_price": float(r["retail_price"]),
            "cost_price": float(r["cost_price"]),
            "supplier_name": r["supplier_name"]
        })

    # 1. Stockout risk verification
    stockouts = compute_stockout_risks(items)
    sku_to_stockout = {s["sku"]: s for s in stockouts}

    # Verify critical items
    assert sku_to_stockout["ENERGY-SHOT-60ML"]["risk_level"] == "CRITICAL"
    assert sku_to_stockout["AVOCADO-HASS-2PK"]["risk_level"] == "CRITICAL"
    assert sku_to_stockout["ORGANIC-EGGS-6PK"]["risk_level"] == "CRITICAL"
    assert sku_to_stockout["BREAD-BRIOCHE"]["risk_level"] == "CRITICAL"

    # 2. Anomaly detection verification
    detector = AnomalyDetector()
    anomalies = detector.detect_anomalies(items)
    anomaly_types = {a["sku"]: a["anomaly_type"] for a in anomalies}

    # Check negative inventory
    assert "GREEK-YOGURT-ZERO" in anomaly_types
    assert anomaly_types["GREEK-YOGURT-ZERO"] == "NEGATIVE_DRIFT"

    # Check phantom inventory
    assert "PREMIUM-OLIVE-OIL-500ML" in anomaly_types
    assert anomaly_types["PREMIUM-OLIVE-OIL-500ML"] == "PHANTOM_INVENTORY"

    assert "MATCHA-TEA-POWDER" in anomaly_types
    assert anomaly_types["MATCHA-TEA-POWDER"] == "PHANTOM_INVENTORY"

    # 3. Replenishment calculation verification
    recs = []
    for it in items:
        rec = compute_replenishment(
            sku=it["sku"],
            product_name=it["product_name"],
            current_inventory=it["current_inventory"],
            daily_forecast=it["avg_daily_demand"],
            lead_time_days=it["lead_time_days"],
            min_order_quantity=it["moq"],
            pack_size=it["pack_size"]
        )
        recs.append(rec.model_dump())

    sku_to_rec = {r["sku"]: r for r in recs}

    # Severe overstock items should have 0 recommended order
    assert sku_to_rec["BULK-DETERGENT-5KG"]["recommended_order"] == 0.0
    assert sku_to_rec["FANCY-PARTY-STREAMERS"]["recommended_order"] == 0.0

    # Low stock items must have recommended order rounded to pack size / MOQ
    energy_rec = sku_to_rec["ENERGY-SHOT-60ML"]
    assert energy_rec["recommended_order"] >= 24
    assert energy_rec["recommended_order"] % 12 == 0
    assert energy_rec["priority_level"] == "CRITICAL"

    # Action queue ranking
    action_queue = rank_action_queue(recommendations=recs, anomalies=anomalies)
    assert len(action_queue) > 0
    # Top action should be CRITICAL priority
    assert action_queue[0]["priority_level"] == "CRITICAL"
