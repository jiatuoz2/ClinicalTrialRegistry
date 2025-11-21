# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db import init_db
from app.server import router as api_router

app = FastAPI(title="Patient-Hospital Blockchain API")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Uploads static folder ---
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- Init DB ---
@app.on_event("startup")
def on_startup():
    init_db()

# --- Include all APIs from server.py ---
app.include_router(api_router)
