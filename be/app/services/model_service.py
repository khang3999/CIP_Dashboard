from supabase import Client
import joblib
import arviz as az
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
import optuna
from sklearn.model_selection import TimeSeriesSplit
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor
import matplotlib.pyplot as plt
import os
from sklearn.pipeline import Pipeline
from app.config import BUCKET_NAME
import re
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body
import pymc as pm
import pytensor.tensor as at
import math
import io
import json
import tempfile
import pathlib
import lzma
from app.config import CUSTOM_TMP_DIR


class ModelService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    def read_model(type: int, model_name: str):
        pass

    async def create_new_model(
        self,
        file_bytes,
        model_name,
        model_type,
        region_id,
    ):
        timestamp = int(time.time())
        # file_content= file.read()
        # file_content = file.file.read()  # giữ trong biến
        df_file = pd.read_excel(io.BytesIO(file_bytes))
        try:
            new_id = create_model(
                self.supabase, model_name, model_type, region_id, timestamp
            )
            match model_type:
                case "customer":
                    # Train model
                    pipeline_info = self._train_model_xgb_customer(df_file)
                    # Lưu vào storage và update lại vào bảng
                    file_name = generate_safe_filename(model_name, ".pkl", timestamp)

                    buffer = io.BytesIO()
                    joblib.dump(pipeline_info, buffer)  # ghi vào buffer
                    file_bytes = buffer.getvalue()  # lấy ra bytes

                    # file_bytes = joblib.dumps(pipeline_info, file_name)
                    file_options = {"content-type": "application/octet-stream"}
                    metrics = pipeline_info["metrics"]
                    # Lưu dict pipeline_info ra file pkl
                    # Lưu vào storage và db
                    save_model_to_storage_and_update(
                        self.supabase,
                        new_id,
                        file_name,
                        file_bytes,
                        file_options,
                        metrics,
                    )

                case "food":
                    WINSOR_PCTL_LOW = (
                        20.0  # Winsor"cr theo pctl từng món; đặt None để tắt
                    )
                    WINSOR_PCTL_UP = (
                        80.0  # Winsor"cr theo pctl từng món; đặt None để tắt
                    )
                    CLIP_MIN_CR = 1e-4  # tránh 0cruyệt đốiF
                    columns = [
                        "date",
                        "dish_id",
                        "timeslot_id",
                        "store_id",
                        "dish_name",
                        "food_type",
                        "pax",
                        "consumed_amount_suat",
                    ]
                    # df_file = pd.DataFrame(file)
                    df_file = df_file[columns]

                    miss = [c for c in columns if c not in df_file.columns]
                    if miss:
                        raise ValueError(f"Thiếu cột: {miss}")
                    df_file["date"] = pd.to_datetime(df_file["date"])
                    df = df_file.dropna(
                        subset=[
                            "dish_id",
                            "dish_name",
                            "food_type",
                            "pax",
                            "consumed_amount_suat",
                        ]
                    ).copy()

                    # Tính CR (không drop PAX nhỏ; chỉ clip tránh 0)
                    df["cr"] = df["consumed_amount_suat"] / np.clip(
                        df["pax"], CLIP_MIN_CR, None
                    )
                    # Winsorize CR theo từng món (không drop)
                    df_clean = winsorize_cr_per_item(
                        df, lower_pctl=WINSOR_PCTL_LOW, upper_pctl=WINSOR_PCTL_UP
                    )

                    # Chia train test
                    df_clean["date"] = pd.to_datetime(
                        df_clean["date"]
                    )  # đảm bảo kiểu datetime
                    df_clean["month"] = df_clean["date"].dt.to_period("M")
                    last_month = df_clean["month"].max()
                    X_train = df_clean[df_clean["month"] < last_month]
                    X_test = df_clean[df_clean["month"] == last_month]
                    # train_size = int(len(df_clean) * 0.8)
                    # X_train, X_test = df_clean[:train_size], df_clean[train_size:]
                    # y_train, y_test = y.iloc[:train_size], y.iloc[train_size:]

                    # new_id = create_model(
                    #     self.supabase, model_name, model_type, region_id, timestamp
                    # )

                    # === Train === #
                    idata_trace, mappings = self._train_model_bayes_hier(X_train, True)
                    metrics = validate(
                        idata_trace,
                        X_test,
                        mappings["dishes_list"],
                        mappings["dish_codes"],
                        mappings["timeslot_codes"],
                        mappings["store_codes"],
                    )

                    file_name = generate_safe_filename(model_name, ".nc", timestamp)
                    # Ghi idata_trace ra file để lấy
                    file_bytes = bundle_to_bytes(idata_trace, mappings)
                    file_options = {"content-type": "application/x-netcdf"}
                    # Lưu vào storage và db
                    save_model_to_storage_and_update(
                        self.supabase,
                        new_id,
                        file_name,
                        file_bytes,
                        file_options,
                        metrics,
                    )
                case _:
                    # mặc định
                    raise ValueError("Model type không hợp lệ")
        except HTTPException as e:
            # Lỗi có kiểm soát
            print("Có lỗi khi tạo model:", e.detail)
            self.supabase.table("cip_models").update({"status": "failed"}).eq(
                "id", new_id
            ).execute()
            raise e
        except Exception as e:
            # Lỗi bất ngờ
            print("Lỗi không xác định:", str(e))
            self.supabase.table("cip_models").update({"status": "failed"}).eq(
                "id", new_id
            ).execute()
            raise HTTPException(status_code=500, detail="Unexpected error")

    def _train_model_bayes_hier(self, df_train, use_advi=True):
        # WINSOR_PCTL = 85.0  # Winsor"cr theo pctl từng món; đặt None để tắt
        CLIP_MIN_CR = 1e-4  # tránh 0cruyệt đối
        # Suy lucr
        # USE_ADcr = True  # True: ADVI nhanh; False: MCMC (cần g++)
        ADVI_ITERS = 2000
        ADVI_DRAWS = 2000
        MCMC_DRAWS = 2000
        MCMC_TUNE = 1000
        MCMC_CHAINS = 2
        TARGET_ACCEPT = 0.9
        # ======================================
        ### Cần:
        # 3.1. Tạo dish_idx_obs
        df_unique_dishes = (
            df_train.groupby(["dish_id", "food_type"])["cr"].mean().reset_index()
        )
        # Thêm cột dish_id dạng int
        dishes_sorted = sorted(df_train["dish_id"].unique().tolist())
        n_dishes = len(df_unique_dishes)
        dish_codes = {str(dish): index for index, dish in enumerate(dishes_sorted)}
        df_train["dish_idx"] = df_train["dish_id"].map(dish_codes)
        # Lấy toàn bộ mảng có thứ tự của dish_id
        dish_idx_obs = df_train["dish_idx"].to_numpy(
            dtype=int
        )  ### === 1 === số phần tử bằng số dòng của df

        # 3.2. Tạo dish_food_idx (item -> Food_Type) vectorized (chia group)
        # Lấy food type
        food_types_sorted = sorted(df_train["food_type"].unique().tolist())
        n_food_types = len(food_types_sorted)
        food_type_codes = {
            str(food_type): index for index, food_type in enumerate(food_types_sorted)
        }  # Mapping
        df_unique_dishes["food_type_idx"] = df_unique_dishes["food_type"].map(
            food_type_codes
        )
        df_train["food_type_idx"] = df_train["food_type"].map(food_type_codes)
        dish_food_type_idx_obs = df_train["food_type_idx"].to_numpy(dtype=int)
        dish_food_type_idx = df_unique_dishes["food_type_idx"].to_numpy(dtype=int)
        ### === 2 ===

        # 3.3 Tạo timeslot_idx
        # Sorted theo giá trị thật
        # timeslots_sorted = sorted(df_train["timeslot_id"].unique().tolist())
        timeslots_sorted_res = (
            self.supabase.table("cip_timeslot").select("id").order("id").execute()
        )

        if not timeslots_sorted_res.data or len(timeslots_sorted_res.data) == 0:
            raise ValueError(f"No data found")
        timeslots_sorted = [row["id"] for row in timeslots_sorted_res.data]

        timeslot_codes = {ts_id: index for index, ts_id in enumerate(timeslots_sorted)}
        # Gán lại idx
        df_train["timeslot_idx"] = df_train["timeslot_id"].map(timeslot_codes)
        timeslot_idx_obs = df_train["timeslot_idx"].to_numpy(dtype=int)  ### === 3 ===
        n_timeslots = len(timeslot_codes)

        # 3.4 Tạo store_idx
        # store_sorted = sorted(df_train["store_id"].unique().tolist())
        store_sorted_res = (
            self.supabase.table("cip_stores").select("id").order("id").execute()
        )
        if not store_sorted_res.data or len(store_sorted_res.data) == 0:
            raise ValueError(f"No data found")
        store_sorted = [row["id"] for row in store_sorted_res.data]

        store_codes = {store_id: index for index, store_id in enumerate(store_sorted)}
        # Gán lại idx
        df_train["store_idx"] = df_train["store_id"].map(store_codes)
        store_idx_obs = df_train["store_idx"].to_numpy(dtype=int)  ### === 4 ===
        n_stores = len(store_codes)
        # 3.5 Lấy số dòng trong data
        n_obs = len(df_train)

        # Kéo cr min lên bằng CLIP_MIN_CR
        cr_obs = np.clip(df_train["cr"].astype(float).to_numpy(), CLIP_MIN_CR, None)
        weights = np.clip(df_train["pax"].astype(float).to_numpy(), CLIP_MIN_CR, None)

        ### Tính beta của HalfCauchy hoăc sigma của HalfNormal
        cr_mean_food_type = df_train.groupby("food_type")["cr"].mean()
        log_cr_mean_food_type = np.log(
            cr_mean_food_type.loc[food_types_sorted].values
        )  # Dùng làm mu0 của tầng chính
        log_cr_mean_food_type_std = np.std(log_cr_mean_food_type)

        df_unique_dishes["log_cr"] = np.log(df_unique_dishes["cr"])
        std_cr_by_group = (
            df_unique_dishes.groupby("food_type")
            .filter(lambda x: len(x) > 1)  # bỏ nhóm chỉ có 1 món
            .groupby("food_type")["log_cr"]
            .std()
        )
        log_std_cr_median = std_cr_by_group.median()

        with pm.Model() as model:
            ### 1. Tầng chính: cr theo nhóm và món trong nhóm
            # Phân bổ theo nhóm
            # 1.1. Prior cho Food_Type
            beta_estimate = math.ceil(log_cr_mean_food_type_std / 0.5) * 0.5
            # tau_food_type = pm.HalfCauchy("tau_food_type", beta=beta_estimate)
            tau_food_type = pm.HalfCauchy("tau_food_type", beta=1.0)

            # Chuẩn của food_type
            log_mu_food_type = pm.Normal(
                "log_mu_food_type",
                mu=log_cr_mean_food_type,
                # mu=np.log(0.01),
                sigma=tau_food_type,
                shape=n_food_types,
            )

            # 1.2. Prior cho Dish phụ thuộc Food_Type(group)
            beta_estimate = math.ceil(log_std_cr_median / 0.5) * 0.5

            # tau_dish_group = pm.HalfCauchy("tau_dish", beta=beta_estimate)
            tau_dish_group = pm.HalfCauchy("tau_dish", beta=1.0)
            log_mu_dish_group = pm.Normal(
                "log_mu_dish_group",
                mu=log_mu_food_type[dish_food_type_idx],
                sigma=tau_dish_group,
                shape=n_dishes,
            )
            log_mu_dish_group_deter = pm.Deterministic(
                "log_mu_dish_group_deter", log_mu_dish_group
            )
            ### 2. Tầng phụ: timeslot và store
            # === 2.1. Timeslot effect ===
            tau_timeslot = pm.HalfNormal("tau_timeslot", sigma=0.01)
            log_mu_timeslot = pm.Normal(
                "log_mu_timeslot", mu=0, sigma=tau_timeslot, shape=n_timeslots
            )
            log_mu_timeslot_deter = pm.Deterministic(
                "log_mu_timeslot_deter", log_mu_timeslot
            )

            # === 2.2. Store effect ===
            tau_store = pm.HalfNormal("tau_store", sigma=0.01)
            log_mu_store = pm.Normal(
                "log_mu_store", mu=0, sigma=tau_store, shape=n_stores
            )
            log_mu_store_deter = pm.Deterministic("log_mu_store_deter", log_mu_store)

            # # === Kỳ vọng cho từng món có thếm hiệu ứng ===
            # tau_item = pm.HalfNormal("tau_item", sigma=0.18)
            # log_mu0_item = (
            #     log_mu_dish_group  # baseline dish-level
            #     + log_mu_timeslot[timeslot_idx_obs]  # effect ca
            #     + log_mu_store[store_idx_obs]  # effect cửa hàng
            # )

            # # log(mu_item) theo item, được "anchor" bởi group của item đó
            # log_mu_item = pm.Normal(
            #     "log_mu_item", mu=log_mu0_item, sigma=tau_item, shape=n_dishes
            # )
            # # mu_item: mức phổ biến trung bình của món: cao thì nhiều khách chọn
            # # map sang quan sát
            # mu_item = pm.Deterministic(
            #     "mu_item", pm.math.exp(log_mu_item)
            # )  # CR mean theo món (>0)
            # Likelihood (Gamma) có trọng số theo PAX:

            # latent 3D: dish × timeslot × store
            sigma_inter = pm.HalfNormal("sigma_inter", sigma=2.0)
            log_interaction = pm.Normal(
                "log_interaction",
                # mu=log_mu_dish_group[:, None, None],
                mu=(
                    log_mu_dish_group[:, None, None]
                    + log_mu_timeslot[None, :, None]
                    + log_mu_store[None, None, :]
                ),
                sigma=sigma_inter,
                shape=(n_dishes, n_timeslots, n_stores),
            )

            mu_interaction = pm.Deterministic(
                "mu_interaction", pm.math.exp(log_interaction)
            )
            mu_obs = mu_interaction[dish_idx_obs, timeslot_idx_obs, store_idx_obs]
            # === Dispersion ===
            # Trong Hier Gamma kappa là phân phối các món trong menu: lớn thì các món được gọi đều, nhỏ thì có món gọi nhiều có món ít
            kappa = pm.HalfNormal("kappa", sigma=1.0)
            # Likelihood (Gamma) có trọng số theo PAX:
            # # E[CR] = mu_item[item_idx], Var = mu^2 / kappa  => rate = kappa / mu
            # Trong Hier Gamma beta = rate_vec là mức trung bình khách ăn tổng cộng bao nhiêu: lớn thì khách ăn ít, nhỏ ăn nhiều
            # rate_vec = kappa / mu_interaction  # <-- ĐÃ định nghĩa rate_vec
            rate_vec = kappa / mu_obs  # <-- ĐÃ định nghĩa rate_vec
            # Random variable Gamma theo từng quan sát
            rv = pm.Gamma.dist(alpha=kappa, beta=rate_vec)
            # Log-likelihood vector cho dữ liệu quan sát (PyMC 4 API)
            logp_vec = pm.logp(rv, cr_obs)
            # Weighted log-likelihood (trọng số = PAX)
            pm.Potential("weighted_likelihood", pm.math.sum(weights * logp_vec))
            if use_advi:  # Nhanh
                print("ADVI fitting ...")
                approx = pm.fit(ADVI_ITERS, method="advi")
                trace = approx.sample(ADVI_DRAWS, random_seed=42)
            else:  # Chậm
                print("MCMC sampling ...")
                trace = pm.sample(
                    draws=MCMC_DRAWS,
                    tune=MCMC_TUNE,
                    chains=MCMC_CHAINS,
                    target_accept=TARGET_ACCEPT,
                    cores=1,
                    random_seed=42,
                    progressbar=True,
                )
            # if not isinstance(trace, az.InferenceData):
            #     trace = az.from_pymc3(trace)
        # trace_posterior = trace.posterior
        idata_trace = az.InferenceData(posterior=trace.posterior)
        mappings = {
            "dish_codes": dish_codes,
            "food_type_codes": food_type_codes,
            "timeslot_codes": timeslot_codes,
            "store_codes": store_codes,
            "dishes_list": dishes_sorted,
            "timeslot_idx_obs": timeslot_idx_obs.tolist(),
            "store_idx_obs": store_idx_obs.tolist(),
            "dish_idx_obs": dish_idx_obs.tolist(),
        }
        return idata_trace, mappings
        # az.to_netcdf(trace, "trace_model.nc")

    def _train_model_xgb_customer(self, df):
        # === 2. Đặt các thông tin cột ===
        target_columns = "total_customers"
        ### Các features gồm:
        feature_columns = [
            "rain",
            "is_weekend",
            "is_holiday",
            "flights",
            "store_name",
            "temp_avg",
            "lag_1",
            "lag_7",
            "lag_14",
            "lag_28",
            "roll_mean_3",
            "roll_mean_7",
            "roll_mean_14",
            "roll_mean_28",
            "roll_std_3",
            "roll_std_7",
            "roll_std_14",
            "roll_std_28",
            "timeslot_sin",
            "timeslot_cos",
            "dow_sin",
            "dow_cos",
            # "month_sin",
            # "month_cos",
        ]
        category_columns = ["store_name"]

        # df = pd.DataFrame(file)
        y = df[target_columns].astype(float)
        X = df[sorted(feature_columns)]
        preprocessor = ColumnTransformer(
            transformers=[
                # ("num", "passthrough", numeric_features),
                ("cat", OneHotEncoder(handle_unknown="ignore"), category_columns),
            ],
            remainder="passthrough",
        )
        X_transformed = preprocessor.fit_transform(X)
        X_transformed = pd.DataFrame(X_transformed, index=X.index)

        train_size = int(len(X_transformed) * 0.8)

        X_train, X_test = X_transformed[:train_size], X_transformed[train_size:]
        y_train, y_test = y.iloc[:train_size], y.iloc[train_size:]

        # Chạy optuna
        study = optuna.create_study(
            direction="minimize",
            sampler=optuna.samplers.TPESampler(),  # mặc định tốt
            pruner=optuna.pruners.MedianPruner(n_warmup_steps=5),
        )
        study.optimize(
            lambda trial: objective(trial, X_train, y_train), n_trials=100, n_jobs=2
        )
        # 6. Tìm best params = optuna
        best_params = study.best_params
        best_params.update(
            {"random_state": 42, "objective": "reg:squarederror", "tree_method": "hist"}
        )
        # 7. Train trên toàn bộ 80% data đã chia từ đầu
        # Param đã có early_stopping_rounds
        final_model = XGBRegressor(**best_params)
        final_model.fit(
            X_train,
            y_train,
            eval_set=[(X_test, y_test)],  # X_test, y_test là 20% data chưa được sử dụng
        )

        # === 7. Đánh giá trên tập data test (20%) bằng Optuna model => So sánh kết quả y_pred_check với y_test (Đã có total customers)
        X_check = X_test.copy()
        y_pred_check = final_model.predict(X_check)

        # df_eval = df[["date", "store_name", "timslot"]].copy()
        # df_eval = df_eval[train_size:]
        # df_eval["y_true"] = y_test
        # df_eval["y_pred"] = y_pred_check
        EPS = 1e-9
        metrics_overall = {
            "mae": mean_absolute_error(y_test, y_pred_check),
            "rmse": np.sqrt(mean_squared_error(y_test, y_pred_check)),
            "wape": wape_func(y_test, y_pred_check) * 100,
            "smape": (
                np.mean(
                    2
                    * np.abs(y_pred_check - y_test)
                    / (np.abs(y_test) + np.abs(y_pred_check) + EPS)
                )
                * 100
            ),
            "r2": r2_score(y_test, y_pred_check),
        }

        pipeline = Pipeline(
            [
                ("preprocessor", preprocessor),  # ColumnTransformer
                ("model", final_model),  # XGBRegressor đã train
            ]
        )

        pipeline_info = {
            "pipeline": pipeline,
            "feature_columns": feature_columns,
            "category_columns": category_columns,
            "metrics": metrics_overall,
        }
        return pipeline_info


