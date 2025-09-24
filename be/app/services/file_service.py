from fastapi import UploadFile
from supabase import Client
import pandas as pd
import joblib
import arviz as az


class FileService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    def create_data_by_excel(self, file: UploadFile, type: str) -> str:
        try:
            match type:
                case "customers":
                    # Đọc Excel trực tiếp từ file upload (không cần lưu)
                    dfs = pd.read_excel(file.file, sheet_name=None)
                    # Chạy qua hàm xử lí cho lounge usage customers cho 2 sheet
                    for sheet_name, df in dfs.items():
                        try:
                            stores = (
                                self.supabase.table("cip_stores")
                                .select("*")
                                .execute()
                                .data
                            )
                            # Gọi hàm xử lí dữ liệu ở đây
                            process_customer_file(self.supabase, df, sheet_name, stores)
                        except Exception as e:
                            print(f"Error processing sheet {sheet_name}: {str(e)}")
                            continue
                case "flights":
                    # Đọc Excel trực tiếp từ file upload (không cần lưu)
                    dfs = pd.read_excel(file.file, sheet_name=None)
                    for sheet_name, df in dfs.items():
                        try:
                            # Gọi hàm xử lí dữ liệu ở đây
                            process_flights_file(self.supabase, df, sheet_name)
                        except Exception as e:
                            print(f"Error processing sheet {sheet_name}: {str(e)}")
                            continue
                case "refill":
                    try:
                        # Đọc Excel trực tiếp từ file upload (không cần lưu)
                        df = pd.read_excel(file.file, sheet_name=0)
                        process_log_refill_file(self.supabase, df, "")

                    except Exception as e:
                        print(f"Error processing sheet {sheet_name}: {str(e)}")
                case _:
                    print(f"File của {type} không được hỗ trợ.")
                    return {
                        "status": "Failed",
                        "message": f"File của {type} không được hỗ trợ.",
                    }

            print(f"Data for {type} created successfully")
            return {
                "status": "Success",
                "message": f"Data for {type} created successfully",
            }

        except Exception as e:
            print(f"Error: {str(e)}")
            return {
                "status": "Success",
                "message": f"Error: {str(e)}",
            }


async def process_customer_file(
    supabase, df: pd.DataFrame, sheet_name: str, stores: list
):
    try:
        # df = pd.read_excel(df.file)
        # Tạo dict mapping: { "Store A": 1, "Store B": 2, ... }
        store_map = {s["name"].strip(): s["id"] for s in stores}
        df["store_name"] = df["store_name"].str.strip()
        # Chuyển cột store_name thành store_id
        if "store_name" in df.columns:
            df["store_id"] = df["store_name"].map(store_map)
        # print(store_map)
        # df = df.drop(columns=["store_name"])
        else:
            return "Error: Không tìm thấy cột 'store_name' trong file Excel"

            # Thêm cột region_id (giá trị cố định)
        df["region_id"] = 1 if sheet_name == "QT" else 2
        # Thêm cột timeslot_id (giá trị mặc định)
        df["timeslot_id"] = df["timeslot"].apply(
            lambda x: 1 if x == 0 else (2 if x == 8 else 3)
        )
        # df = df.drop(columns=["timeslot"])

        # Convert cột date sang chuỗi YYYY-MM-DD
        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

            # # Chuẩn hóa trước khi insert
            # Thay NaN bằng 0
        df = df.fillna(0)

        bigint_cols = [
            "lag_1",
            "lag_7",
            "lag_14",
            "lag_28",
            "store_id",
            "region_id",
            "timeslot_id",
            "total_customers",
            "flights",
        ]
        for col in bigint_cols:
            if col in df.columns:
                df[col] = df[col].fillna(0).astype(int)

            bool_cols = ["is_weekend", "is_holiday", "rain"]
        for col in bool_cols:
            if col in df.columns:
                df[col] = df[col].fillna(0).astype(bool)

        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

            # for col in df.columns:
            #     print(col, df[col].dtype)

            # Debug xem còn NaN không
            # print(df["date"])

            # Kiểm tra duplicate
            # dup_rows = df[df.duplicated(subset=["date", "store_id", "timeslot_id", "region_id"], keep=False)]

            # if not dup_rows.empty:
            #     print("Có các bản ghi trùng khóa chính:")
            #     print(dup_rows)
            # else:
            #     print("Không có duplicate trong DataFrame")

            # Chèn dữ liệu vào bảng cip_customers
            records = df.to_dict(orient="records")
        if records:
            await supabase.table("cip_customer_statistics").upsert(records).execute()
            print(f"Inserted {len(records)} records from sheet {sheet_name}")
        else:
            print(f"No records to insert from sheet {sheet_name}")
        return True
    except Exception as e:
        print(f"Error processing customer file: {str(e)}")
        return False


async def process_flights_file(supabase, df: pd.DataFrame, sheet_name: str):
    try:
        df["timeslot_id"] = df["timeslot"].apply(
            lambda x: 1 if x == 0 else (2 if x == 8 else 3)
        )
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
        # Copy cột flights sang flight
        df["flight"] = df["flights"]

        # Thêm cột region_id (giá trị cố định)
        df["region_id"] = 1 if sheet_name == "QT" else 2
        df["region_id"] = df["region_id"].fillna(0).astype(int)

        # Xóa cột flights
        df = df.drop(columns=["flights"])
        duplicates = df[df.duplicated(keep=False)]
        print("Duplicate rows (all columns):")
        print(duplicates)
        print(df)
        records = df.to_dict(orient="records")
        if records:
            await supabase.table("cip_flights").upsert(records).execute()
            print(f"Inserted {len(records)} records flights from sheet {sheet_name}")
        else:
            print(f"No records flights to insert from sheet {sheet_name}")
        return True
    except Exception as e:
        print(f"Error processing flights file: {str(e)}")
        return False


async def process_log_refill_file(supabase, df: pd.DataFrame, sheet_name: str):
    try:
        df = df.rename(
            columns={
                "Date": "date",
                "Shift_ID": "timeslot_id",
                "Food_Type": "food_type",
                "PAX": "pax",
                "Item_ID": "dish_id",
                "Item_Name": "dish_name",
                "Consumed_Amount_suat": "consumed_amount_suat",
            }
        )
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
        # SỬ LÍ LẠI store_id theo data
        df["store_id"] = 4
        df["timeslot_id"] = df["timeslot_id"].apply(
            lambda x: 1 if x == "TS001" else (2 if x == "TS002" else 3)
        )
        valid_columns = [
            "date",
            "store_id",
            "timeslot_id",
            "food_type",
            "pax",
            "dish_id",
            "dish_name",
            "consumed_amount_suat",
        ]
        # Giữ lại đúng cột hợp lệ
        df = df[valid_columns]
        await (
            supabase.table("cip_log_refill")
            .upsert(df.to_dict(orient="records"))
            .execute()
        )
    except Exception as e:
        print(f"Error processing log refill file: {str(e)}")
        return False



