"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routes import router

# Create tables on startup (dev convenience; use migrations in production)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MeshInfo Network",
    description="Central directory for MeshInfo instances",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
