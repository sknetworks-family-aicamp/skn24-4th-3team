from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

from core.ai_client import AiServerError, create_tbm_draft


@csrf_exempt
def tbm_create(request):
    if request.method == "POST":
        try:
            uploaded_file = request.FILES.get("audio_file")
            lat = request.POST.get("lat")
            lon = request.POST.get("lon")

            if not uploaded_file:
                raise ValueError("음성 파일이 업로드되지 않았습니다.")

            result = create_tbm_draft(
                uploaded_file=uploaded_file,
                lat=lat,
                lon=lon,
            )
            data = result.get("data", {})

            if request.headers.get("x-requested-with") == "XMLHttpRequest":
                return JsonResponse({
                    "success": True,
                    "data": data,
                })

            return render(request, "tbm/tbm_form.html", {
                "stt_text": data.get("stt_text"),
                "meeting_text": data.get("meeting_text"),
                "weather_text": data.get("weather_text"),
                "draft": data.get("draft"),
                "selected_sido": request.POST.get("sido"),
                "selected_sigungu": request.POST.get("sigungu"),
            })

        except AiServerError as e:
            if request.headers.get("x-requested-with") == "XMLHttpRequest":
                return JsonResponse({"success": False, "error": str(e)}, status=502)

            return render(request, "tbm/tbm_form.html", {
                "error_message": str(e),
                "selected_sido": request.POST.get("sido"),
                "selected_sigungu": request.POST.get("sigungu"),
            })

        except Exception as e:
            if request.headers.get("x-requested-with") == "XMLHttpRequest":
                return JsonResponse({"success": False, "error": str(e)}, status=400)

            return render(request, "tbm/tbm_form.html", {
                "error_message": str(e),
                "selected_sido": request.POST.get("sido"),
                "selected_sigungu": request.POST.get("sigungu"),
            })

    return render(request, "tbm/tbm_form.html", {})


def tbm_recording(request):
    return render(request, "tbm/tbm_recording.html")


def tbm_draft(request):
    return render(request, "tbm/tbm_draft.html")


def tbm_edit(request):
    return render(request, "tbm/tbm_edit.html")


def tbm_list(request):
    return render(request, "tbm/tbm_list.html")


def tbm_detail(request):
    return render(request, "tbm/tbm_detail.html")
