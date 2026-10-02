import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.core.security import DEMO_USER_ID
from app.services.dataset_service import DatasetService
from app.services.analysis_service import AnalysisService

def seed_demo():
    print("Initializing demo dataset...")
    # Check if a dataset already exists
    existing = DatasetService.list_datasets(DEMO_USER_ID)
    if existing:
        print(f"Dataset already exists: {existing[0]['name']} (id: {existing[0]['id']})")
        return existing[0]["id"]

    ds = DatasetService.create_dataset(
        user_id=DEMO_USER_ID,
        name="DarkStore Alpha (Indiranagar)",
        description="Active quick-commerce fulfillment center inventory"
    )
    dataset_id = ds["id"]
    print(f"Created dataset: {dataset_id}")

    # Load unified inventory stress test data
    stress_csv = backend_dir.parent / "data" / "test_scenario" / "unified_inventory_stress_test.csv"
    if not stress_csv.exists():
        print(f"Stress test file not found at {stress_csv}")
        return dataset_id

    content = stress_csv.read_bytes()
    file_info = DatasetService.save_uploaded_file(
        user_id=DEMO_USER_ID,
        dataset_id=dataset_id,
        filename="unified_inventory.csv",
        content_bytes=content
    )
    print(f"Uploaded file: {file_info['filename']} with {file_info['row_count']} rows")

    # Run analytical pipeline
    print("Running analytical pipeline...")
    result = AnalysisService.run_pipeline(dataset_id=dataset_id, user_id=DEMO_USER_ID)
    print("Pipeline completed successfully!")
    print(f"Total SKUs: {result.get('total_skus')}")
    print(f"Recommendations generated: {len(result.get('recommendations', []))}")
    print(f"Stockout risks flagged: {len(result.get('stockout_risks', []))}")
    print(f"Anomalies detected: {len(result.get('anomalies', []))}")
    return dataset_id

if __name__ == "__main__":
    seed_demo()
