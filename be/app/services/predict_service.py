from supabase import Client
from app.supabase_client import supabase
from app.services.weather_service import WeatherService
from app.api.models import BUCKET_NAME
import pandas as pd
import numpy as np
from sklearn.preprocessing import OneHotEncoder, MinMaxScaler
from sklearn.compose import ColumnTransformer
import joblib
from io import BytesIO
import arviz as az
import xarray as xr
import tempfile
import os
import re
from datetime import date, datetime
from collections import defaultdict
from typing import List, Dict, Any
import json
import tempfile
import os
from app.config import CUSTOM_TMP_DIR

weather_service = WeatherService(supabase)
CONFIG_MODEL_PATH = "mappings.joblib"


class PredictService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    def predict(
        self,
        start_date: str,
        end_date: str,
        region_id: int,
        timeslot_id: int,
        store_id: int,
    ) -> list:
        # lags = [1, 7, 14, 28]
        # roll_windows = [3, 7, 14, 28]
        # start_date ở param là ngày mai,

        # Implement prediction logic here
        # 1. Lấy data tháng mới nhất kiểu object
        latest_data = self._get_customer_statistics_latest(
            region_id=region_id,
            timeslot_id=timeslot_id,
            store_id=store_id,
        )
        # Chuyển thành df
        df_feat_latest = pd.DataFrame(latest_data.data)
        # print(start_date, "ppppppppppppppp")
        # 2.1. Lấy weather mới kiểu dataframe
        df_weather_furute = weather_service.get_weather_from_api()
        # 2.2. Lấy weather đến ngày cuối trong
        last_day = pd.to_datetime(df_feat_latest["date"]).max().date()
        yesterday = (pd.to_datetime(start_date) - pd.Timedelta(days=2)).date()
        url_past = f"https://archive-api.open-meteo.com/v1/archive?latitude=10.8188&longitude=106.6519&start_date={last_day}&end_date={yesterday}&hourly=temperature_2m,rain"
        df_weather_past = weather_service.get_weather_from_api(url=url_past)
        df_weather = pd.concat([df_weather_past, df_weather_furute], ignore_index=True)
        ## CHECK Nan
        df_weather = fill_nan_weather(df_weather)

        # 3. Lấy dữ liệu chuyến bay kiểu object
        flights = self._get_flights_data(region_id, timeslot_id)
        # Chuyển thành df
        df_flights = pd.DataFrame(flights.data)
        # print(df_flights.columns,"tytyty1")
        # 4. Lấy model
        model_customer = self._get_model_customer(region_id)
        result_customers = _forecast_customers(
            start_date=start_date,
            end_date=end_date,
            df_feat_latest=df_feat_latest,
            df_flights=df_flights,
            df_weather=df_weather,
            model=model_customer,
            lags=[1, 7, 14, 28],
            roll_windows=[3, 7, 14, 28],
        )
        # print(result_customers, "testtttt")

        ##### ====== ####
        ### Dự đoán phân bổ món ăn
        # Load config, và trace
        # trace_path = f"trace_model_{'qn' if region_id == 2 else 'qt'}.nc"
        model_food_res = (
            self.supabase.table("cip_models")
            .select("file_path")
            .eq("region_id", region_id)
            .eq("type", "food")
            .eq("status", "using")
            .execute()
        )
        if not model_food_res.data or len(model_food_res.data) == 0:
            raise ValueError(f"No model entry found for region {region_id}")

        idata_trace_path = model_food_res.data[0]["file_path"]
        # trace_path = "trace_model_qn.nc"
        idata_trace_bytes = self.supabase.storage.from_(BUCKET_NAME).download(
            idata_trace_path
        )
        # Ghi ra file trên máy
        file_name = "idata_trace_bytes_to_database.nc"
        # Tạo đường dẫn đầy đủ
        file_path = os.path.join(CUSTOM_TMP_DIR, file_name)
        # Ghi file byte lấy từ supabase thành file
        with open(file_path, "wb") as f:
            f.write(idata_trace_bytes)
        # Đọc file bằng az sẽ chuyển thành InferenceData
        idata_trace = az.from_netcdf(file_path)

        # os.remove(file_path)

        # print(idata_trace.groups(), "idata")

        result_foods = []
        result_ingredients = []

        # Đang có dữ liệu cho 1 của hàng duy nhất (store_id = 4)
        if store_id == 4:
            ### Dự báo món ăn
            for row in result_customers:
                allocation = forecast_dishes(
                    idata_trace=idata_trace,
                    # mappings=mappings_model,
                    pax=row["total_customers"],
                    store_id=store_id,
                    timeslot_id=timeslot_id,
                )

                # Lưu kết quả theo từng món
                # giả sử bạn query DB ra DataFrame hoặc list
                res_dishes = self.supabase.from_("cip_dishes").select("*").execute()
                if not res_dishes.data or len(res_dishes.data) == 0:
                    raise ValueError(
                        "Không có dữ liệu hoặc có lỗi khi truy vấn cip_dishes"
                    )
                # Tạo dict để tra nhanh
                dishes_dict = {d["id"]: d["name"] for d in res_dishes.data}
                food_types_dict = {d["id"]: d["food_type"] for d in res_dishes.data}
                for item_id, info in allocation.items():
                    result_foods.append(
                        {
                            "date": row["date"],
                            "store_id": store_id,
                            "timeslot_id": timeslot_id,
                            "pax": row["total_customers"],
                            "dish_id": item_id,
                            "dish_name": dishes_dict.get(item_id, "Unknown"),
                            "food_type": food_types_dict.get(item_id, "Unknown"),
                            "consumed_amount_suat": info["forecast"],
                            "mu": info["mu"],
                            "hdi80_low": info["hdi80"][0],
                            "hdi80_high": info["hdi80"][1],
                            "hdi95_low": info["hdi95"][0],
                            "hdi95_high": info["hdi95"][1],
                        }
                    )

            ### Dự báo Ingredient usage, rop
            df_inventory_level = forecast_ingredient(
                self.supabase,
                store_id,
                timeslot_id,
                result_foods,
            )
            # Đã drop ngày nhỏ hơn trong hàm forecast_ingredient
            result_ingredients = df_inventory_level.to_dict(orient="records")

            # Xử lí drop bớt ngày không từ cuối dữ liệu đến hôm nay
        today = date.today()
        result_customers = filter_list_by_today(result_customers, today)
        result_foods = group_items_by_date(result_foods, today)
        result_ingredients = group_items_by_date(result_ingredients, today)

        return result_customers, result_foods, result_ingredients

    def predict_1(
        self,
        start_date: str,
        end_date: str,
        region_id: int,
        timeslot_id: int,
        store_id: int,
    ):
        today = date.today()
        if timeslot_id == 4:
            res_timeslots = (
                self.supabase.table("cip_timeslot").select("id").neq("id", 4).execute()
            )
            timeslot_ids = [row["id"] for row in res_timeslots.data]
        else:
            timeslot_ids = [timeslot_id]
        forecasted_customers_list = []  # List chứa kết quả dự đoán khách đến phòng chờ trong 3 ca 1 ngày
        result_dishes_list = []
        # result_ingredients_list = []
        for ts_id in timeslot_ids:
            latest_data = self._get_customer_statistics_latest(
                region_id=region_id,
                timeslot_id=ts_id,
                store_id=store_id,
            )
            # Chuyển thành df
            df_feat_latest = pd.DataFrame(latest_data.data)
            # print(start_date, "ppppppppppppppp")
            # 2.1. Lấy weather mới kiểu dataframe
            df_weather_furute = weather_service.get_weather_from_api()
            # 2.2. Lấy weather đến ngày cuối trong
            last_day = pd.to_datetime(df_feat_latest["date"]).max().date()
            yesterday = (pd.to_datetime(start_date) - pd.Timedelta(days=2)).date()
            url_past = f"https://archive-api.open-meteo.com/v1/archive?latitude=10.8188&longitude=106.6519&start_date={last_day}&end_date={yesterday}&hourly=temperature_2m,rain"
            df_weather_past = weather_service.get_weather_from_api(url=url_past)
            df_weather = pd.concat(
                [df_weather_past, df_weather_furute], ignore_index=True
            )
            ## CHECK Nan
            df_weather = fill_nan_weather(df_weather)

            # 3. Lấy dữ liệu chuyến bay kiểu object
            flights = self._get_flights_data(region_id, ts_id)
            # Chuyển thành df
            df_flights = pd.DataFrame(flights.data)
            # print(df_flights.columns,"tytyty1")
            # 4. Lấy model
            model_customer = self._get_model_customer(region_id)
            # Dự báo tất cả ngày của 1 ca
            result_customers_by_timeslot = _forecast_customers(
                start_date=start_date,
                end_date=end_date,
                df_feat_latest=df_feat_latest,
                df_flights=df_flights,
                df_weather=df_weather,
                model=model_customer,
                lags=[1, 7, 14, 28],
                roll_windows=[3, 7, 14, 28],
            )
            # Rải vào mảng: 1 dòng là của 1 ngày 1 ca cụ thể
            # result_customers_list.append(result_customers_by_timeslot)
            forecasted_customers_list.extend(result_customers_by_timeslot)

        ### LOAD MODEL
        model_food_res = (
            self.supabase.table("cip_models")
            .select("file_path")
            .eq("region_id", region_id)
            .eq("type", "food")
            .eq("status", "using")
            .execute()
        )
        if not model_food_res.data or len(model_food_res.data) == 0:
            raise ValueError(f"No model entry found for region {region_id}")

        idata_trace_path = model_food_res.data[0]["file_path"]
        # trace_path = "trace_model_qn.nc"
        idata_trace_bytes = self.supabase.storage.from_(BUCKET_NAME).download(
            idata_trace_path
        )
        # Ghi ra file trên máy
        file_name = "idata_trace_bytes_to_database.nc"
        # Tạo đường dẫn đầy đủ
        file_path = os.path.join(CUSTOM_TMP_DIR, file_name)
        # Ghi file byte lấy từ supabase thành file
        with open(file_path, "wb") as f:
            f.write(idata_trace_bytes)
        # Đọc file bằng az sẽ chuyển thành InferenceData
        idata_trace = az.from_netcdf(file_path)
        # MAPPING
        # Unpack mappings
        mappings = json.loads(idata_trace.attrs["mappings"])
        dish_codes = mappings["dish_codes"]

        food_type_codes = mappings["food_type_codes"]
        food_type_codes = {str(k): v for k, v in food_type_codes.items()}

        timeslot_codes = mappings["timeslot_codes"]
        timeslot_codes = {int(k): v for k, v in timeslot_codes.items()}

        store_codes = mappings["store_codes"]
        store_codes = {int(k): v for k, v in store_codes.items()}

        res_dishes = self.supabase.from_("cip_dishes").select("*").execute()
        if not res_dishes.data or len(res_dishes.data) == 0:
            raise ValueError("Không có dữ liệu hoặc có lỗi khi truy vấn cip_dishes")
            # Tạo dict để tra nhanh
        dishes_dict = {d["id"]: d["name"] for d in res_dishes.data}
        food_types_dict = {d["id"]: d["food_type"] for d in res_dishes.data}

        #### TOI DAY ROIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII
        if store_id == 4:
            ### TÍNH FOOD
            # for index, result_customers in enumerate(result_customers_list):
            result_foods_by_timeslot = []
            # Dạng group theo ngày -> timeslot -> list dish
            grouped_dishes_by_date = defaultdict(list)
            for row in forecasted_customers_list:
                timeslot_id = row["timeslot_id"]
                row_date = row["date"]
                # Danh sách món dự đoán được theo từng ca từng ngày
                forecasted_dishes = forecast_dishes(
                    idata_trace=idata_trace,
                    dish_codes=dish_codes,
                    food_type_codes=food_type_codes,
                    timeslot_codes=timeslot_codes,
                    store_codes=store_codes,
                    pax=row["total_customers"],
                    store_id=store_id,
                    timeslot_id=timeslot_id,
                    date=row_date,
                )

                # Lưu kết quả theo từng món của tất cả ca của 1 ngày
                for item_id, info in forecasted_dishes.items():
                    # result_foods_by_timeslot.append(
                    dish_info_by_date_timeslot = {
                        "date": row_date,
                        "store_id": store_id,
                        "timeslot_id": timeslot_id,
                        "pax": row["total_customers"],
                        "dish_id": item_id,
                        "dish_name": dishes_dict.get(item_id, "Unknown"),
                        "food_type": food_types_dict.get(item_id, "Unknown"),
                        "consumed_amount_suat": info["forecast"],
                        "mu": info["mu"],
                        "hdi80_low": info["hdi80"][0],
                        "hdi80_high": info["hdi80"][1],
                        "hdi95_low": info["hdi95"][0],
                        "hdi95_high": info["hdi95"][1],
                    }
                    result_dishes_list.append(dish_info_by_date_timeslot)
                    # Chỉ group nếu ngày >= hôm nay
                    if row_date.date() > today:
                        grouped_dishes_by_date[row_date.strftime("%Y-%m-%d")].append(
                            dish_info_by_date_timeslot
                        )

            # Convert defaultdict về dict chuẩn
            grouped_dishes_by_date = [
                {"date": d, "dishes": dishes_data}
                for d, dishes_data in grouped_dishes_by_date.items()
            ]

            ### Tính nguyên liệu
            ### Dự báo Ingredient usage, rop
            list_all_results = []
            for ts_id in timeslot_ids:
                timeslot_id = ts_id
                # result_foods_by_timeslot = result_dishes_list.timeslot
                result_foods_by_timeslot = [
                    item
                    for item in result_dishes_list
                    if item["timeslot_id"] == timeslot_id
                ]
                df_inventory_level = forecast_ingredient(
                    self.supabase,
                    store_id,
                    timeslot_id,
                    result_foods_by_timeslot,
                )
                # Đã drop ngày nhỏ hơn trong hàm forecast_ingredient
                list_all_results.append(df_inventory_level)

            df_all_ingredients = pd.concat(list_all_results, ignore_index=True)
            df_all_ingredients = (
                df_all_ingredients.groupby(
                    ["date", "ingredient_id"], as_index=False
                ).agg(
                    {
                        "qty_on_hand": "sum",
                        "qty_received": "sum",
                        "qty_is_used": "sum",
                        "ending_inventory": "sum",
                        "ROP": "sum",
                        "order_up_to_level": "sum",
                        "order_placed": "all",
                        "order_qty": "sum",
                        "ingredient_name": "first",
                        "category": "first",
                        "expected_receipt_date":"last"
                    }
                )  # hoặc nhiều cột khác tuỳ bạn
            )
            result_ingredients_list = df_all_ingredients.to_dict(orient="records")
            result_ingredients = group_ingredients_by_date(result_ingredients_list)

        # Xử lí data cho frontend
        result_customers = filter_customers(forecasted_customers_list)

        return result_customers, grouped_dishes_by_date, result_ingredients

    # postgre func name: get_customer_statistics_latest
    def _get_customer_statistics_latest(
        self,
        region_id: int,
        timeslot_id: int,
        store_id: int,
    ):
        res = self.supabase.rpc(
            "get_customer_statistics_latest",
            {
                "p_region_id": region_id,
                "p_store_id": store_id,
                "p_timeslot_id": timeslot_id,
            },
        ).execute()
        return res

    def _get_flights_data(self, region_id, timeslot_id):
        res = (
            self.supabase.from_("cip_flights")
            .select("*")
            .eq("region_id", region_id)
            .eq("timeslot_id", timeslot_id)
            .execute()
        )
        return res

    def _get_model_customer(self, region_id):
        res = (
            self.supabase.table("cip_models")
            .select("file_path")
            .eq("region_id", region_id)
            .eq("type", "customer")
            .eq("status", "using")
            .execute()
        )
        if not res.data or len(res.data) == 0:
            raise ValueError(f"No model entry found for region {region_id}")

        file_path = res.data[0]["file_path"].strip()
        # print(file_path, "iiiiii")
        files = self.supabase.storage.from_(BUCKET_NAME).list()
        # print("Files in bucket:", [f["name"] for f in files])
        storage_res = self.supabase.storage.from_(BUCKET_NAME).download(file_path)
        # print(type(storage_res), "type")
        if not storage_res:
            raise ValueError(f"Model file not found at {file_path}")

            # Load model từ bytes
        model = joblib.load(BytesIO(storage_res))
        # print("Loaded object type:", type(model))
        return model
        # return