def create_model(supabase, model_name, model_type, region_id, timestamp):
    data = {
        "name": model_name,
        "type": model_type,
        "region_id": region_id,
        "status": "training",
        "file_url": "unknown",
        "file_path": "unknown",
        "accuracy": 0,
        "training_progress": 50,
        "rmse": 0,
        "wape": 0,
        "mae": 0,
        "r2": 0,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(timestamp)),
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(timestamp)),
        "version": 1.0,
    }
    try:
        # Tạo trong bảng
        res = supabase.table("cip_models").insert(data).execute()
        # Kết quả trả về có dạng list chứa bản ghi mới
        inserted_row = res.data[0]
        return inserted_row["id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def save_model_to_storage_and_update(
    supabase,
    id,
    file_name,
    file_bytes,
    file_options,
    metrics,
):
    timestamp = int(time.time())
    try:
        # print("BUCKET_NAME:", BUCKET_NAME)
        # print("file_name:", file_name)
        # print("file_bytes type:", type(file_bytes))
        # print("file_bytes length:", len(file_bytes) if file_bytes else "None")

        # if not BUCKET_NAME:
        #     print("❌ BUCKET_NAME chưa được gán hoặc rỗng")
        # if not file_name:
        #     print("❌ file_name chưa được gán hoặc rỗng")
        # if not file_bytes:
        #     print("❌ file_bytes chưa được gán hoặc rỗng")

        # assert isinstance(BUCKET_NAME, str), "BUCKET_NAME phải là kiểu chuỗi"
        # assert isinstance(file_name, str), "file_name phải là kiểu chuỗi"
        # assert isinstance(file_bytes, bytes), "file_bytes phải là kiểu bytes"

        # Chuyển file thành bytes
        # file_bytes = await pipeline_info.read()
        res = supabase.storage.from_(BUCKET_NAME).upload(
            path=file_name,
            file=file_bytes,
            file_options=file_options,
        )

        # # Lấy public URL (nếu bucket set public)
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)
        data_update = {
            "status": "completed",
            "file_url": public_url,
            "file_path": file_name,
            "accuracy": 100 - float(metrics["wape"]),
            "training_progress": 100,
            "rmse": float(metrics["rmse"]),
            "wape": float(metrics["wape"]),
            "mae": float(metrics["mae"]),
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(timestamp)),
            "version": 1.0,
        }
        res = supabase.table("cip_models").update(data_update).eq("id", id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def bytes_to_bundle(data_bytes):
    buffer = io.BytesIO(data_bytes)
    trace = az.from_netcdf(buffer)

    # Deserialize mappings
    hex_str = trace.attrs.get("mappings")
    mappings = None
    if hex_str is not None:
        mappings_bytes = bytes.fromhex(hex_str)
        mappings = joblib.load(io.BytesIO(mappings_bytes))

    return trace, mappings


def objective(trial, X_train_80, y_train_80):
    # Hyperparameters cho Optuna
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 200, 600),  # ít cây hơn
        "max_depth": trial.suggest_int("max_depth", 3, 5),  # tránh quá sâu
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.1, log=True),
        "subsample": trial.suggest_float("subsample", 0.7, 1.0),  # random sampling
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.7, 1.0),
        "min_child_weight": trial.suggest_int(
            "min_child_weight", 3, 10
        ),  # tránh split quá nhỏ
        "gamma": trial.suggest_float("gamma", 0, 2),  # yêu cầu giảm impurity nhiều hơn
        "reg_alpha": trial.suggest_float("reg_alpha", 0, 5),  # L1 regularization
        "reg_lambda": trial.suggest_float("reg_lambda", 1, 10),  # L2 regularization
        "random_state": 42,
        "objective": "reg:squarederror",
        "tree_method": "hist",
        "eval_metric": "rmse",  # Đưa trực tiếp vào model
        "early_stopping_rounds": 50,  # Đưa trực tiếp vào model
    }
    # Cross-validation theo thời gian
    tscv = TimeSeriesSplit(n_splits=3)
    rmses = []

    for train_idx, valid_idx in tscv.split(X_train_80, y_train_80):
        X_train, X_valid = X_train_80.iloc[train_idx], X_train_80.iloc[valid_idx]
        y_train, y_valid = y_train_80.iloc[train_idx], y_train_80.iloc[valid_idx]

        model = XGBRegressor(**params)
        model.fit(
            X_train,
            y_train,
            eval_set=[(X_valid, y_valid)],
            verbose=0,
        )

        y_pred = model.predict(X_valid)
        rmse = np.sqrt(mean_squared_error(y_valid, y_pred))
        rmses.append(rmse)

    return np.mean(rmses)


