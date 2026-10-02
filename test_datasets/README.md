# DarkStore.AI — Test Datasets Guide

This folder contains pre-configured, realistic test datasets crafted specifically to test and demonstrate all features of the **DarkStore.AI** Inventory Decision Engine.

---

## 📁 Available Test Datasets

### 1. `quick_commerce_darkstore_inventory.csv` ⭐ (Recommended for Quick Testing)
- **Format**: All-in-One Unified Inventory CSV
- **Number of SKUs**: 50 products
- **Industry**: Quick-Commerce / Dark Store (FMCG, Fresh, Dairy, Beverages, Personal Care, Household)
- **Features Tested**:
  - **Critical Stockouts & Out-of-Stock**: e.g., `ENERGY-SHOT-60ML` (3 units left vs 28/day demand), `ORGANIC-EGGS-6PK` (0 stock).
  - **Negative Inventory Anomalies**: e.g., `GREEK-YOGURT-ZERO` (-2 units recorded).
  - **Phantom Inventory & Shrinkage**: e.g., `PREMIUM-OLIVE-OIL-500ML` (+30 unrecorded phantom stock), `MATCHA-TEA-POWDER` (-18 missing shrinkage).
  - **Overstock & Trapped Capital**: e.g., `BULK-DETERGENT-5KG` (283 days of supply), `FANCY-PARTY-STREAMERS` (1,200 days of supply).
  - **Supplier Constraints (MOQ & Pack Size)**: e.g., `MINERAL-WATER-1L` (pack size 24, MOQ 48).
  - **Fast Perishables**: Fresh milk, bread, spinach with 1-day delivery cycle.

### 2. `pharmacy_quick_care_35_skus.csv`
- **Format**: All-in-One Unified Inventory CSV
- **Number of SKUs**: 35 products
- **Industry**: Quick Pharmacy / Healthcare Fulfillment Hub (OTC medicines, First Aid, Supplements, Diagnostics, Baby Care)
- **Features Tested**:
  - High burn-rate seasonal medicines (Paracetamol, Cough Syrup).
  - Negative inventory and shrinkage on high-value test strips.
  - Bulky diagnostics and equipment with longer lead times.

### 3. `multi_table_bundle/` (Multi-Table Relational Ingestion)
- **Format**: 4 separate relational CSV tables
- **Files**:
  - `inventory.csv`: Real-time stock levels, book inventory, and burn rate.
  - `products.csv`: Product catalog metadata, categories, retail price, cost price.
  - `suppliers.csv`: Vendor names, lead times, MOQ, and pack size multipliers.
  - `sales.csv`: Granular order transaction lines with timestamps.
- **Purpose**: Tests multi-file drag-and-drop, schema mapping auto-detection across tables, and relational joins in DuckDB.

---

## 🚀 How to Test on the Website

### Method A: Single-File Upload (Fastest)
1. Go to **Datasets** &rarr; **Add New Dataset** (or `/datasets/new`).
2. Enter a name (e.g. `Downtown Dark Store #104`) and click **Create Dataset**.
3. On the upload page, drag & drop `test_datasets/quick_commerce_darkstore_inventory.csv`.
4. Click **Upload & Continue to Schema Mapping**.
5. The system will auto-detect all columns with high confidence &rarr; click **Save Mapping & Run Analysis**.
6. Watch the DuckDB pipeline compute features, stockout risks, and replenishment orders!

### Method B: Multi-File Bundle Upload
1. Create a new dataset.
2. Select all 4 CSVs from `test_datasets/multi_table_bundle/` (`inventory.csv`, `products.csv`, `suppliers.csv`, `sales.csv`).
3. Drag & drop all 4 files simultaneously into the upload zone.
4. Click **Upload & Continue**.
5. Review each table's mapped schema and run the pipeline.

---

## 🔍 Key Dashboard Features to Check
- **Overview Dashboard**: Check the 4 KPI cards (Total Inventory, Inventory Valuation, Critical Stockouts, Pending Reorders).
- **Stockout Risks**: Check the Risk Distribution chart (Critical, High, Medium, Low).
- **Recommendations**: Verify how MOQ and Pack Size round up recommended order quantities.
- **Anomalies Page**: Verify detection of negative inventory and phantom discrepancies.
- **AI Copilot**: Ask questions like:
  - *"Which items are at critical risk of stocking out today?"*
  - *"What are the worst overstock items trapping capital?"*
  - *"Generate reorder purchase orders for Metro Beverage Bottlers."*
