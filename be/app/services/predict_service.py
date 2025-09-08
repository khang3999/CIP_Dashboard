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
        print(start_date, "ppppppppppppppp")
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
        model = self._get_model(region_id)
        result_customers = _forecast_customers(
            start_date=start_date,
            end_date=end_date,
            df_feat_latest=df_feat_latest,
            df_flights=df_flights,
            df_weather=df_weather,
            model=model,
            lags=[1, 7, 14, 28],
            roll_windows=[3, 7, 14, 28],
        )
        print(result_customers, "testtttt")

        ##### ====== ####
        ### Dự đoán phân bổ món ăn
        # Load config, và trace
        trace_path = f"trace_model_{'qn' if region_id == 2 else 'qt'}.nc"
        trace_bytes = self.supabase.storage.from_(BUCKET_NAME).download(trace_path)
        # Load config
        mappings_bytes = self.supabase.storage.from_(BUCKET_NAME).download(
            CONFIG_MODEL_PATH
        )

        # # tạo BytesIO
        # bio = BytesIO(trace_bytes)

        # # Mở NetCDF với engine 'h5netcdf'
        # trace_model = xr.open_dataset(bio, engine="h5netcdf", decode_times=True)

        # trace_model = trace_model.load()
        trace_model = load_trace_from_bytes(trace_bytes)

        mappings_model = joblib.load(BytesIO(mappings_bytes))

        food_distributions = forecast_dishes(
            trace_model, mappings_model, 10, store_id, timeslot_id
        )
        result_food = []

        for row in result_customers:
            allocation = forecast_dishes(
                trace=trace_model,
                mappings=mappings_model,
                pax=row["total_customers"],
                store_id=store_id,
                timeslot=timeslot_id,
            )

            # Lưu kết quả theo từng món

            for item_id, info in allocation.items():
                result_food.append(
                    {
                        "date": row["date"],
                        "store_id": row["store_name"],
                        "timeslot": row["timeslot"],
                        "item_id": item_id,
                        "forecast": info["forecast"],
                        "mu": info["mu"],
                        "hdi80_low": info["hdi80"][0],
                        "hdi80_high": info["hdi80"][1],
                        "hdi95_low": info["hdi95"][0],
                        "hdi95_high": info["hdi95"][1],
                    }
                )

        return result_customers, result_food

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

    def _get_model(self, region_id):
        res = (
            self.supabase.table("cip_models")
            .select("file_path")
            .eq("region_id", region_id)
            .eq("status", "using")
            .execute()
        )
        if not res.data or len(res.data) == 0:
            raise ValueError(f"No model entry found for region {region_id}")

        file_path = res.data[0]["file_path"].strip()
        print(file_path, "iiiiii")
        files = self.supabase.storage.from_(BUCKET_NAME).list()
        print("Files in bucket:", [f["name"] for f in files])
        storage_res = self.supabase.storage.from_(BUCKET_NAME).download(file_path)
        print(type(storage_res), "type")
        if not storage_res:
            raise ValueError(f"Model file not found at {file_path}")

            # Load model từ bytes
        model = joblib.load(BytesIO(storage_res))
        print("Loaded object type:", type(model))
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
    print(forecast_start_date, "----", end_date)
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

        print(df_new_row.columns, "new_row")
        print(df_feat_latest.index[-1], "new_row1")
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
        row_date = df_new_row["date"].iloc[0]
        start_date = normalize_datetime(start_date)
        print(start_date, row_date)
        if row_date >= start_date:
            result_customers.append(df_new_row.to_dict(orient="records")[0])
        # new_month_data.append(df_new_row)
        print(y_pred_value, "y_pred_value")
        print(result_customers, "y_pred")

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


def forecast_dishes(trace, mappings, pax, store_id, timeslot_id, hdi_probs=[0.8, 0.95]):
    """
    Phân bổ món ăn dựa trên trace, mappings và số khách dự báo (PAX).

    Args:
        trace: arviz InferenceData (đã load từ .nc bằng az.from_netcdf)
        mappings: dict chứa các ánh xạ (item_codes, store_codes, timeslot_codes, item_store_idx, item_timeslot_idx)
        pax: int, số khách dự báo
        store_id: str, mã cửa hàng (vd: "HCM01")
        timeslot: str, ca ăn (vd: "lunch")
        hdi_probs: list, mức HDI muốn tính (vd: [0.8, 0.95])

    Returns:
        dict: {Item_ID: {"forecast": int, "mu": float, "hdi80": (low, high), "hdi95": (low, high)}}
    """
    # Unpack mappings
    item_codes = mappings["item_codes"]
    store_codes = mappings["store_codes"]
    timeslot_codes = mappings["timeslot_codes"]
    item_store_idx = mappings["item_store_idx"]
    item_timeslot_idx = mappings["item_timeslot_idx"]

    # Posterior mean
    mu_item_mean = trace.posterior["mu_item"].mean(dim=("chain", "draw")).values

    # HDI intervals
    hdi_results = {p: az.hdi(trace.posterior["mu_item"], hdi_prob=p) for p in hdi_probs}

    # Filter theo store & timeslot
    store_idx = store_codes[store_id]
    timeslot_idx = timeslot_codes[timeslot_id]
    mask = (item_store_idx == store_idx) & (item_timeslot_idx == timeslot_idx)

    mu_item_filtered = mu_item_mean[mask]
    selected_items = [it for it, idx in item_codes.items() if mask[idx]]

    if len(selected_items) == 0:
        return {}

    # Xác suất phân bổ
    probs = mu_item_filtered / mu_item_filtered.sum()

    # Phân bổ khách
    allocation = np.random.multinomial(pax, probs)

    # Build result
    result = {}
    for i, item_id in enumerate(selected_items):
        idx = item_codes[item_id]
        item_info = {"forecast": int(allocation[i]), "mu": float(mu_item_mean[idx])}
        # Add HDI
        for p, hdi in hdi_results.items():
            low = float(hdi.isel(mu_item_dim_0=idx).isel(hdi=0).item())
            high = float(hdi.isel(mu_item_dim_0=idx).isel(hdi=1).item())
            item_info[f"hdi{int(p * 100)}"] = (low, high)

        result[item_id] = item_info

    return result


def load_trace_from_bytes(trace_bytes: bytes):
    # Tạo file tạm, giữ lại cho đến khi load xong
    tmp = tempfile.NamedTemporaryFile(suffix=".nc", delete=False)
    tmp.write(trace_bytes)
    tmp.flush()
    tmp.close()  # Đóng file để h5netcdf mở được

    trace_model = az.from_netcdf(tmp.name)

    # Xóa file tạm sau khi load xong

    os.remove(tmp.name)

    return trace_model