def generate_safe_filename(file_name, file_type, timestamp):
    file_name = file_name.replace(" ", "_")
    file_name = re.sub(r"[^a-zA-Z0-9_\-]", "", file_name)
    file_name = f"{timestamp}_{file_name}{file_type}"
    return file_name


def wape_func(y_true, y_pred):
    denom = np.abs(y_true).sum()
    return np.abs(y_true - y_pred).sum() / denom if denom != 0 else np.nan


def safe_smape(y_true, y_pred):
    y_true = np.asarray(y_true, float)
    y_pred = np.asarray(y_pred, float)
    denom = np.clip(np.abs(y_true) + np.abs(y_pred), 1e-9, None)
    return float(np.mean(2.0 * np.abs(y_true - y_pred) / denom) * 100)


def safe_wape(y_true, y_pred):
    y_true = np.asarray(y_true, float)
    y_pred = np.asarray(y_pred, float)
    denom = np.clip(np.sum(np.abs(y_true)), 1e-9, None)
    return float(np.sum(np.abs(y_true - y_pred)) / denom * 100)


# Xử lí outlier
def winsorize_cr_per_item(df, lower_pctl, upper_pctl):
    """Winsor CR theo từng Item_ID, log các dòng bị chỉnh vào exclusions."""
    if lower_pctl is None and upper_pctl is None:
        return df.copy(), pd.DataFrame()
    records = []
    out = df.copy()
    for dish_id, group in out.groupby("dish_id"):
        lo = (
            np.nanpercentile(group["cr"].values, lower_pctl)
            if lower_pctl is not None
            else None
        )
        hi = (
            np.nanpercentile(group["cr"].values, upper_pctl)
            if upper_pctl is not None
            else None
        )

        for idx in group.index:
            old_cr = out.at[idx, "cr"]
            new_cr = old_cr
            reason = None
            if upper_pctl is not None and old_cr > hi:
                new_cr = hi
                reason = f"cr>{upper_pctl}p_by_item"
            elif lower_pctl is not None and old_cr < lo:
                new_cr = lo
                reason = f"cr<{lower_pctl}p_by_item"
            if reason:
                records.append(
                    {
                        "index": int(idx),
                        "reason": reason,
                        "old_cr": float(old_cr),
                        "new_cr": float(new_cr),
                    }
                )
                out.at[idx, "cr"] = new_cr
    # excl_df = pd.DataFrame(records)
    # return out, excl_df
    return out


