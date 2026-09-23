import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import *  # noqa: Import all models so Base knows about them
from app.routers import auth, admin, hospital, coordinator
from app.core.config import settings

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Organ Allocation & Transplant Coordination System",
    description="AI-Powered MVP — Academic Decision Support Prototype",
    version="1.0.0",
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploaded medical reports are only served through the authenticated
# /hospital/reports and /coordinator/reports endpoints, never statically
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(hospital.router)
app.include_router(coordinator.router)


@app.get("/")
def root():
    return {
        "message": "Organ Allocation & Transplant Coordination System API",
        "version": "1.0.0",
        "disclaimer": "Academic prototype. Not for clinical use.",
        "docs": "/docs",
    }
