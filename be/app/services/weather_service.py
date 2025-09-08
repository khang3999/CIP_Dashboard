import re, time
from supabase import Client
from app.supabase_client import supabase
from datetime import datetime, timedelta
import calendar
import requests
import pandas as pd




class WeatherService:
    url_future = f"https://api.open-meteo.com/v1/forecast?latitude=10.8188&longitude=106.6519&hourly=temperature_2m,rain&forecast_days={16}"

    def __init__(self, supabase: Client):
        self.supabase = supabase

    # Lấy dữ liệu thời tiết từ ngày cuối trong data đến ngày dự đoán 
    def get_weather_from_api(
        self,url: str = None, step: str = "hourly"
    ) -> pd.DataFrame:
        if url is None:
            url = self.url_future
        response = requests.get(url)

        try:
            data = response.json()
        except requests.JSONDecodeError:
            print("Response không phải JSON:", response.text)
            return pd.DataFrame()

        # Xử lí json
        step_data = data.get(step, {})
        time_arr = step_data.get("time", [])
        # temperature_arr = step_data.get("temperature_2m", [])
        rain_arr = step_data.get("rain", [])

        temperature_arr = [
            t if t is not None else None for t in step_data.get("temperature_2m", [])
        ]

        data_obj = {
            "date": time_arr,
            "temp_avg": temperature_arr,
            "rain": rain_arr,
        }

        df = pd.DataFrame(data_obj)

        # Ép datetime
        df["date"] = pd.to_datetime(df["date"])
        df_weather_timeslot = (
            df.resample("8h", on="date")
            .agg({"temp_avg": "mean", "rain": lambda x: 1 if x.max() > 0 else 0})
            .reset_index()
        )

        # Dán cột mới vào
        df_weather_timeslot["timeslot"] = df_weather_timeslot["date"].dt.hour
        # Bỏ time trong date
        df_weather_timeslot["date"] = df_weather_timeslot["date"].dt.normalize()
        # records = df_weather_timeslot.to_dict(orient="records")
        # return records
        return df_weather_timeslot