# Đánh giá
def validate(
    idata_trace, data_test, list_item, dish_codes, timeslot_codes, store_codes
):
    data_test = data_test.copy()
    # mu_item_mean = idata_trace.posterior["mu_item"].mean(dim=("chain", "draw")).values
    mu_item_mean = idata_trace.posterior["mu_interaction"].mean(dim=("chain", "draw"))

    # HDI 80/95 cho mu_item (mỗi item có [lower, upper])
    hdi80 = az.hdi(idata_trace.posterior["mu_interaction"], hdi_prob=0.80)
    hdi95 = az.hdi(idata_trace.posterior["mu_interaction"], hdi_prob=0.95)
    # hdi80 = az.hdi(idata_trace.posterior["mu_item"], hdi_prob=0.80)
    # hdi95 = az.hdi(idata_trace.posterior["mu_item"], hdi_prob=0.95)
    cr_pred, l80, u80, l95, u95 = [], [], [], [], []
    for _, row in data_test.iterrows():
        dish, ts, st = row["dish_id"], row["timeslot_id"], row["store_id"]
        mu_hat = predict_mu(
            mu_item_mean, dish, ts, st, dish_codes, timeslot_codes, store_codes
        )
        lo80, hi80 = predict_hdi(
            hdi80["mu_interaction"],
            dish,
            ts,
            st,
            dish_codes,
            timeslot_codes,
            store_codes,
        )
        lo95, hi95 = predict_hdi(
            hdi95["mu_interaction"],
            dish,
            ts,
            st,
            dish_codes,
            timeslot_codes,
            store_codes,
        )
        cr_pred.append(mu_hat)
        l80.append(lo80)
        u80.append(hi80)
        l95.append(lo95)
        u95.append(hi95)

    data_test = data_test.copy()
    data_test["cr_estimated"] = cr_pred
    data_test["cr_estimated_l80"] = l80
    data_test["cr_estimated_u80"] = u80
    data_test["cr_estimated_l95"] = l95
    data_test["cr_estimated_u95"] = u95

    # 5) Forecast servings
    data_test["forecasted_dish"] = data_test["cr_estimated"] * data_test["pax"]
    data_test["forecasted_dish_l80"] = data_test["cr_estimated_l80"] * data_test["pax"]
    data_test["forecasted_dish_u80"] = data_test["cr_estimated_u80"] * data_test["pax"]
    data_test["forecasted_dish_l95"] = data_test["cr_estimated_l95"] * data_test["pax"]
    data_test["forecasted_dish_u95"] = data_test["cr_estimated_u95"] * data_test["pax"]

    # # 6) Metrics
    # y_true = data_test["consumed_amount_suat"].astype(float).to_numpy()
    # y_pred = data_test["forecasted_dish"].astype(float).to_numpy()
    # rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    # mae = float(mean_absolute_error(y_true, y_pred))
    # wape = safe_wape(y_true, y_pred)
    # smape = safe_smape(y_true, y_pred)

    # metrics_df = pd.DataFrame(
    #     [
    #         {
    #             "rmse": rmse,
    #             "mae": mae,
    #             "wape": wape,
    #             # "sMAPE(%)": smape,
    #         }
    #     ]
    # )

    # item_to_mu = {it: mu_item_mean[dish_codes[it]] for it in list_item}
    # item_to_l80 = {
    #     it: float(
    #         hdi80["mu_item"].isel(mu_item_dim_0=dish_codes[it]).isel(hdi=0).item()
    #     )
    #     for it in list_item
    # }
    # item_to_u80 = {
    #     it: float(
    #         hdi80["mu_item"].isel(mu_item_dim_0=dish_codes[it]).isel(hdi=1).item()
    #     )
    #     for it in list_item
    # }
    # item_to_l95 = {
    #     it: float(
    #         hdi95["mu_item"].isel(mu_item_dim_0=dish_codes[it]).isel(hdi=0).item()
    #     )
    #     for it in list_item
    # }
    # item_to_u95 = {
    #     it: float(
    #         hdi95["mu_item"].isel(mu_item_dim_0=dish_codes[it]).isel(hdi=1).item()
    #     )
    #     for it in list_item
    # }

    # # 8) Dự báo tháng 8: forecasted_dish = mu_item * PAX_aug  (PAX_aug là "forecasted_pax")
    # data_test["cr_estimated"] = data_test["dish_id"].map(item_to_mu)
    # data_test["cr_estimated_l80"] = data_test["dish_id"].map(item_to_l80)
    # data_test["cr_estimated_u80"] = data_test["dish_id"].map(item_to_u80)
    # data_test["cr_estimated_l95"] = data_test["dish_id"].map(item_to_l95)
    # data_test["cr_estimated_u95"] = data_test["dish_id"].map(item_to_u95)

    # data_test = data_test.dropna(subset=["cr_estimated"]).copy()

    # data_test["forecasted_dish"] = data_test["cr_estimated"] * data_test["pax"]
    # data_test["forecasted_dish_l80"] = data_test["cr_estimated_l80"] * data_test["pax"]
    # data_test["forecasted_dish_u80"] = data_test["cr_estimated_u80"] * data_test["pax"]
    # data_test["forecasted_dish_l95"] = data_test["cr_estimated_l95"] * data_test["pax"]
    # data_test["forecasted_dish_u95"] = data_test["cr_estimated_u95"] * data_test["pax"]

    # 9) Metrics (data test có y thật)
    y_true = data_test["consumed_amount_suat"].astype(float).to_numpy()
    y_pred = data_test["forecasted_dish"].astype(float).to_numpy()
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mae = float(mean_absolute_error(y_true, y_pred))
    wape = safe_wape(y_true, y_pred)
    smape = safe_smape(y_true, y_pred)

    metrics_df = pd.DataFrame(
        [
            {
                "rmse": rmse,
                "mae": mae,
                "wape": wape,
                # "sMAPE(%)": smape,
                # "rows_test": len(data_test),
                # "items_trained": len(list_item),
                # "food_type": len(foods_train),
            }
        ]
    )

    # print(f" DONE. File đã lưu: {OUTPUT_XLSX}")
    metrics = metrics_df.iloc[0].to_dict()
    return metrics


