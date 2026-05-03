import re
from datetime import timedelta

from django.utils import timezone

from .models import Draft, WeatherInfo


def parse_weather_text(weather_text: str) -> dict:
    """weather_text 문자열 → WeatherInfo 필드 딕셔너리로 파싱"""
    if not weather_text:
        return {}
    patterns = {
        'temperature':   r'기온\s*([\d.]+)도',
        'humidity':      r'습도\s*([\d]+)%',
        'weather_status': r'날씨\s*[:\s]\s*([^,]+)',
        'wind_speed':    r'풍속\s*([\d.]+)m/s',
        'precipitation': r'강수량\s*([\d.]+)mm',
    }
    return {
        key: m.group(1).strip()
        for key, pattern in patterns.items()
        if (m := re.search(pattern, weather_text))
    }


def build_draft_text(draft: str, references: list[str]) -> str:
    """초안 텍스트 하단에 references 추가"""
    if not references:
        return draft or ''
    refs = "\n\n[참고 출처]\n" + "\n".join(f"- {r}" for r in references)
    return (draft or '') + refs


def save_tbm_draft(user, ai_data: dict, form_data: dict) -> Draft:
    """AI 응답 + 폼 데이터로 Draft + WeatherInfo 저장 후 Draft 반환"""
    references = ai_data.get('references', [])

    draft = Draft.objects.create(
        user=user,
        work_date=timezone.localdate(),
        task_name=form_data.get('task_name'),
        region_large=form_data.get('region_large'),
        region_middle=form_data.get('region_middle'),
        region_detail=form_data.get('region_detail'),
        recording_text=ai_data.get('stt_text'),
        recording_duration_sec=form_data.get('recording_duration_sec'),
        draft_text=build_draft_text(ai_data.get('draft', ''), references),
        safety_guide_text='\n'.join(references),
    )

    weather_text = ai_data.get('weather_text')
    if weather_text:
        weather = parse_weather_text(weather_text)
        if weather:
            WeatherInfo.objects.create(
                draft=draft,
                weather_status=weather.get('weather_status'),
                temperature=weather.get('temperature'),
                humidity=weather.get('humidity'),
                precipitation=weather.get('precipitation'),
                wind_speed=weather.get('wind_speed'),
            )

    return draft


def is_editable(draft: Draft) -> bool:
    """초안 생성 후 24시간 이내 여부 반환"""
    return timezone.now() < draft.created_at + timedelta(hours=24)
