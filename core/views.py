import datetime
import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone

from tbm.models import Draft
from tbm.utils import is_editable


@login_required
def dashboard(request):
    today = timezone.localdate()

    # 현재 월 TBM 있는 날짜 목록 — 파란 점 표시용
    tbm_dates = set(
        Draft.objects
        .filter(user=request.user, work_date__year=today.year, work_date__month=today.month)
        .values_list("work_date", flat=True)
    )

    context = {
        "current_month": today.month,
        "current_year":  today.year,
        "today":         today.isoformat(),
        "months":        range(1, 13),
        "years":         [2024, 2025, 2026],
        "tbm_dates":     json.dumps([d.isoformat() for d in tbm_dates]),
    }
    return render(request, "core/dashboard.html", context)


@login_required
def tbm_dates_by_month(request):
    """AJAX — 월 변경 시 해당 월 TBM 있는 날짜 목록 반환 (파란 점용)"""
    try:
        year  = int(request.GET.get("year",  timezone.localdate().year))
        month = int(request.GET.get("month", timezone.localdate().month))
    except (ValueError, TypeError):
        return JsonResponse({"success": False, "error": "잘못된 날짜"}, status=400)

    dates = set(
        Draft.objects
        .filter(user=request.user, work_date__year=year, work_date__month=month)
        .values_list("work_date", flat=True)
    )
    return JsonResponse({"success": True, "dates": [d.isoformat() for d in dates]})


@login_required
def tbm_by_date(request):
    """AJAX — 날짜 클릭 시 해당 날짜 TBM 카드 목록 반환"""
    date_str = request.GET.get("date")
    try:
        date = datetime.date.fromisoformat(date_str)
    except (TypeError, ValueError):
        return JsonResponse({"success": False, "error": "날짜 형식 오류"}, status=400)

    drafts = Draft.objects.filter(user=request.user, work_date=date).order_by("-created_at")

    data = [
        {
            "draft_id":              d.draft_id,
            "task_name":             d.task_name or "",
            "region_large":          d.region_large or "",
            "region_middle":         d.region_middle or "",
            "recording_duration_sec": d.recording_duration_sec,
            "editable":              is_editable(d),
            "created_at":            d.created_at.isoformat(),
        }
        for d in drafts
    ]
    return JsonResponse({"success": True, "drafts": data})


def ai_test(request):
    return render(request, "core/ai_test.html")


@login_required
def chatbot_page(request):
    # 페이지 진입 시 대화 초기화 — AI 서버도 새 thread로 시작
    request.session.pop("chatbot_thread_id", None)
    return render(request, "core/chatbot.html")
