import os
from dotenv import load_dotenv

# Load biến môi trường từ file .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
BUCKET_NAME = "cip-models"

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in .env")


CUSTOM_TMP_DIR = os.path.join(os.getcwd(), "temp_folder")  # tạo thư mục tạm trong project
os.makedirs(CUSTOM_TMP_DIR, exist_ok=True)