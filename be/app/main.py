from fastapi import FastAPI
from app.api import predicts
from app.api import models
from app.api import files
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="My FastAPI Project")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hoặc domain cụ thể
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
# RUN: uvicorn app.main:app --reload
# Đăng ký router
app.include_router(predicts.router, prefix="/predicts", tags=["Predicts"])
app.include_router(models.router, prefix="/models", tags=["Models"])
app.include_router(files.router, prefix="/files", tags=["Files"])