def predict_mu(mu_mean, dish, timeslot, store, dish_codes, timeslot_codes, store_codes):
    return float(
        mu_mean.sel(
            mu_interaction_dim_0=dish_codes[dish],
            mu_interaction_dim_1=timeslot_codes[timeslot],
            mu_interaction_dim_2=store_codes[store],
        ).values
    )


def predict_hdi(hdi_ds, dish, timeslot, store, dish_codes, timeslot_codes, store_codes):
    lower = float(
        hdi_ds.isel(
            mu_interaction_dim_0=dish_codes[dish],
            mu_interaction_dim_1=timeslot_codes[timeslot],
            mu_interaction_dim_2=store_codes[store],
        )
        .isel(hdi=0)
        .item()
    )
    upper = float(
        hdi_ds.isel(
            mu_interaction_dim_0=dish_codes[dish],
            mu_interaction_dim_1=timeslot_codes[timeslot],
            mu_interaction_dim_2=store_codes[store],
        )
        .isel(hdi=1)
        .item()
    )
    return lower, upper


def bundle_to_bytes(idata_trace, mappings):
    # Gắn mappings vào metadata
    idata_trace.attrs["mappings"] = json.dumps(mappings)
    # Tạo file name trên máy
    timestamp = int(time.time())
    file_name = f"{timestamp}_idata_trace.nc"
    # Tạo đường dẫn đầy đủ
    file_path = os.path.join(CUSTOM_TMP_DIR, file_name)
    # Ghi idata_trace
    az.to_netcdf(idata_trace, file_path)
    with open(file_path, "rb") as f:
        trace_bytes = f.read()
    # Có thể xóa file vừa ghi
    # os.remove(file_path)
    return trace_bytes
