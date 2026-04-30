import json
import subprocess
from pathlib import Path
from uuid import uuid4
from faster_whisper import WhisperModel


STT_MODEL_NAME = "medium"
STT_DEVICE = "cuda"
STT_COMPUTE_TYPE = "float16"

ALLOWED_EXTENSIONS = {".webm", ".wav", ".mp3", ".m4a"}

MIN_RECORDING_SECONDS = 1 * 60
MAX_RECORDING_SECONDS = 10 * 60

_model = None


# ----------------------------
# 경로 헬퍼 (lazy - Django 초기화 후 호출)
# ----------------------------

def get_upload_dir() -> Path:
    from django.conf import settings
    return Path(settings.MEDIA_ROOT) / "audio"

def get_transcript_dir() -> Path:
    from django.conf import settings
    return Path(settings.MEDIA_ROOT) / "transcripts"


# ----------------------------
# 모델 캐시
# ----------------------------

def get_stt_model():
    global _model

    if _model is None:
        _model = WhisperModel(
            STT_MODEL_NAME,
            device=STT_DEVICE,
            compute_type=STT_COMPUTE_TYPE,
        )

    return _model


# ----------------------------
# 오디오 유효성 검사
# ----------------------------

def get_audio_duration_seconds(audio_path: str | Path) -> float:
    audio_path = Path(audio_path)

    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        str(audio_path),
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
        )
    except FileNotFoundError:
        raise RuntimeError(
            "[STT] ffprobe를 찾을 수 없습니다."
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"[STT] 음성 파일 길이 확인 중 오류가 발생했습니다: {e.stderr}")

    data = json.loads(result.stdout)
    return float(data["format"]["duration"])


def validate_audio_file(audio_path: str | Path) -> Path:
    audio_path = Path(audio_path)

    if not audio_path.exists():
        raise FileNotFoundError(f"[STT] 음성 파일을 찾을 수 없습니다: {audio_path}")

    suffix = audio_path.suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError(f"[STT] 지원하지 않는 파일 형식입니다: {suffix}")

    duration = get_audio_duration_seconds(audio_path)

    if duration < MIN_RECORDING_SECONDS:
        raise ValueError(
            f"[STT] 녹음 시간이 너무 짧습니다. "
            f"최소 {MIN_RECORDING_SECONDS}초 이상 녹음해야 합니다. "
            f"현재 길이: {duration:.1f}초"
        )

    if duration > MAX_RECORDING_SECONDS:
        raise ValueError(
            f"[STT] 녹음 시간이 너무 깁니다. "
            f"최대 {MAX_RECORDING_SECONDS // 60}분까지만 가능합니다. "
            f"현재 길이: {duration / 60:.1f}분"
        )

    return audio_path


# ----------------------------
# 파일 저장
# ----------------------------

def save_recording_file(uploaded_file) -> Path:
    upload_dir = get_upload_dir()   # lazy 호출
    upload_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(uploaded_file.name).suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError(f"[STT] 지원하지 않는 파일 형식입니다: {suffix}")

    save_path = upload_dir / f"{uuid4().hex}{suffix}"

    with open(save_path, "wb") as f:
        for chunk in uploaded_file.chunks():
            f.write(chunk)

    return save_path


def save_transcript(text: str) -> Path:
    transcript_dir = get_transcript_dir()   # lazy 호출
    transcript_dir.mkdir(parents=True, exist_ok=True)

    save_path = transcript_dir / f"{uuid4().hex}.txt"
    save_path.write_text(text, encoding="utf-8")

    return save_path


# ----------------------------
# STT 처리
# ----------------------------

def transcribe_audio(audio_path: str | Path) -> str:
    audio_path = validate_audio_file(audio_path)
    model = get_stt_model()

    segments, _ = model.transcribe(
        str(audio_path),
        language="ko",
        beam_size=5,
        vad_filter=True,
    )

    text = " ".join(segment.text.strip() for segment in segments)

    return text.strip()


def process_recording_for_stt(uploaded_file) -> dict:
    audio_path = save_recording_file(uploaded_file)
    stt_text = transcribe_audio(audio_path)
    transcript_path = save_transcript(stt_text)

    return {
        "audio_path": str(audio_path),
        "transcript_path": str(transcript_path),
        "stt_text": stt_text,
    }
