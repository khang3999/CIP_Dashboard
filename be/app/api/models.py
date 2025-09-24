from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    Body,
    FastAPI,
    BackgroundTasks,
)
from app.supabase_client import supabase
from app.services.model_service import ModelService
import time
import io
import re
from app.config import BUCKET_NAME

router = APIRouter()
model_service = ModelService(supabase)
# BUCKET_NAME = "cip-models"


@router.get("/ping")
def test():
    try:
        res = supabase.table("cip_regions").select("*").limit(1).execute()
        return {"status": "ok", "data": res.data}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@router.post("/save")
async def save_model(
    file: UploadFile = File(...),
    model_name: str = Form(...),
    model_type: str = Form(...),
    region_id: str = Form(...),
):
    try:
        region_id = int(region_id)  # ép kiểu
        model_type = int(model_type)  # ép kiểu
    except ValueError:
        raise HTTPException(status_code=400, detail="Giá trị phải là số nguyên")

    if not file.filename.endswith(".pkl"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file .pkl")

    # tạo tên file unique
    # 1. Thay khoảng trắng bằng _
    model_name_safe = model_name.replace(" ", "_")
    # 2. Loại bỏ các ký tự không hợp lệ (chỉ giữ chữ, số, _ và -)
    model_name_safe = re.sub(r"[^a-zA-Z0-9_\-]", "", model_name_safe)

    timestamp = int(time.time())
    file_name = f"{timestamp}_{model_name_safe}.pkl"
    # file_path = f"{BUCKET_NAME}/{file_name}"
    try:
        # ===== 1. Upload lên Supabase Storage =====
        content = await file.read()
        # supabase.storage.from_(BUCKET_NAME).upload(file_name, content)
        res = supabase.storage.from_(BUCKET_NAME).upload(
            path=file_name,
            file=content,
            file_options={"content-type": "application/octet-stream"},
        )

        # # Lấy public URL (nếu bucket set public)
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)

        # # ===== 2. Lưu metadata vào bảng Postgres (vd: model_files) =====
        data = {
            "name": model_name,
            "type": model_type,
            "region_id": region_id,
            "status": "completed",
            "file_url": public_url,
            "file_path": file_name,
            "accuracy": None,  # ban đầu chưa có giá trị
            "training_progress": 100,
            "rmse": None,  # ban đầu chưa có giá trị
            "wape": None,
            "mae": None,
            "r2": None,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(timestamp)),
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(timestamp)),
            "version": 1.0,
        }
        res = supabase.table("cip_models").insert(data).execute()

        return {"status": "success", "file": data, "db_result": res.data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete")
async def delete_model(model_id: int = Body(...), file_path: str = Body(...)):
    try:
        # 1. Xóa file trong Supabase Storage nếu file_path tồn tại
        if file_path:
            res = supabase.storage.from_(BUCKET_NAME).remove([file_path])
            for r in res:
                if r.get("error"):  # mỗi phần tử là dict
                    raise HTTPException(
                        status_code=500, detail=f"Error deleting file: {r['error']}"
                    )

        # 2. Xóa record trong table
        res = supabase.table("cip_models").delete().eq("id", model_id).execute()
        if res.data is None or (isinstance(res.data, dict) and res.data.get("error")):
            raise HTTPException(
                status_code=500,
                detail=f"Error deleting model record: {res.data}",
            )

        return {"status": "success", "message": "Model và file đã được xóa"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
async def create_model(
    file: UploadFile = File(...),
    model_name: str = Form(...),
    model_type: str = Form(...),
    region_id: str = Form(...),
    background_tasks: BackgroundTasks = None,
):
    try:
        region_id = int(region_id)  # ép kiểu
        model_type = str(model_type)  # ép kiểu
    except ValueError:
        raise HTTPException(status_code=400, detail="Giá trị phải là số nguyên")
    if not (file.filename.endswith(".xlsx") or file.filename.endswith(".xls")):
        raise HTTPException(
            status_code=400, detail="Chỉ chấp nhận file Excel (.xlsx, .xls)"
        )
    file_bytes = await file.read()  # async read
    # Điều hướng xử lí
    # res = model_service.create_new_model(file, model_name, model_type, region_id)
    # Thêm vào background task
    background_tasks.add_task(
        model_service.create_new_model, file_bytes, model_name, model_type, region_id
    )
    return {
        "status": "training",
        "model_name": model_name,
        "model_type": model_type,
        "region_id": region_id,
    }
    # return {
    #     "status": "success",
    #     "data": {"model_name": model_name, "model_type": model_type},
    # }
    pass
