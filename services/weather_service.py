import os
import requests
from dotenv import load_dotenv

load_dotenv()


def get_current_weather_by_coord(lat: float, lon: float, units: str = "metric") -> dict:
    api_key = os.getenv("OPENWEATHER_API_KEY")

    if not api_key:
        raise ValueError("날씨 API 키가 설정되어 있지 않습니다.")

    url = "https://api.openweathermap.org/data/2.5/weather"

    params = {
        "lat": lat,
        "lon": lon,
        "units": units,
        "appid": api_key,
        "lang": "kr",
    }

    response = requests.get(url, params=params, timeout=10)
    data = response.json()

    if response.status_code != 200 or "main" not in data:
        message = data.get("message", "날씨 정보를 가져올 수 없습니다.")
        raise ValueError(f"날씨 조회 실패: {message}")

    return {
        "city_name": data.get("name", ""),
        "temperature": data["main"]["temp"],
        "feels_like": data["main"]["feels_like"],
        "humidity": data["main"]["humidity"],
        "description": data["weather"][0]["description"],
        "wind_speed": data["wind"]["speed"],
    }


def format_weather_for_prompt(weather: dict) -> str:
    return (
        f"현재 날씨: "
        f"기온 {weather['temperature']}도, "
        f"체감온도 {weather['feels_like']}도, "
        f"습도 {weather['humidity']}%, "
        f"날씨 {weather['description']}, "
        f"풍속 {weather['wind_speed']}m/s"
    )