from typing import Any
from time import perf_counter

import requests
from django.conf import settings

from core.models import AIUsageLog


class AiServerError(RuntimeError):
    pass


def _build_url(path: str) -> str:
    base_url = settings.AI_SERVER_BASE_URL.rstrip("/")
    return f"{base_url}/{path.lstrip('/')}"


def _raise_for_ai_error(response: requests.Response) -> None:
    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        try:
            payload = response.json()
            detail: Any = payload.get("detail") or payload
        except ValueError:
            detail = response.text or response.reason

        raise AiServerError(
            f"AI server request failed ({response.status_code}): {detail}"
        ) from exc


def _safe_response_payload(response: requests.Response) -> dict:
    try:
        payload = response.json()
    except ValueError:
        return {"raw": response.text[:2000]}

    return payload if isinstance(payload, dict) else {"data": payload}


def _create_usage_log(
    endpoint: str,
    request_payload: dict,
    response: requests.Response | None = None,
    elapsed_ms: int | None = None,
    error_message: str = "",
) -> None:
    response_payload = _safe_response_payload(response) if response is not None else {}

    AIUsageLog.objects.create(
        endpoint=endpoint,
        request_payload=request_payload,
        response_payload=response_payload,
        status_code=response.status_code if response is not None else None,
        elapsed_ms=elapsed_ms,
        success=bool(response is not None and response.ok and not error_message),
        error_message=error_message,
    )


def ask_chatbot(message: str, thread_id: str | None = None, reset: bool = False) -> dict:
    endpoint = "/chatbot/ask"
    request_payload = {
        "message": message,
        "thread_id": thread_id,
        "reset": reset,
    }
    started_at = perf_counter()
    response = None

    try:
        response = requests.post(
            _build_url(endpoint),
            json=request_payload,
            timeout=settings.AI_SERVER_TIMEOUT,
        )
        _raise_for_ai_error(response)
        elapsed_ms = int((perf_counter() - started_at) * 1000)
        _create_usage_log(endpoint, request_payload, response, elapsed_ms)
        return response.json()
    except Exception as exc:
        elapsed_ms = int((perf_counter() - started_at) * 1000)
        _create_usage_log(endpoint, request_payload, response, elapsed_ms, str(exc))
        raise


def create_tbm_draft(uploaded_file, lat: str | None = None, lon: str | None = None) -> dict:
    uploaded_file.seek(0)

    files = {
        "audio_file": (
            uploaded_file.name,
            uploaded_file,
            getattr(uploaded_file, "content_type", "application/octet-stream"),
        )
    }

    data = {}
    if lat:
        data["lat"] = lat
    if lon:
        data["lon"] = lon

    endpoint = "/tbm/draft"
    request_payload = {
        "audio_file": uploaded_file.name,
        "lat": lat,
        "lon": lon,
    }
    started_at = perf_counter()
    response = None

    try:
        response = requests.post(
            _build_url(endpoint),
            data=data,
            files=files,
            timeout=settings.AI_SERVER_LONG_TIMEOUT,
        )
        _raise_for_ai_error(response)
        elapsed_ms = int((perf_counter() - started_at) * 1000)
        _create_usage_log(endpoint, request_payload, response, elapsed_ms)
        return response.json()
    except Exception as exc:
        elapsed_ms = int((perf_counter() - started_at) * 1000)
        _create_usage_log(endpoint, request_payload, response, elapsed_ms, str(exc))
        raise