# Hàm xử lí logic không phải là method của class
def _forecast_customers(
    start_date,
    end_date,
    df_feat_latest,
    df_flights,
    df_weather,
    model,
    lags,
    roll_windows,
):
    # Lấy tên cửa hàng
    last_day = pd.to_datetime(df_feat_latest["date"]).max()
    # Ngày đầu predict -- vì cần tính từ ngày cuối cùng trong data
    forecast_start_date = last_day + pd.Timedelta(days=1)
    # forecast_start_date = pd.to_datetime(forecast_start_date).tz_localize(None)
    # end = pd.to_datetime(end).tz_localize(None)
    end_date = normalize_datetime(end_date)
    # print(forecast_start_date, "----", end_date)
    # Range forecast date
    forecast_dates = pd.date_range(start=forecast_start_date, end=end_date)

    # Chuẩn về datetime
    df_flights["date"] = pd.to_datetime(df_flights["date"])

    result_customers = []  # lưu kết quả dự đoán

    for date in forecast_dates:
        day_of_week = date.weekday()

        # sin/cos encoding
        dow_sin = np.sin(2 * np.pi * day_of_week / 7)
        dow_cos = np.cos(2 * np.pi * day_of_week / 7)

        # Cuối tuần
        is_weekend = int(day_of_week in [5, 6])

        # MONTH
        month = date.month
        # YEAR
        year = date.year

        # IS_HOLIDAY
        holiday = 0

        timeslot = df_feat_latest["timeslot"].iloc[0]
        timeslot_id = df_feat_latest["timeslot_id"].iloc[0]
        shift_sin = np.sin(2 * np.pi * timeslot / 24)
        shift_cos = np.cos(2 * np.pi * timeslot / 24)
        # Lấy rain và temp_avg
        weather_data = df_weather.loc[
            (df_weather["date"].dt.date == date.date())
            & (df_weather["timeslot"] == timeslot),
            ["temp_avg", "rain"],
        ]
        # print(df_weather["date"].dt.date, "tytyty")

        temp_avg = float(weather_data["temp_avg"].iloc[0])
        rain = int(weather_data["rain"].iloc[0])
        # print(df_flights, "tytyty")
        # Lấy chuyến bay từ db
        flights_row = df_flights.loc[
            (df_flights["date"] == date.normalize())
            & (df_flights["timeslot"] == timeslot),
            ["flight"],
        ]
        flights = int(flights_row["flight"].iloc[0])

        new_rows = {
            "date": date,
            "store_name": df_feat_latest["store_name"].iloc[0],
            "timeslot_id": timeslot_id,
            "timeslot": timeslot,
            "flights": flights,
            "temp_avg": temp_avg,
            "rain": rain,
            "dow": day_of_week,
            "dow_sin": dow_sin,
            "dow_cos": dow_cos,
            "shift_sin": shift_sin,
            "shift_cos": shift_cos,
            "is_weekend": is_weekend,
            "month": month,
            "year": year,
            "is_holiday": holiday,
        }

        # TỚI ĐÂY RỒI CÒN TÍNH ROLL, LAG, rồi dự doán

        # Tạo df 1 dòng
        df_new_row = pd.DataFrame([new_rows])
        df_feat_latest = pd.concat([df_feat_latest, df_new_row], ignore_index=True)

        df_feat_latest["date"] = pd.to_datetime(df_feat_latest["date"])
        df_feat_latest = df_feat_latest.sort_values(["date"]).reset_index(drop=True)

        # Lấy index của dòng mới
        new_idx = df_feat_latest.index[-1]

        # Tính lag, roll
        for lag in lags:
            # Cập nhật vào file cũ
            df_feat_latest.at[new_idx, f"lag_{lag}"] = df_feat_latest[
                "total_customers"
            ].iloc[-(lag + 1)]
            # Cập nhật vào df mới
            df_new_row[f"lag_{lag}"] = df_feat_latest["total_customers"].iloc[
                -(lag + 1)
            ]

        for w in roll_windows:
            # MEAN
            df_feat_latest.at[new_idx, f"roll_mean_{w}"] = (
                df_feat_latest["total_customers"].iloc[-(w + 1) : -1].mean()
            )

            df_new_row[f"roll_mean_{w}"] = (
                df_feat_latest["total_customers"].iloc[-(w + 1) : -1].mean()
            )
            # STD
            df_feat_latest.at[new_idx, f"roll_std_{w}"] = (
                df_feat_latest["total_customers"].iloc[-(w + 1) : -1].std()
            )

            df_new_row[f"roll_std_{w}"] = (
                df_feat_latest["total_customers"].iloc[-(w + 1) : -1].std()
            )

        # print(df_new_row.columns, "new_row")
        # print(df_feat_latest.index[-1], "new_row1")
        # mask = (df_feat_latest["date"] == date) & (
        #     df_feat_latest["store_name"] == store
        # )
        # df_day = df_feat_latest.loc[mask].copy()

        # Lấy tất cả các cột trong df_day, loại bỏ 'total_customers'
        # feature_cols = [c for c in df_new_row.columns if c not in ["total_customers"]]
        # Sắp xếp cột theo alphabet
        df_new_row = df_new_row.reindex(sorted(df_new_row.columns), axis=1)
        # Tạo feature
        # X = df_new_row.reindex(sorted(df_new_row.columns), axis=1)
        # X = df_day[
        #     sorted(feature_cols)
        # ]  # các cột input model đã sắp xếp theo alphabet
        # scaler = MinMaxScaler()
        preprocessor = model.named_steps["preprocessor"]
        xgb_model = model.named_steps["model"]
        X_transformed = preprocessor.transform(df_new_row)

        # Dự đoán
        y_pred = xgb_model.predict(X_transformed)

        # Cập nhật trực tiếp vào df_latest_qn
        # df_feat_latest.loc[mask, "total_customers"] = y_pred
        # y_pred_value = float(y_pred[0])
        y_pred_value = int((y_pred[0] + 0.5) // 1)
        # Cập nhật lại dòng cuối (mới nhất)
        df_feat_latest.at[new_idx, "total_customers"] = y_pred_value
        # Ghi ra df khác
        df_new_row["total_customers"] = y_pred_value

        # lưu lại kết quả của tháng mới
        # chuyển thành dict rồi append
        # check ngày mới thêm vào result
        # row_date = df_new_row["date"].iloc[0]
        # start_date = normalize_datetime(start_date)
        # print(start_date, row_date)
        # if row_date >= start_date:
        result_customers.append(df_new_row.to_dict(orient="records")[0])
        # # new_month_data.append(df_new_row)
        # print(y_pred_value, "y_pred_value")
        # print(result_customers, "y_pred")

    # gộp toàn bộ dự đoán tháng mới
    # df_new_result = pd.concat(new_month_data, ignore_index=True)

    ## CHECK NaN
    # print(df_feat_latest[df_feat_latest.isna().any(axis=1)], "nan check")
    return result_customers


def fill_nan_weather(df_weather):
    # forward fill trước (lấy giá trị trước đó)
    df_weather[["temp_avg", "rain"]] = df_weather[["temp_avg", "rain"]].fillna(
        method="ffill"
    )

    # nếu đầu bảng vẫn còn NaN thì dùng backward fill (giá trị sau đó)
    df_weather[["temp_avg", "rain"]] = df_weather[["temp_avg", "rain"]].fillna(
        method="bfill"
    )

    return df_weather


def normalize_datetime(dt):
    dt = pd.to_datetime(dt)
    if dt.tzinfo is not None:  # Nếu có timezone
        dt = dt.tz_convert(None)  # bỏ timezone
    else:  # Nếu không có timezone
        dt = dt.tz_localize(None)  # vẫn đảm bảo naive
    return dt


def forecast_dishes(
    idata_trace,
    dish_codes,
    food_type_codes,
    timeslot_codes,
    store_codes,
    pax,
    store_id,
    timeslot_id,
    date,
    hdi_probs=[0.8, 0.95],
):
    """
    Returns:
        dict: {Item_ID: {"forecast": int, "mu": float, "hdi80": (low, high), "hdi95": (low, high)}}
    """
    # # Unpack mappings
    # mappings = json.loads(idata_trace.attrs["mappings"])
    # dish_codes = mappings["dish_codes"]

    # # food_type_codes = mappings["food_type_codes"]
    # # food_type_codes = {int(k): v for k, v in food_type_codes.items()}

    # timeslot_codes = mappings["timeslot_codes"]
    # timeslot_codes = {int(k): v for k, v in timeslot_codes.items()}

    # store_codes = mappings["store_codes"]
    # store_codes = {int(k): v for k, v in store_codes.items()}

    # dishes_list = mappings["dishes_list"]
    # timeslot_idx_obs = np.array(mappings["timeslot_idx_obs"], dtype=int)
    # store_idx_obs = np.array(mappings["store_idx_obs"], dtype=int)
    # dish_idx_obs = np.array(mappings["dish_idx_obs"], dtype=int)

    # print("store_codes:", store_codes)
    # print("dish_codes:", dish_codes)
    # "timeslot_idx_obs": timeslot_idx_obs,
    #             "store_idx_obs": store_idx_obs,
    # Posterior  cho món có độ dài bằng sô món
    mu_inter_mean = idata_trace.posterior["mu_interaction"].mean(dim=("chain", "draw"))

    # HDI intervals
    hdi_results = {
        p: az.hdi(idata_trace.posterior["mu_interaction"], hdi_prob=p)
        for p in hdi_probs
    }

    # Filter theo store & timeslot
    store_index = store_codes[store_id]
    timeslot_index = timeslot_codes[timeslot_id]
    # mask = (store_idx_obs == store_index) & (timeslot_idx_obs == timeslot_index)

    # Mảng chứa cr_mean có thứ tự theo mask
    # mu_item_filtered = mu_item_mean[mask]
    # dish_idx_filtered = dish_idx_obs[mask]
    # Mảng chứa tên món có thứ tự theo mask
    # selected_items = [it for it, idx in dish_codes.items() if mask[idx]]

    # print(selected_items, "item_codes 1")
    # print(dish_codes, "item_codes")
    # if len(selected_items) == 0:
    #     return {}

    # # Xác suất phân bổ
    # probs = mu_item_filtered / mu_item_filtered.sum()

    # Phân bổ khách
    # allocation = np.random.multinomial(pax, probs)
    # allocation = pax * mu_item_filtered

    # Build result
    # result = {
    #     "date": date,
    #     "timeslot": timeslot_id,
    # }
    forecasted_dish_list = {}

    for dish_id, dish_index in dish_codes.items():
        # item = {
        #     "date": date,
        #     "timeslot": timeslot_id,
        # }
        # idx = dish_codes[item_id]
        # item_info = {"forecast": int(allocation[i]), "mu": float(mu_item_filtered[i])}
        # Lấy mu cho từng dish, timeslot, store
        mu_hat = float(
            mu_inter_mean.sel(
                mu_interaction_dim_0=dish_index,
                mu_interaction_dim_1=timeslot_index,
                mu_interaction_dim_2=store_index,
            ).values
        )
        # Số suất dự báo = pax * mu_hat
        forecast = int(round(pax * mu_hat))
        item_info = {
            "forecast": forecast,
            "mu": mu_hat,
        }

        # Thêm HDI cho từng mức
        for p, hdi in hdi_results.items():
            hdi_da = hdi["mu_interaction"]
            low = float(
                hdi_da.isel(
                    mu_interaction_dim_0=dish_index,
                    mu_interaction_dim_1=timeslot_index,
                    mu_interaction_dim_2=store_index,
                    hdi=0,
                ).item()
            )
            high = float(
                hdi_da.isel(
                    mu_interaction_dim_0=dish_index,
                    mu_interaction_dim_1=timeslot_index,
                    mu_interaction_dim_2=store_index,
                    hdi=1,
                ).item()
            )
            item_info[f"hdi{int(p * 100)}"] = (low, high)

        forecasted_dish_list[dish_id] = item_info

        # # Add HDI
        # for p, hdi in hdi_results.items():
        #     # chuyển sang numpy array
        #     if isinstance(hdi, xr.Dataset):
        #         # Giả sử biến là 'mu_item' trong Dataset
        #         hdi_da = hdi["mu_item"]
        #     else:
        #         hdi_da = hdi

        #     hdi_np = hdi_da.values  # shape = (n_items, 2)
        #     low = float(hdi_np[idx, 0])
        #     high = float(hdi_np[idx, 1])
        #     item_info[f"hdi{int(p * 100)}"] = (low, high)

        # result[item_id] = item_info
    # result["forecasted_dish_list"] = forecasted_dish_list
    return forecasted_dish_list


def forecast_ingredient(supabase, store_id, timeslot_id, food_distribute):
    # Lấy ingredient_master = cip_ingredient mà không có Avg_Daily_Ussage	ROP	SS	StdDailyDemand	Order_Up_To_Level => Tính lại mỗi lần gọi
    res_ingredient_master = supabase.from_("cip_ingredients").select("*").execute()
    # kiểm tra có dữ liệu không
    if not res_ingredient_master.data:
        raise ValueError("Không có dữ liệu hoặc có lỗi khi truy vấn bom")
    df_ingredient_master = pd.DataFrame(res_ingredient_master.data)
    df_ingredient_master = df_ingredient_master.rename(
        columns={"id": "ingredient_id", "name": "ingredient_name"}
    )
    # print(df_ingredient_master)
    # Lấy BOM
    res_bom = supabase.from_("cip_bom").select("*").execute()
    # kiểm tra có dữ liệu không
    if not res_bom.data:
        raise ValueError("Không có dữ liệu hoặc có lỗi khi truy vấn bom")
    df_bom = pd.DataFrame(res_bom.data)

    # Lấy Log refill
    res_log = (
        supabase.from_("cip_log_refill")
        .select("*")
        .eq("store_id", store_id)
        .eq("timeslot_id", timeslot_id)
        .execute()
    )
    # kiểm tra có dữ liệu không
    if not res_log.data:
        raise ValueError("Không có dữ liệu hoặc có lỗi khi truy vấn log")
    # tạo df lof refill
    df_log = pd.DataFrame(res_log.data)

    # Vì không realtime data nên xem forecast là real => merge vào log_refill để tính ROP
    # chuyển thành DataFrame
    df_food_distribute = pd.DataFrame(food_distribute)
    # df_food_distribute = df_food_distribute.rename(
    #     columns={
    #         "forecast": "consumed_amount_suat",
    #     }
    # )
    df_log = df_log[
        ["date", "store_id", "timeslot_id", "dish_id", "pax", "consumed_amount_suat"]
    ]
    # print(df_food_distribute.columns, "colums")
    df_food_distribute = df_food_distribute[
        ["date", "store_id", "timeslot_id", "dish_id", "pax", "consumed_amount_suat"]
    ]
    df_log_refill_full = pd.concat([df_log, df_food_distribute], ignore_index=True)
    df_log_refill_full["date"] = pd.to_datetime(df_log_refill_full["date"])

    # Merge theo Item_ID + Item_Name
    df_demand = df_log_refill_full.merge(
        df_bom[["dish_id", "ingredient_id", "converted_amount_g"]],
        on=["dish_id"],
        how="inner",
    )
    # Tính toán Ingredient_Usage
    df_demand["ingredient_usage"] = pd.to_numeric(
        df_demand["consumed_amount_suat"], errors="coerce"
    ).fillna(0) * pd.to_numeric(
        df_demand["converted_amount_g"], errors="coerce"
    ).fillna(0)

    # final_df = final_df.rename(
    #     columns={"dish_id": "Dish_Order", "Item_Name": "Dish_Name"}
    # )
    df_demand = df_demand[
        ["date", "timeslot_id", "dish_id", "ingredient_id", "ingredient_usage"]
    ]
    # Giữ thứ tự món ăn theo ngày demand = df_merge = history_demand
    df_demand = df_demand.sort_values(["date", "dish_id"]).reset_index(drop=True)

    # 2. Gom usage theo ngày cho từng nguyên liệu
    daily_usage = (
        df_demand.groupby(["date", "ingredient_id"])["ingredient_usage"]
        .sum()
        .reset_index()
    )
    stats = (
        daily_usage.groupby(["ingredient_id"])["ingredient_usage"]
        .agg(avg_daily_usage="mean", std_daily_demand="std")
        .reset_index()
    )
    # print(stats["ingredient_id"].unique())
    # print(daily_usage.columns, "kkk")

    # print(f"Tổng số ingredient_id trong stats: {stats['ingredient_id'].nunique()}")
    df_ingredient_master["avg_daily_usage"] = (
        df_ingredient_master["ingredient_id"].map(
            stats.set_index("ingredient_id")["avg_daily_usage"]
        )
    ).fillna(0)

    df_ingredient_master["std_daily_demand"] = (
        df_ingredient_master["ingredient_id"].map(
            stats.set_index("ingredient_id")["std_daily_demand"]
        )
    ).fillna(0)

    # df_ingredient_master = df_ingredient_master.merge(
    #     stats, on=["ingredient_id"], how="left"
    # )

    # Đếm số NaN trong cột
    # nan_count = df_ingredient_master["avg_daily_usage"].isna().sum()
    # print(f"Số nguyên liệu có avg_daily_usage = NaN: {nan_count}")

    # # Lọc danh sách nguyên liệu bị NaN
    # nan_rows = df_ingredient_master[df_ingredient_master["avg_daily_usage"].isna()]
    # print(nan_rows[["ingredient_id", "avg_daily_usage"]])
    # c2:
    # df_ingredient_master = df_ingredient_master.merge(
    #     stats, on=["ingredient_id"], how="left"
    # )
    # 5. Ghi đè giá trị mới
    # df_ingredient_master["avg_daily_usage"] = df_ingredient_master["avg_daily_usage_calc"]
    # df_ingredient_master["std_daily_demand"].fillna(0, inplace=True)

    # 6. Tính SS, ROP
    SS_FACTOR = 0.5
    df_ingredient_master["SS"] = (
        df_ingredient_master["avg_daily_usage"]
        * df_ingredient_master["lead_time"]
        * SS_FACTOR
    )
    df_ingredient_master["ROP"] = (
        df_ingredient_master["avg_daily_usage"]
        * df_ingredient_master["lead_time"]
        * (1 + SS_FACTOR)
    )

    # 7. Tính Order_Up_To_Level với z=1.65 (~95% service level)
    z = 1.65
    # df_ingredient_master["order_up_to_level"] = np.minimum(
    #     df_ingredient_master["avg_daily_usage"] * df_ingredient_master["lead_time"]
    #     + z * df_ingredient_master["std_daily_demand"],
    #     df_ingredient_master["avg_daily_usage"] * df_ingredient_master["shelf_life"],
    # )
    calc1 = (
        df_ingredient_master["avg_daily_usage"] * df_ingredient_master["lead_time"]
        + z * df_ingredient_master["std_daily_demand"]
    )
    calc2 = df_ingredient_master["avg_daily_usage"] * df_ingredient_master["shelf_life"]

    oul_raw = np.minimum(calc1, calc2)
    df_ingredient_master["order_up_to_level"] = np.maximum(
        df_ingredient_master["ROP"], oul_raw
    )

    ### df_demand = history =
    # df_demand["date"] = pd.to_datetime(df_demand["Date"]).dt.date
    # === 2) Tính tổng nhu cầu (Qty_Issued) theo ngày + nguyên liệu ===
    daily_usage = daily_usage.rename(columns={"ingredient_usage": "qty_is_used"})
    # print(daily_usage["qty_issued"].head(), "daily_usage")
    # === 3) Lấy thông tin chính sách đặt hàng từ bảng master ===
    cols_needed = [
        "ingredient_id",
        "order_up_to_level",
        "ROP",
        "lead_time",
        "ingredient_name",
        "category",
    ]
    # print(df_ingredient_master.columns, "iiiii")
    df_master_small = df_ingredient_master[cols_needed].copy()
    # print(df_master_small.columns, "iiiii22")

    # === 4) Tạo danh sách ngày đầy đủ từ min -> max trong demand ===
    all_dates = pd.date_range(
        df_demand["date"].min(), df_demand["date"].max(), freq="D"
    ).date
    # print(df_demand["date"].min(), "min")
    # print(df_demand["date"].max(), "max")
    # === 5) Mô phỏng tồn kho theo policy (s, S) với lead time ===
    records = []
    for ing_id, row in df_master_small.set_index("ingredient_id").iterrows():
        # print(ing_id,"row")
        OUL = round(float(row["order_up_to_level"]), 0)
        ROP = round(float(row["ROP"]), 0)
        ingredient_name = row["ingredient_name"]
        category = row["category"]
        lead = int(row["lead_time"]) if not pd.isna(row["lead_time"]) else 0
        # Bản đồ nhu cầu theo ngày
        is_used_map = daily_usage[daily_usage["ingredient_id"] == ing_id].set_index(
            "date"
        )
        on_hand = None
        on_order_qty = 0.0
        pipeline = {}  # {ngày_nhận: số_lượng}

        for d in all_dates:
            # Nhận hàng nếu đến ngày
            qty_received = round(pipeline.pop(d, 0.0), 0)
            on_order_qty -= qty_received

            # Ngày đầu tiên: tồn = OUL
            if on_hand is None:
                on_hand = OUL

            # Xuất kho theo nhu cầu
            try:
                qty_is_used = round(
                    float(is_used_map.loc[pd.Timestamp(d), "qty_is_used"]), 0
                )
            except KeyError:
                qty_is_used = 0.0
                # print(qty_issued, "qty_issued qty_issued")
            ending_before = round((on_hand + qty_received - qty_is_used), 0)

            # Kiểm tra reorder
            order_qty = 0.0
            order_placed = False
            exp_rcv_date = None
            # print(ending_before, "daily_usage12 e")
            # print(ROP, "daily_usage12 r")
            if ending_before < ROP:
                inv_pos = ending_before + on_order_qty
                order_qty = round(max(OUL - inv_pos, 0.0), 0)
                if order_qty > 0:
                    order_placed = True
                    exp_rcv_date = (pd.to_datetime(d) + pd.Timedelta(days=lead)).date()
                    pipeline[exp_rcv_date] = pipeline.get(exp_rcv_date, 0.0) + order_qty
                    on_order_qty += order_qty

            # Tồn cuối ngày
            ending_inv = ending_before

            records.append(
                {
                    "date": d,
                    "timslot_id": timeslot_id,
                    "ingredient_id": ing_id,
                    "ingredient_name": ingredient_name,
                    "category": category,
                    "qty_on_hand": on_hand,
                    "qty_received": qty_received,
                    "qty_is_used": qty_is_used,
                    "ending_inventory": ending_inv,
                    "ROP": ROP,
                    "order_up_to_level": OUL,
                    "lead_time": lead,
                    "order_placed": order_placed,
                    "order_qty": order_qty,
                    "expected_receipt_date": exp_rcv_date,
                }
            )

            # Chuyển sang ngày tiếp theo
            on_hand = ending_inv

    inv_daily = pd.DataFrame.from_records(records)
    # Chuyển cột date từ string sang datetime
    inv_daily["date"] = pd.to_datetime(inv_daily["date"], format="%Y-%m-%d")
    # Lọc các dòng date >= hôm nay
    today = pd.Timestamp(date.today())
    inv_daily = inv_daily[inv_daily["date"] > today]

    expected_ids_sorted = sorted(
        df_ingredient_master["ingredient_id"].dropna().astype(str).unique(),
        key=lambda x: int(re.search(r"(\d+)$", x).group(1))
        if re.search(r"(\d+)$", x)
        else 10**9,
    )

    cat_type = pd.CategoricalDtype(categories=expected_ids_sorted, ordered=True)

    inv_daily["ingredient_id"] = inv_daily["ingredient_id"].astype(str)
    inv_daily["ingredient_id_cat"] = inv_daily["ingredient_id"].astype(cat_type)

    # inv_sorted = (
    #     inv_daily.sort_values(["date", "ingredient_id_cat"])
    #     .drop(columns=["ingredient_id_cat"])
    #     .reset_index(drop=True)
    # )
    inv_sorted = (
        inv_daily.sort_values(["date", "ingredient_id_cat"])
        .loc[lambda df: ~((df["qty_is_used"] == 0) & (df["qty_received"] == 0))]
        .drop(columns=["ingredient_id_cat"])
        .reset_index(drop=True)
    )

    # inv_sorted === sheet inventory_level
    # inv_sorted.to_excel("check.xlsx", sheet_name="Inventory_Level", index=False)

    return inv_sorted


# def compute_po_for_month(
#     start_date, end_date, df_inventory_level, df_ingredients_master, df_demand
# ) -> pd.DataFrame:
#     """Compute POs for a given start-end date using ROP/OUL/LeadTime policies.
#     Returns a DataFrame with columns:
#       PO_ID, Ingredient_ID, Order_Date, Qty_Ordered, Expected_Receipt_Date,
#       Lead_Time_Days, Policy_ROP, Order_Up_To_Level
#     """
#     # inv = pd.read_excel(src_path, sheet_name="Inventory_Level")
#     # ing = pd.read_excel(src_path, sheet_name="Ingredients_Master")
#     # dem = pd.read_excel(src_path, sheet_name="Demand")

#     df_inventory_level["date"] = pd.to_datetime(df_inventory_level["Date"])
#     df_demand["date"] = pd.to_datetime(df_demand["date"])
#     msk = (df_demand["date"] >= start_date) & (df_demand["date"] <= end_date)
#     sep_demand = (
#         df_demand.loc[msk]
#         .groupby(["date", "ingredient_id"], as_index=False)["ingredient_usage"]
#         .sum()
#         .rename(columns={"ingredient_usage": "demand"})
#     )

#     # Policy
#     policy = df_ingredients_master[
#         ["ingredient_id", "ROP", "order_up_to_level", "lead_time"]
#     ].copy()
#     policy.columns = ["ingredient_id", "ROP", "OUL", "lead_time"]

#     # Start inventory = ending inventory at last date in Inventory_Level
#     last_date = df_inventory_level["date"].max()
#     last_end = df_inventory_level.loc[
#         df_inventory_level["date"] == last_date, ["ingredient_id", "ending_inventory"]
#     ].rename(columns={"ending_inventory": "ending_inv"})
#     start_inv = last_end.set_index("ingredient_id")["ending_inv"].to_dict()

#     dates = pd.date_range(start_date, end_date, freq="D")
#     po_rows = []
#     for ing_id, row in policy.set_index("ingredient_id").iterrows():
#         rop = float(row["ROP"])
#         oul = float(row["OUL"])
#         lt = int(round(row["LeadTime"])) if pd.notna(row["LeadTime"]) else 2


#         inv_level = float(start_inv.get(ing_id, oul))
#         receipts = {}
#         po_count = 0
# def filter_list_by_today(lst, today):
#     filtered = []
#     for item in lst:
#         item_date = item.get("date")
#         if isinstance(item_date, str):
#             item_date = datetime.strptime(item_date, "%Y-%m-%d").date()
#         elif isinstance(item_date, datetime):
#             item_date = item_date.date()


#         if item_date >= today:
#             filtered.append(item)
#     return filtered
def filter_list_by_today(list, today):
    return [
        item
        for item in list
        if (
            (
                datetime.fromisoformat(item["date"]).date()
                if isinstance(item["date"], str)
                else item["date"].date()
            )
            > today
        )
    ]


def filter_customers(customers_list):
    today = date.today()
    agg = defaultdict(dict)
    for row in customers_list:
        item_date = (
            datetime.fromisoformat(row["date"]).date()
            if isinstance(row["date"], str)
            else row["date"].date()
        )
        if item_date > today:  # chỉ lấy ngày lớn hơn hôm nay
            agg[row["date"]][row["timeslot_id"]] = row.get("total_customers", 0)

    # Chuyển thành list of dict
    result = []
    for day, timeslots in agg.items():
        entry = {"date": day}
        entry.update(timeslots)  # merge dict timeslots vào level 1
        result.append(entry)
    return result


def group_ingredients_by_date(ingredients_list):
    # today = date.today()
    grouped_ingredients_by_date = defaultdict(list)
    for row in ingredients_list:
        item_date = (
            datetime.fromisoformat(row["date"]).date()
            if isinstance(row["date"], str)
            else row["date"].date()
        )
        grouped_ingredients_by_date[item_date].append(row)
    result = [
        {"date": date, "ingredients": ings}
        for date, ings in grouped_ingredients_by_date.items()
    ]
    return result


def group_items_by_date(
    items: List[Dict[str, Any]], today: date = None
) -> List[Dict[str, Any]]:
    """
    Gom các dict theo ngày và lọc chỉ giữ ngày sau hôm nay.

    items: list of dicts, mỗi dict phải có key "date" (ISO string hoặc datetime)
    today: datetime.date, mặc định là ngày hiện tại
    """
    if today is None:
        today = date.today()

    grouped = defaultdict(list)

    for item in items:
        # Chuyển ISO string hoặc datetime sang date
        item_date = item["date"]
        if isinstance(item_date, str):
            item_date = datetime.fromisoformat(item_date).date()
        elif isinstance(item_date, datetime):
            item_date = item_date.date()

        if item_date > today:  # chỉ giữ ngày sau hôm nay
            grouped[item_date].append(item)

    # Chuyển thành list dạng mong muốn và sort theo ngày tăng dần
    result = [{"date": d.isoformat(), "items": grouped[d]} for d in sorted(grouped)]

    return result
