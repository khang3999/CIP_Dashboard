from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body
from app.supabase_client import supabase
import time
import io
import re

router = APIRouter()

BUCKET_NAME = "cip-models"


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
    region_id: str = Form(...),
):
    try:
        region_id = int(region_id)  # ép kiểu
    except ValueError:
        raise HTTPException(status_code=400, detail="region_id phải là số nguyên")

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
            "type": "XGBoost Regressor",
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
