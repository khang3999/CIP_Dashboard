from fastapi import APIRouter, File, Form, HTTPException, Body
from app.supabase_client import supabase
from app.services.predict_service import PredictService
from app.services.weather_service import WeatherService
from fastapi.encoders import jsonable_encoder

router = APIRouter()
predict_service = PredictService(supabase)
weather_service = WeatherService(supabase)


@router.get("/ping")
def test():
    try:
        res = supabase.table("cip_regions").select("*").limit(1).execute()
        return {"status": "ok", "data": res.data}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@router.post("/")
async def create_predict(body: dict = Body(...)):
    # print("Received body:", body)  # in ra console
    # return {"received": body}
    region_id = body.get("region_id", -1)
    store_id = body.get("store_id", -1)
    timeslot_id = body.get("timeslot_id", -1)
    start_date = body.get("start_date", None)
    end_date = body.get("end_date", None)
    if (
        region_id == -1
        or store_id == -1
        or timeslot_id == -1
        or start_date is None
        or end_date is None
    ):
        raise HTTPException(status_code=400, detail="Missing required fields")
    print(region_id, store_id, timeslot_id, start_date, end_date)
    result_customers, result_foods, result_ingredients = predict_service.predict(
        start_date=start_date,
        end_date=end_date,
        region_id=region_id,
        timeslot_id=timeslot_id,
        store_id=store_id,
    )
    return {
        "status": "Success",
        "data": {
            "result_customers": result_customers,
            "result_foods": result_foods,
            "result_ingredients": result_ingredients,
        },
    }


@router.get("/weather")
def get_weather_by_api():
    result = weather_service.get_weather_from_api()
    print(result)
    safe_result = jsonable_encoder(result)
    return safe_result
