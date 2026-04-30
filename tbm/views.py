from django.shortcuts import render

from services.stt_service import process_recording_for_stt
from services.jargon_service import normalize_query
from services.weather_service import get_current_weather_by_coord, format_weather_for_prompt
from services.tbm_draft_service import generate_tbm_draft


def tbm_create(request):
    if request.method == "POST":
        try:
            uploaded_file = request.FILES.get("audio_file")
            lat = request.POST.get("lat")
            lon = request.POST.get("lon")

            if not uploaded_file:
                raise ValueError("음성 파일이 업로드되지 않았습니다.")

            stt_result = process_recording_for_stt(uploaded_file)
            stt_text = stt_result["stt_text"]

            meeting_text = normalize_query(stt_text)

            weather_text = None
            if lat and lon:
                try:
                    weather = get_current_weather_by_coord(float(lat), float(lon))
                    weather_text = format_weather_for_prompt(weather)
                except Exception:                                            
                    weather_text = None

            draft = generate_tbm_draft(
                meeting_text=meeting_text,
                weather_text=weather_text,
            )

            return render(request, "tbm/tbm_form.html", {
                "stt_text": stt_text,
                "meeting_text": meeting_text,
                "weather_text": weather_text,
                "draft": draft,
                "selected_sido": request.POST.get("sido"),      
                "selected_sigungu": request.POST.get("sigungu"), 
            })

        except Exception as e:
            return render(request, "tbm/tbm_form.html", {
                "error_message": str(e),
                "selected_sido": request.POST.get("sido"),
                "selected_sigungu": request.POST.get("sigungu"),
            })
                        
    return render(request, "tbm/tbm_form.html", {})