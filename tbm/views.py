import re

from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.utils import timezone
from datetime import timedelta

from core.ai_client import AiServerError, create_tbm_draft
from .models import Draft, WeatherInfo


@csrf_exempt
def tbm_create(request):
    if not request.user.is_authenticated:
        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse({"success": False, "error": "로그인이 필요합니다."}, status=401)
        return redirect('/account/login/')

    if request.method == "POST":
        # 기존 코드 유지
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

            # Draft 저장
            draft = Draft.objects.create(
                user=request.user,
                work_date=timezone.localdate(),
                task_name=request.POST.get("task_name"),
                region_large=request.POST.get("sido"),
                region_middle=request.POST.get("sigungu"),
                region_detail=request.POST.get("detail"),
                recording_text=data.get("stt_text"),
                recording_duration_sec=request.POST.get("recording_duration_sec"),
                draft_text=data.get("draft"),
                safety_guide_text=data.get("meeting_text"),
            )

            # WeatherInfo 저장
            weather_text = data.get("weather_text", "")
            if weather_text:
                try:
                    temperature    = re.search(r'기온\s*([\d.]+)도', weather_text)
                    humidity       = re.search(r'습도\s*(\d+)%', weather_text)
                    wind_speed     = re.search(r'풍속\s*([\d.]+)m/s', weather_text)
                    precipitation  = re.search(r'강수량\s*([\d.]+)mm', weather_text)
                    weather_status = re.search(r'날씨\s*(.+?)(?:,|$)', weather_text)

                    WeatherInfo.objects.create(
                        draft=draft,
                        weather_status=weather_status.group(1).strip() if weather_status else None,
                        temperature=float(temperature.group(1)) if temperature else None,
                        humidity=int(humidity.group(1)) if humidity else None,
                        precipitation=float(precipitation.group(1)) if precipitation else None,
                        wind_speed=float(wind_speed.group(1)) if wind_speed else None,
                    )
                except Exception:
                    pass

            if request.headers.get("x-requested-with") == "XMLHttpRequest":
                return JsonResponse({
                    "success": True,
                    "data": data,
                    "draft_id": draft.draft_id,
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
    return render(request, "tbm/tbm_draft.html", {
        'company_name': request.user.company_name if request.user.is_authenticated else '-'
    })


@login_required
def tbm_edit(request, draft_id):
    draft = get_object_or_404(Draft, draft_id=draft_id, user=request.user)

    now = timezone.now()
    cutoff = now - timedelta(hours=24)
    if draft.created_at < cutoff:
        return redirect('tbm-detail', draft_id=draft_id)

    secs = draft.recording_duration_sec or 0
    draft.duration_display = f"{secs // 60:02d}:{secs % 60:02d}"
    weather = getattr(draft, 'weatherinfo', None)

    return render(request, "tbm/tbm_edit.html", {
        'draft': draft,
        'weather': weather,
    })


@login_required
def tbm_update(request, draft_id):
    if request.method == 'POST':
        draft = get_object_or_404(Draft, draft_id=draft_id, user=request.user)

        now = timezone.now()
        cutoff = now - timedelta(hours=24)
        if draft.created_at < cutoff:
            return JsonResponse({'success': False, 'error': '수정 가능 시간이 지났습니다.'}, status=403)

        draft.draft_text = request.POST.get('draft_text', draft.draft_text)
        draft.save()

        return JsonResponse({'success': True})

    return JsonResponse({'success': False, 'error': '잘못된 요청입니다.'}, status=400)


@login_required
def tbm_list(request):
    now = timezone.now()
    cutoff = now - timedelta(hours=24)

    drafts = Draft.objects.filter(
        user=request.user
    ).order_by('-work_date')

    for draft in drafts:
        draft.is_editable = draft.created_at >= cutoff
        secs = draft.recording_duration_sec or 0
        draft.duration_display = f"{secs // 60:02d}:{secs % 60:02d}"

    paginator = Paginator(drafts, 6)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    return render(request, "tbm/tbm_list.html", {
        'page_obj': page_obj,
    })


@login_required
def tbm_detail(request, draft_id):
    draft = get_object_or_404(Draft, draft_id=draft_id, user=request.user)

    now = timezone.now()
    cutoff = now - timedelta(hours=24)
    draft.is_editable = draft.created_at >= cutoff

    secs = draft.recording_duration_sec or 0
    draft.duration_display = f"{secs // 60:02d}:{secs % 60:02d}"

    weather = getattr(draft, 'weatherinfo', None)

    return render(request, "tbm/tbm_detail.html", {
        'draft': draft,
        'weather': weather,
    })


@login_required
def tbm_delete(request, draft_id):
    if request.method == 'DELETE':
        draft = get_object_or_404(Draft, draft_id=draft_id, user=request.user)

        now = timezone.now()
        cutoff = now - timedelta(hours=24)
        if draft.created_at < cutoff:
            return JsonResponse({'success': False, 'error': '삭제 가능 시간이 지났습니다.'}, status=403)

        draft.delete()
        return JsonResponse({'success': True})

    return JsonResponse({'success': False, 'error': '잘못된 요청입니다.'}, status=400)