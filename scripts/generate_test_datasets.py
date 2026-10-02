import os
import csv
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
TEST_DATA_DIR = ROOT_DIR / "test_datasets"
PUBLIC_DATA_DIR = ROOT_DIR / "frontend" / "public" / "sample_datasets"
MULTI_TABLE_DIR = TEST_DATA_DIR / "multi_table_bundle"
MULTI_TABLE_PUB_DIR = PUBLIC_DATA_DIR / "multi_table_bundle"

for d in [TEST_DATA_DIR, PUBLIC_DATA_DIR, MULTI_TABLE_DIR, MULTI_TABLE_PUB_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# --------------------------------------------------------------------------
# 1. DATASET 1: quick_commerce_darkstore_inventory.csv (50 SKUs)
# --------------------------------------------------------------------------
qc_headers = [
    "item_code", "product_name", "category", "store_code", "available_qty",
    "expected_inventory", "daily_demand", "retail_price", "cost_price",
    "delivery_days", "moq", "pack_size", "supplier_name", "test_case_note"
]

qc_rows = [
    # Critical Stockout Risks (high demand, tiny inventory)
    ["ENERGY-SHOT-60ML", "Red Thunder Energy Shot 60ml", "Beverages", "DARKSTORE_01", 3, 3, 28.0, 90.0, 60.0, 2, 24, 12, "Metro Beverage Bottlers", "CRITICAL_LOW_STOCK: 3 units left vs 28/day demand (~2.5h supply)"],
    ["AVOCADO-HASS-2PK", "Hass Avocado 2-Pack Ready to Eat", "Fresh Produce", "DARKSTORE_01", 2, 2, 16.0, 160.0, 110.0, 1, 15, 5, "Fresh Harvest Produce", "CRITICAL_LOW_STOCK: 2 units left vs 16/day demand (~3.0h supply)"],
    ["ALMOND-MILK-1L", "Organic Unsweetened Almond Milk 1L", "Dairy Alternatives", "DARKSTORE_01", 4, 4, 22.0, 195.0, 140.0, 2, 20, 10, "Pure Dairy Express", "CRITICAL_LOW_STOCK: 4 units left vs 22/day demand"],
    ["BREAD-BRIOCHE", "Handcrafted French Brioche Loaf", "Bakery", "DARKSTORE_01", 1, 1, 15.0, 120.0, 75.0, 1, 10, 5, "Artisan Bakery Network", "CRITICAL_LOW_STOCK: 1 unit left vs 15/day demand; imminent stockout"],
    ["BANANAS-ROBUSTA-1KG", "Fresh Robusta Bananas 1kg", "Fresh Produce", "DARKSTORE_01", 5, 5, 34.0, 55.0, 35.0, 1, 30, 10, "Fresh Harvest Produce", "CRITICAL_LOW_STOCK: Fast perishables burn rate"],
    ["ICE-CREAM-VANILLA-500ML", "Artisanal Bourbon Vanilla Ice Cream 500ml", "Frozen & Dairy", "DARKSTORE_01", 2, 2, 14.0, 280.0, 190.0, 2, 12, 6, "Frozen Delights Co", "CRITICAL_LOW_STOCK: High-margin dessert low stock"],
    ["INSTANT-RAMEN-SPICY", "Korean Volcano Spicy Ramen 120g", "Instant Foods", "DARKSTORE_01", 6, 6, 42.0, 75.0, 48.0, 2, 48, 24, "Asian Pantry Imports", "CRITICAL_LOW_STOCK: Viral staple running out rapidly"],

    # Zero Stock / Complete Stockouts
    ["ORGANIC-EGGS-6PK", "Pasture Raised Brown Eggs 6-Pack", "Dairy & Eggs", "DARKSTORE_01", 0, 0, 18.0, 110.0, 80.0, 1, 20, 10, "Pure Dairy Express", "STOCKOUT_ZERO_STOCK: 0 units on hand; lost revenue"],
    ["COFFEE-COLD-BREW-CAN", "Nitro Cold Brew Black Coffee 250ml", "Beverages", "DARKSTORE_01", 0, 0, 25.0, 130.0, 90.0, 2, 24, 12, "Metro Beverage Bottlers", "STOCKOUT_ZERO_STOCK: 0 units available; high velocity morning demand"],
    ["BABY-WIPES-80PK", "Fragrance-Free Pure Water Baby Wipes 80s", "Baby Care", "DARKSTORE_01", 0, 0, 12.0, 185.0, 125.0, 3, 16, 8, "Gentle Care Labs", "STOCKOUT_ZERO_STOCK: Critical household essential out of stock"],

    # Negative Inventory Anomaly
    ["GREEK-YOGURT-ZERO", "Zero Fat Greek Yogurt Pot 150g", "Dairy", "DARKSTORE_01", -2, -2, 14.0, 75.0, 50.0, 1, 20, 10, "Pure Dairy Express", "NEGATIVE_INVENTORY_ANOMALY: -2 units system drift; barcode / scanning error"],
    ["TOFU-FIRM-200G", "Organic Firm High Protein Tofu 200g", "Dairy Alternatives", "DARKSTORE_01", -1, -1, 9.0, 95.0, 65.0, 2, 15, 5, "Green Leaf Organics", "NEGATIVE_INVENTORY_ANOMALY: -1 unit recorded on hand"],

    # Phantom Inventory & Shrinkage Discrepancies
    ["PREMIUM-OLIVE-OIL-500ML", "Extra Virgin Cold Pressed Olive Oil 500ml", "Pantry", "DARKSTORE_01", 45, 15, 3.0, 650.0, 480.0, 3, 12, 6, "Heritage Oils & Vinegars", "PHANTOM_INVENTORY_CRITICAL: Recorded 45 vs expected 15 (+30 ghost units)"],
    ["MATCHA-TEA-POWDER", "Ceremonial Grade Matcha Powder 50g", "Beverages", "DARKSTORE_01", 10, 28, 4.0, 550.0, 380.0, 4, 10, 5, "Zenith Tea Imports", "SHRINKAGE_PHANTOM_INVENTORY: Recorded 10 vs expected 28 (-18 missing)"],
    ["WHEY-PROTEIN-CHOCO-1KG", "Ultra-Filtered Whey Protein Chocolate 1kg", "Nutrition", "DARKSTORE_01", 18, 30, 2.5, 2400.0, 1750.0, 4, 6, 2, "Peak Nutrition Direct", "SHRINKAGE_HIGH_VALUE: High ticket theft or unlogged damage"],
    ["SAFFRON-THREADS-1G", "Kashmiri Mongra Saffron 1g Sealed", "Spices", "DARKSTORE_01", 5, 25, 1.0, 490.0, 340.0, 5, 10, 5, "Himalayan Spice Co", "SHRINKAGE_MICRO_LUXURY: High shrinkage risk SKU"],

    # Overstock & Capital Lockup
    ["BULK-DETERGENT-5KG", "Ultra Clean Laundry Detergent 5kg", "Household", "DARKSTORE_01", 340, 340, 1.2, 520.0, 380.0, 3, 10, 5, "Metro Essentials", "SEVERE_OVERSTOCK: 340 units at 1.2/day = 283 days supply trapped"],
    ["FANCY-PARTY-STREAMERS", "Neon Birthday Party Streamers", "General", "DARKSTORE_01", 480, 480, 0.4, 150.0, 90.0, 5, 20, 10, "Global Novelties", "MASSIVE_OVERSTOCK: 480 units at 0.4/day = 1,200 days supply"],
    ["CHRISTMAS-STRING-LIGHTS", "Warm White Fairy String Lights 10m", "Seasonal", "DARKSTORE_01", 210, 210, 0.2, 350.0, 210.0, 7, 25, 10, "Global Novelties", "DEAD_STOCK: Off-season trapped capital"],
    ["MINERAL-BATH-SALTS-1KG", "Relaxing Himalayan Bath Salts 1kg", "Personal Care", "DARKSTORE_01", 175, 175, 0.5, 420.0, 270.0, 4, 12, 6, "Aroma Wellness", "OVERSTOCK: 350 days of stock holding warehouse bin space"],

    # High Reorder Urgency (Within MOQ & Pack constraints)
    ["COLD-BREW-LATTE", "Nitro Cold Brew Oat Latte 250ml", "Beverages", "DARKSTORE_01", 6, 6, 24.0, 135.0, 95.0, 2, 24, 12, "Metro Beverage Bottlers", "HIGH_REORDER_URGENCY: Low stock with pack size 12 and MOQ 24"],
    ["MINERAL-WATER-1L", "Alkaline Mineral Spring Water 1L", "Beverages", "DARKSTORE_01", 8, 8, 30.0, 45.0, 28.0, 2, 48, 24, "Metro Beverage Bottlers", "HIGH_REORDER_URGENCY: Low stock with pack size 24 and MOQ 48"],
    ["SOURDOUGH-LOAF", "San Francisco Style Artisan Sourdough", "Bakery", "DARKSTORE_01", 4, 4, 14.0, 140.0, 90.0, 1, 10, 5, "Artisan Bakery Network", "HIGH_REORDER_URGENCY: Fresh bread reorder trigger"],
    ["BABY-DIAPERS-M-44PK", "Ultra Soft Air-Through Diapers Size M 44s", "Baby Care", "DARKSTORE_01", 5, 5, 11.0, 799.0, 580.0, 3, 12, 4, "Gentle Care Labs", "HIGH_REORDER_URGENCY: Bulky high-turnover diaper SKU"],
    ["TOMATOES-CHERRY-250G", "Sweet Cherry Vine Tomatoes 250g", "Fresh Produce", "DARKSTORE_01", 7, 7, 22.0, 90.0, 60.0, 1, 20, 10, "Fresh Harvest Produce", "HIGH_REORDER_URGENCY: Fresh perishable produce"],

    # Steady Regular Movers
    ["COKE-500", "Coca-Cola 500ml Bottle", "Beverages", "DARKSTORE_01", 18, 18, 32.0, 40.0, 28.0, 2, 24, 12, "Metro Beverage Bottlers", "BALANCED_REGULAR_REORDER: High steady demand item"],
    ["MILK-1L", "Fresh Whole Homogenized Milk 1L", "Dairy", "DARKSTORE_01", 14, 14, 35.0, 65.0, 50.0, 1, 20, 10, "Pure Dairy Express", "PERISHABLE_FAST_CYCLE: Daily milk delivery cycle"],
    ["CHIPS-150G", "Classic Sea Salt Potato Chips 150g", "Snacks", "DARKSTORE_01", 120, 120, 8.0, 30.0, 20.0, 3, 50, 25, "Crisp Snack Distributors", "HEALTHY_STOCK: Optimal 15 days buffer stock"],
    ["DARK-CHOCOLATE-BAR", "Single Origin 70% Dark Chocolate 80g", "Snacks", "DARKSTORE_01", 65, 65, 5.0, 60.0, 42.0, 3, 50, 25, "Crisp Snack Distributors", "HEALTHY_STOCK: Balanced target safety band"],
    ["SPARKLING-WATER-500ML", "Lime Flavored Sparkling Water 500ml", "Beverages", "DARKSTORE_01", 22, 22, 12.0, 50.0, 32.0, 2, 24, 12, "Metro Beverage Bottlers", "HEALTHY_STOCK: Optimal stock level"],
    ["CROISSANT-2PK", "All-Butter French Croissant 2-Pack", "Bakery", "DARKSTORE_01", 5, 5, 12.0, 85.0, 60.0, 1, 10, 5, "Artisan Bakery Network", "SHORT_SHELF_LIFE_REORDER: Fresh bakery turnover"],
    ["ROASTED-CASHEWS-200G", "Salted Jumbo Roasted Cashews 200g", "Snacks", "DARKSTORE_01", 15, 15, 6.0, 290.0, 210.0, 2, 20, 10, "Crisp Snack Distributors", "NORMAL_REORDER: Standard reorder point trigger"],
    ["GREEN-TEA-BOX", "Organic Japanese Sencha Green Tea 25s", "Beverages", "DARKSTORE_01", 32, 32, 3.5, 180.0, 120.0, 3, 15, 5, "Zenith Tea Imports", "HEALTHY_STOCK: Stable pantry commodity"],

    # Additional Diverse Everyday Quick-Commerce SKUs
    ["BUTTER-SALTED-500G", "Creamery Salted Pure Butter 500g", "Dairy", "DARKSTORE_01", 16, 16, 15.0, 275.0, 215.0, 1, 20, 10, "Pure Dairy Express", "FAST_CYCLE: Daily dairy requirement"],
    ["PANEER-FRESH-200G", "Vacuum Packed Fresh Malai Paneer 200g", "Dairy", "DARKSTORE_01", 11, 11, 26.0, 115.0, 85.0, 1, 25, 5, "Pure Dairy Express", "REORDER_SOON: 0.4 days supply remaining"],
    ["SPINACH-BUNCH", "Hydroponic Baby Spinach 200g", "Fresh Produce", "DARKSTORE_01", 8, 8, 18.0, 60.0, 40.0, 1, 15, 5, "Fresh Harvest Produce", "FRESH_PERISHABLE: 1-day shelf life priority"],
    ["POTATOES-BAG-1KG", "Farm Fresh Washed Table Potatoes 1kg", "Fresh Produce", "DARKSTORE_01", 45, 45, 20.0, 45.0, 28.0, 2, 30, 10, "Fresh Harvest Produce", "STAPLE: High volume staple vegetable"],
    ["ONIONS-RED-1KG", "Crisp Red Cooking Onions 1kg", "Fresh Produce", "DARKSTORE_01", 40, 40, 22.0, 40.0, 25.0, 2, 30, 10, "Fresh Harvest Produce", "STAPLE: Fast cooking base commodity"],
    ["APPLES-ROYAL-GALA-4PK", "Royal Gala Crisp Apples 4-Pack", "Fresh Produce", "DARKSTORE_01", 12, 12, 14.0, 180.0, 125.0, 2, 16, 4, "Fresh Harvest Produce", "HEALTHY_STOCK: Balanced fruit inventory"],
    ["CHOCO-CHIP-COOKIES-150G", "Chunky Double Chocolate Chip Cookies 150g", "Snacks", "DARKSTORE_01", 38, 38, 9.0, 85.0, 55.0, 2, 24, 12, "Artisan Bakery Network", "HEALTHY_STOCK: Snack category regular"],
    ["TORTILLA-CHIPS-200G", "Stone Ground Lime Tortilla Chips 200g", "Snacks", "DARKSTORE_01", 24, 24, 8.5, 110.0, 75.0, 3, 20, 10, "Crisp Snack Distributors", "BALANCED_STOCK: Steady party snack demand"],
    ["SALSA-DIP-MILD-300G", "Fire Roasted Mild Tomato Salsa 300g", "Pantry", "DARKSTORE_01", 19, 19, 4.0, 175.0, 120.0, 3, 12, 6, "Heritage Oils & Vinegars", "HEALTHY_STOCK: Condiment safety buffer"],
    ["PEANUT-BUTTER-CRUNCHY", "All Natural Roasted Peanut Butter 400g", "Pantry", "DARKSTORE_01", 28, 28, 5.2, 220.0, 155.0, 3, 12, 6, "Metro Essentials", "HEALTHY_STOCK: High shelf life staple"],
    ["OATS-ROLLED-1KG", "Whole Grain Gluten-Free Rolled Oats 1kg", "Breakfast", "DARKSTORE_01", 35, 35, 6.0, 210.0, 150.0, 3, 15, 5, "Metro Essentials", "HEALTHY_STOCK: Morning breakfast cereal"],
    ["DISHWASH-GEL-750ML", "Concentrated Lime Dishwashing Gel 750ml", "Household", "DARKSTORE_01", 14, 14, 7.5, 145.0, 100.0, 2, 20, 10, "Metro Essentials", "REORDER_TRIGGER: Approaching reorder safety threshold"],
    ["TOILET-ROLLS-4PK", "3-Ply Bamboo Ultra Soft Toilet Rolls 4s", "Household", "DARKSTORE_01", 18, 18, 9.0, 199.0, 135.0, 2, 16, 4, "Metro Essentials", "BALANCED: Steady essential household reorder"],
    ["HAND-WASH-REFILL-500ML", "Antibacterial Aloe Vera Hand Wash 500ml", "Personal Care", "DARKSTORE_01", 22, 22, 6.0, 130.0, 85.0, 3, 20, 10, "Gentle Care Labs", "HEALTHY_STOCK: Personal hygiene essential"],
    ["TOOTHPASTE-HERBAL-150G", "Complete Protection Herbal Toothpaste 150g", "Personal Care", "DARKSTORE_01", 30, 30, 8.0, 95.0, 62.0, 3, 24, 12, "Gentle Care Labs", "HEALTHY_STOCK: Core personal care SKU"],
    ["SHAMPOO-ANTI-DANDRUFF", "Tea Tree Anti-Dandruff Shampoo 300ml", "Personal Care", "DARKSTORE_01", 15, 15, 4.5, 299.0, 200.0, 3, 12, 6, "Gentle Care Labs", "BALANCED: Consistent hygiene staple"],
    ["TRASH-BAGS-30L-30PK", "Heavy Duty Biodegradable Garbage Bags 30s", "Household", "DARKSTORE_01", 25, 25, 6.5, 160.0, 105.0, 2, 20, 10, "Metro Essentials", "HEALTHY_STOCK: Essential consumable supply"]
]

# Write Dataset 1
qc_path_1 = TEST_DATA_DIR / "quick_commerce_darkstore_inventory.csv"
qc_path_2 = PUBLIC_DATA_DIR / "quick_commerce_darkstore_inventory.csv"

for p in [qc_path_1, qc_path_2]:
    with open(p, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(qc_headers)
        writer.writerows(qc_rows)
print(f"Generated: {qc_path_1} ({len(qc_rows)} SKUs)")

# --------------------------------------------------------------------------
# 2. DATASET 2: pharmacy_quick_care_35_skus.csv (Pharmacy Dark Store)
# --------------------------------------------------------------------------
pharmacy_headers = [
    "item_code", "product_name", "category", "store_code", "available_qty",
    "expected_inventory", "daily_demand", "retail_price", "cost_price",
    "delivery_days", "moq", "pack_size", "supplier_name", "test_case_note"
]

pharmacy_rows = [
    ["PARACETAMOL-650-15T", "Paracetamol 650mg Fever & Pain 15 Tablets", "OTC Medicines", "PHARMACY_HUB", 4, 4, 35.0, 32.0, 18.0, 1, 50, 25, "Apex Pharma Distribution", "CRITICAL_LOW_STOCK: Rapid burn rate fast mover"],
    ["IBUPROFEN-400-10T", "Ibuprofen 400mg Anti-inflammatory 10s", "OTC Medicines", "PHARMACY_HUB", 0, 0, 18.0, 45.0, 26.0, 1, 30, 15, "Apex Pharma Distribution", "STOCKOUT_ZERO_STOCK: High demand painkiller out of stock"],
    ["DIGESTIVE-ANTACID-GEL", "Mint Cooling Antacid Oral Gel 200ml", "OTC Medicines", "PHARMACY_HUB", -3, -3, 14.0, 140.0, 90.0, 2, 20, 10, "HealCare Labs", "NEGATIVE_INVENTORY_ANOMALY: Inventory scan deficit"],
    ["VITAMIN-C-1000MG-20T", "Effervescent Vitamin C + Zinc 20 Tablets", "Supplements", "PHARMACY_HUB", 85, 25, 4.0, 395.0, 240.0, 3, 20, 10, "Zenith Health Direct", "PHANTOM_INVENTORY: Recorded 85 vs physical 25 (+60 ghost units)"],
    ["GLUCOSE-MONITOR-STRIPS", "Blood Glucose Test Strips 50s", "Medical Devices", "PHARMACY_HUB", 6, 20, 3.0, 850.0, 620.0, 2, 10, 5, "Apex Pharma Distribution", "SHRINKAGE_HIGH_VALUE: High ticket missing strips"],
    ["DIGITAL-THERMOMETER", "Rapid Flexible Tip Digital Thermometer", "Medical Devices", "PHARMACY_HUB", 280, 280, 0.5, 299.0, 160.0, 4, 15, 5, "HealCare Labs", "SEVERE_OVERSTOCK: 560 days of trapped supply"],
    ["BANDAGE-WATERPROOF-20PK", "Waterproof Sterile Adhesive Bandages 20s", "First Aid", "PHARMACY_HUB", 8, 8, 22.0, 75.0, 42.0, 1, 30, 10, "HealCare Labs", "HIGH_REORDER_URGENCY: Low stock on daily essential"],
    ["ANTISEPTIC-LIQUID-500ML", "Hospital Grade Antiseptic Disinfectant 500ml", "First Aid", "PHARMACY_HUB", 12, 12, 16.0, 180.0, 115.0, 2, 24, 12, "Apex Pharma Distribution", "REORDER_TRIGGER: Steady demand first aid"],
    ["COUGH-SYRUP-HERBAL-100ML", "Herbal Non-Drowsy Cough Relief Syrup 100ml", "OTC Medicines", "PHARMACY_HUB", 5, 5, 20.0, 115.0, 72.0, 1, 25, 10, "HealCare Labs", "CRITICAL_LOW_STOCK: Seasonal surge burn rate"],
    ["NASAL-DECONGESTANT-SPRAY", "Fast Acting Saline Nasal Spray 15ml", "OTC Medicines", "PHARMACY_HUB", 7, 7, 15.0, 95.0, 58.0, 2, 20, 10, "Apex Pharma Distribution", "HIGH_REORDER_URGENCY: Low stock with lead time 2 days"],
    ["BABY-FORMULA-STAGE1-400G", "Infant Nutrition Stage 1 Formula 400g Tin", "Baby Health", "PHARMACY_HUB", 9, 9, 12.0, 475.0, 370.0, 2, 12, 4, "Pure Nutrition Life", "BALANCED_REORDER: High value infant staple"],
    ["DIAPER-RASH-CREAM-50G", "Zinc Oxide Soothing Diaper Rash Cream 50g", "Baby Health", "PHARMACY_HUB", 14, 14, 6.0, 165.0, 105.0, 3, 15, 5, "Gentle Care Labs", "HEALTHY_STOCK: Optimal 2+ weeks buffer"],
    ["FACE-MASKS-N95-5PK", "Breathable N95 Particle Filter Masks 5s", "Safety & Hygiene", "PHARMACY_HUB", 450, 450, 1.0, 250.0, 120.0, 5, 50, 25, "HealCare Labs", "SEVERE_OVERSTOCK: Post-pandemic excess inventory"],
    ["HAND-SANITIZER-100ML", "70% Isopropyl Alcohol Instant Sanitizer 100ml", "Safety & Hygiene", "PHARMACY_HUB", 35, 35, 10.0, 50.0, 25.0, 1, 50, 25, "HealCare Labs", "HEALTHY_STOCK: Standard stock balance"],
    ["ORAL-REHYDRATION-SALT-5PK", "Electrolyte ORS Hydration Sachet 5-Pack", "OTC Medicines", "PHARMACY_HUB", 60, 60, 25.0, 40.0, 22.0, 1, 100, 50, "Apex Pharma Distribution", "BALANCED_STOCK: Fast turnaround electrolyte"],
    ["MULTIVITAMIN-DAILY-60CAPS", "Complete Daily Multivitamins for Adults 60s", "Supplements", "PHARMACY_HUB", 24, 24, 5.0, 599.0, 360.0, 3, 12, 6, "Zenith Health Direct", "HEALTHY_STOCK: High margin wellness category"],
    ["FISH-OIL-OMEGA3-60CAPS", "Triple Strength Omega-3 Fish Oil 1000mg 60s", "Supplements", "PHARMACY_HUB", 19, 19, 4.0, 799.0, 480.0, 3, 12, 6, "Zenith Health Direct", "HEALTHY_STOCK: Premium health supplement"],
    ["CALCIUM-D3-TABLETS-30S", "Calcium Citrate Malate + Vitamin D3 30s", "Supplements", "PHARMACY_HUB", 30, 30, 6.0, 290.0, 175.0, 3, 15, 5, "Zenith Health Direct", "HEALTHY_STOCK: Regular replenishment schedule"],
    ["MEDICATED-SOAP-100G", "Antibacterial Chlorhexidine Bathing Soap 100g", "Personal Care", "PHARMACY_HUB", 28, 28, 8.0, 85.0, 52.0, 2, 24, 12, "HealCare Labs", "HEALTHY_STOCK: Good inventory health"],
    ["VAPOR-RUB-OINTMENT-50G", "Camphor & Menthol Chest Vapor Rub 50g", "OTC Medicines", "PHARMACY_HUB", 18, 18, 7.5, 130.0, 80.0, 2, 20, 10, "Apex Pharma Distribution", "BALANCED_STOCK: Steady cold care mover"],
    ["EYE-DROPS-LUBRICATING-10ML", "Carboxymethylcellulose Soothing Eye Drops 10ml", "Eye Care", "PHARMACY_HUB", 11, 11, 8.0, 150.0, 92.0, 2, 20, 10, "Apex Pharma Distribution", "REORDER_TRIGGER: 1.3 days of supply remaining"],
    ["EAR-DROPS-WAX-REMOVAL", "Gentle Hydrogen Peroxide Ear Wax Drops 15ml", "Ear Care", "PHARMACY_HUB", 16, 16, 3.5, 120.0, 75.0, 3, 10, 5, "Apex Pharma Distribution", "HEALTHY_STOCK: Steady specialty item"],
    ["SUNSCREEN-SPF50-100ML", "Ultra-Light Matte Sunscreen Lotion SPF 50", "Dermatology", "PHARMACY_HUB", 22, 22, 6.5, 450.0, 280.0, 3, 12, 6, "DermaScience Direct", "HEALTHY_STOCK: High margin skincare"],
    ["HEALING-ALOE-GEL-150ML", "Pure Organic Soothing Aloe Vera Gel 150ml", "Dermatology", "PHARMACY_HUB", 32, 32, 5.0, 199.0, 120.0, 3, 15, 5, "DermaScience Direct", "HEALTHY_STOCK: Consistent daily seller"],
    ["CREATINE-MONOHYDRATE-250G", "Micronized Pure Creatine Monohydrate 250g", "Sports Nutrition", "PHARMACY_HUB", 15, 15, 4.0, 899.0, 560.0, 4, 10, 5, "Peak Nutrition Direct", "HEALTHY_STOCK: High ticket sports item"],
    ["ACIDITY-CHEWABLE-10S", "Calcium Carbonate Fruit Antacid Chewables 10s", "OTC Medicines", "PHARMACY_HUB", 45, 45, 15.0, 25.0, 14.0, 1, 50, 25, "Apex Pharma Distribution", "BALANCED_STOCK: Fast impulse healthcare counter pick"],
    ["PAIN-RELIEF-SPRAY-50G", "Instant Muscle & Joint Pain Relief Spray 50g", "First Aid", "PHARMACY_HUB", 14, 14, 9.0, 170.0, 105.0, 2, 20, 10, "HealCare Labs", "REORDER_TRIGGER: High velocity first aid"],
    ["STERILE-GAUZE-PADS-10PK", "Sterile Cotton Wound Dressing Pads 10s", "First Aid", "PHARMACY_HUB", 40, 40, 7.0, 60.0, 32.0, 2, 30, 10, "HealCare Labs", "HEALTHY_STOCK: Basic medical consumable"],
    ["SURGICAL-TAPE-1INCH", "Micropore Breathable Paper Surgical Tape 1\"", "First Aid", "PHARMACY_HUB", 25, 25, 5.5, 45.0, 25.0, 2, 20, 10, "HealCare Labs", "HEALTHY_STOCK: Clinical essential"],
    ["HOT-WATER-BOTTLE-RUBBER", "Durable Natural Rubber Hot Water Bag 2L", "Medical Devices", "PHARMACY_HUB", 12, 12, 2.5, 280.0, 160.0, 4, 10, 5, "HealCare Labs", "HEALTHY_STOCK: Stable winter homecare SKU"],
    ["ICE-PACK-GEL-REUSABLE", "Flexible Contoured Reusable Cold Compress", "First Aid", "PHARMACY_HUB", 18, 18, 3.0, 220.0, 130.0, 3, 10, 5, "HealCare Labs", "HEALTHY_STOCK: Regular sports first aid"],
    ["BABY-TEETHING-GEL-15G", "Natural Chamomile Baby Soothing Teething Gel", "Baby Health", "PHARMACY_HUB", 8, 8, 4.0, 185.0, 115.0, 3, 10, 5, "Gentle Care Labs", "REORDER_TRIGGER: Safe stock minimum reached"],
    ["PREGNANCY-TEST-KIT-1S", "Rapid One-Step Early Pregnancy Test Card", "Diagnostics", "PHARMACY_HUB", 26, 26, 12.0, 99.0, 45.0, 2, 25, 10, "Apex Pharma Distribution", "BALANCED_STOCK: High margin quick commerce diagnostic"],
    ["CHOLESTEROL-CHECK-STRIPS", "Self-Testing Cholesterol Test Strips 10s", "Diagnostics", "PHARMACY_HUB", 5, 5, 1.5, 1100.0, 820.0, 5, 5, 1, "Apex Pharma Distribution", "LOW_STOCK_HIGH_VALUE: High ticket diagnostic inventory"],
    ["HERBAL-SLEEP-AID-30CAPS", "Melatonin + Valerian Root Sleep Support 30s", "Supplements", "PHARMACY_HUB", 20, 20, 4.5, 499.0, 290.0, 3, 12, 6, "Zenith Health Direct", "HEALTHY_STOCK: High growth wellness line"]
]

ph_path_1 = TEST_DATA_DIR / "pharmacy_quick_care_35_skus.csv"
ph_path_2 = PUBLIC_DATA_DIR / "pharmacy_quick_care_35_skus.csv"

for p in [ph_path_1, ph_path_2]:
    with open(p, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(pharmacy_headers)
        writer.writerows(pharmacy_rows)
print(f"Generated: {ph_path_1} ({len(pharmacy_rows)} SKUs)")

# --------------------------------------------------------------------------
# 3. DATASET 3: multi_table_bundle/ (Separate Relational Tables)
# --------------------------------------------------------------------------
# 3a. products.csv
prod_headers = ["sku", "product_name", "category", "unit_price", "cost", "supplier_id"]
prod_rows = [
    ["BEV-001", "Sparkling Lime Soda 330ml", "Beverages", 45.0, 28.0, "SUPP-01"],
    ["BEV-002", "Cold Brew Black 250ml", "Beverages", 120.0, 80.0, "SUPP-01"],
    ["DAI-001", "Farm Fresh Whole Milk 1L", "Dairy", 65.0, 50.0, "SUPP-02"],
    ["DAI-002", "Greek Yogurt Plain 200g", "Dairy", 80.0, 55.0, "SUPP-02"],
    ["BAK-001", "Brioche Burger Buns 4pk", "Bakery", 95.0, 60.0, "SUPP-03"],
    ["BAK-002", "Whole Wheat Sandwich Bread", "Bakery", 50.0, 35.0, "SUPP-03"],
    ["SNK-001", "Truffle Sea Salt Crisps 125g", "Snacks", 140.0, 95.0, "SUPP-04"],
    ["SNK-002", "Smoked Paprika Almonds 150g", "Snacks", 250.0, 180.0, "SUPP-04"],
    ["HOU-001", "Dishwash Citrus Liquid 500ml", "Household", 110.0, 75.0, "SUPP-05"],
    ["HOU-002", "Eco Bamboo Paper Towels 2pk", "Household", 160.0, 110.0, "SUPP-05"]
]

# 3b. inventory.csv
inv_headers = ["sku", "store_code", "current_inventory", "expected_inventory", "daily_demand"]
inv_rows = [
    ["BEV-001", "STORE_NORTH", 4, 4, 30.0],     # Critical low
    ["BEV-002", "STORE_NORTH", 0, 0, 22.0],     # Out of stock
    ["DAI-001", "STORE_NORTH", 8, 8, 35.0],     # Imminent stockout
    ["DAI-002", "STORE_NORTH", -2, -2, 12.0],   # Negative anomaly
    ["BAK-001", "STORE_NORTH", 2, 2, 14.0],     # Low stock
    ["BAK-002", "STORE_NORTH", 15, 15, 20.0],   # Normal
    ["SNK-001", "STORE_NORTH", 45, 15, 4.0],    # Phantom inventory (+30 discrepancy)
    ["SNK-002", "STORE_NORTH", 280, 280, 0.8],  # Overstock (350 days supply)
    ["HOU-001", "STORE_NORTH", 20, 20, 6.0],    # Healthy
    ["HOU-002", "STORE_NORTH", 18, 18, 5.0]     # Healthy
]

# 3c. suppliers.csv
supp_headers = ["supplier_id", "supplier_name", "lead_time", "min_order_quantity", "pack_size"]
supp_rows = [
    ["SUPP-01", "Apex Beverage Bottlers", 2, 24, 12],
    ["SUPP-02", "Heritage Dairy Logistics", 1, 20, 10],
    ["SUPP-03", "Artisan Bakers Alliance", 1, 10, 5],
    ["SUPP-04", "Gourmet Snack Crafters", 3, 30, 15],
    ["SUPP-05", "Metro Clean Supplies", 2, 20, 10]
]

# 3d. sales.csv
sales_headers = ["sku", "store_code", "timestamp", "sales_quantity", "sales_value"]
sales_rows = [
    ["BEV-001", "STORE_NORTH", "2026-09-29 09:15:00", 3, 135.0],
    ["BEV-001", "STORE_NORTH", "2026-09-29 11:30:00", 5, 225.0],
    ["BEV-001", "STORE_NORTH", "2026-09-29 14:00:00", 4, 180.0],
    ["DAI-001", "STORE_NORTH", "2026-09-29 08:00:00", 8, 520.0],
    ["DAI-001", "STORE_NORTH", "2026-09-29 10:20:00", 12, 780.0],
    ["BAK-001", "STORE_NORTH", "2026-09-29 09:45:00", 3, 285.0],
    ["SNK-001", "STORE_NORTH", "2026-09-29 16:30:00", 2, 280.0],
    ["HOU-001", "STORE_NORTH", "2026-09-29 12:10:00", 2, 220.0]
]

# Write multi-table files to both directories
table_configs = [
    ("products.csv", prod_headers, prod_rows),
    ("inventory.csv", inv_headers, inv_rows),
    ("suppliers.csv", supp_headers, supp_rows),
    ("sales.csv", sales_headers, sales_rows),
]

for fname, h, r in table_configs:
    for target_dir in [MULTI_TABLE_DIR, MULTI_TABLE_PUB_DIR]:
        p = target_dir / fname
        with open(p, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(h)
            writer.writerows(r)
        print(f"Generated: {p}")

print("\nAll test datasets successfully generated!")
