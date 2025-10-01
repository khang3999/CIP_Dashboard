from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body
from app.supabase_client import supabase
import time
import io
import re

from app.services.file_service import FileService

router = APIRouter()
file_service = FileService(supabase)


@router.post("/save")
async def save_file(
    file: UploadFile = File(...),
    type: str = Form(...),
):
    # print(f"Received file: {file.filename}, type: {type}")
    if not (file.filename.endswith(".xlsx") or file.filename.endswith(".xls")):
        raise HTTPException(
            status_code=400, detail="Chỉ chấp nhận file Excel (.xlsx, .xls)"
        )
    result = file_service.create_data_by_excel(file, type)

    return result
