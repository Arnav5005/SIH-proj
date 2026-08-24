import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.config import settings
from backend.app.database.session import init_db
from backend.app.api.routes_screen import router as screen_router
from backend.app.api.routes_records import router as records_router
from backend.app.api.routes_dashboard import router as dashboard_router
from backend.app.api.routes_alerts import router as alerts_router
from backend.app.api.routes_demo import router as demo_router
from backend.app.api.routes_auth import router as auth_router
from backend.app.api.routes_standalone import router as standalone_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables and seed data
    print(f"[*] Starting {settings.APP_NAME} ({settings.APP_VERSION})")
    init_db()
    print("[*] Synthetic Border Registry and Watchlist database initialized.")
    yield
    # Shutdown
    print("[*] Backend shutting down.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Based Fake Identity & Travel Document Screening System (SIH26188)",
    lifespan=lifespan,
)

# CORS middleware for Expo Web / Mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Performance & Timing Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time-Ms"] = str(round(process_time * 1000, 2))
    return response

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
            "path": request.url.path,
        },
    )

# Mount API Routers
app.include_router(screen_router)
app.include_router(records_router)
app.include_router(dashboard_router)
app.include_router(alerts_router)
app.include_router(demo_router)
app.include_router(auth_router)
app.include_router(standalone_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "OPERATIONAL",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "checkpoint": settings.DEFAULT_CHECKPOINT,
        "sector": settings.DEFAULT_SECTOR,
    }

@app.get("/")
def root():
    return {
        "message": "SSB AI Document Screening API is active.",
        "docs_url": "/docs",
        "health_check": "/api/health",
    }
