from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import InventoryAIException
from app.db.supabase import check_db_connection

# Import API Routers
from app.api.auth import router as auth_router
from app.api.datasets import router as datasets_router
from app.api.uploads import router as uploads_router
from app.api.mapping import router as mapping_router
from app.api.analysis import router as analysis_router
from app.api.forecasts import router as forecasts_router
from app.api.risks import router as risks_router
from app.api.recommendations import router as recommendations_router
from app.api.actions import router as actions_router
from app.api.copilot import router as copilot_router

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Inventory Decision Engine FastAPI server started.")
    settings.DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)
    settings.DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    settings.DATA_SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
    settings.DATA_ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    yield
    logger.info("Shutting down AI Inventory Decision Engine.")


app = FastAPI(
    title="AI Inventory Decision Engine API",
    description="Industry-level decision support intelligence layer for dark stores and warehouses.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for Next.js frontend (supports localhost:3000, 3001, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:8000"
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(InventoryAIException)
async def custom_exception_handler(request: Request, exc: InventoryAIException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error_code": exc.error_code}
    )


@app.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
async def health_check():
    """
    Standardized API health check (Section 62 of security_prompt.txt).
    Never exposes secrets or credentials.
    """
    db_status = check_db_connection()
    gemini_status = "configured" if settings.GEMINI_API_KEY else "unconfigured"

    return {
        "status": "ok",
        "services": {
            "database": db_status.get("status", "connected"),
            "gemini": gemini_status
        }
    }


# Register routes
app.include_router(auth_router)
app.include_router(datasets_router)
app.include_router(uploads_router)
app.include_router(mapping_router)
app.include_router(analysis_router)
app.include_router(forecasts_router)
app.include_router(risks_router)
app.include_router(recommendations_router)
app.include_router(actions_router)
app.include_router(copilot_router)
