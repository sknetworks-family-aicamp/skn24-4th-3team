from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from core.ai_client import AiServerError, create_tbm_draft

from .models import Draft
from .utils import is_editable, save_tbm_draft


def _get_owned_draft(draft_id: int, user) -> Draft:
    """소유자 확인 포함 Draft 조회 — 없거나 타인 소유면 404"""
    return get_object_or_404(Draft, draft_id=draft_id, user=user)


@login_required
def tbm_recording(request):
    return render(request, "tbm/tbm_recording.html")


@login_required
def tbm_create(request):
    if request.method != "POST":
        return render(request, "tbm/tbm_form.html")

    try:
        uploaded_file = request.FILES.get("audio_file")
        if not uploaded_file:
            raise ValueError("음성 파일이 업로드되지 않았습니다.")

        result = create_tbm_draft(
            uploaded_file=uploaded_file,
            lat=request.POST.get("lat"),
            lon=request.POST.get("lon"),
        )
        ai_data = result.get("data", {})

        form_data = {
            "task_name":             request.POST.get("task_name"),
            "region_large":          request.POST.get("region_large"),
            "region_middle":         request.POST.get("region_middle"),
            "region_detail":         request.POST.get("region_detail"),
            "recording_duration_sec": request.POST.get("recording_duration_sec"),
        }

        draft = save_tbm_draft(request.user, ai_data, form_data)
        return JsonResponse({"success": True, "draft_id": draft.draft_id})

    except AiServerError as e:
        return JsonResponse({"success": False, "error": str(e)}, status=502)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)


@login_required
def tbm_draft(request, draft_id: int):
    draft = _get_owned_draft(draft_id, request.user)
    return render(request, "tbm/tbm_draft.html", {
        "draft":    draft,
        "weather":  getattr(draft, "weatherinfo", None),
        "editable": is_editable(draft),
    })


@login_required
def tbm_edit(request, draft_id: int):
    draft = _get_owned_draft(draft_id, request.user)

    if not is_editable(draft):
        return redirect("tbm-detail", draft_id=draft_id)

    if request.method == "POST":
        draft.draft_text = request.POST.get("draft_text", draft.draft_text)
        draft.save(update_fields=["draft_text", "updated_at"])
        return redirect("dashboard")

    return render(request, "tbm/tbm_edit.html", {
        "draft":   draft,
        "weather": getattr(draft, "weatherinfo", None),
    })


@login_required
def tbm_detail(request, draft_id: int):
    draft = _get_owned_draft(draft_id, request.user)
    return render(request, "tbm/tbm_detail.html", {
        "draft":    draft,
        "weather":  getattr(draft, "weatherinfo", None),
        "editable": is_editable(draft),
    })


@login_required
@require_POST
def tbm_delete(request, draft_id: int):
    draft = _get_owned_draft(draft_id, request.user)
    draft.delete()
    return JsonResponse({"success": True})


@login_required
def tbm_last_location(request):
    """가장 최근 TBM의 작업 장소 반환 — 폼 기본값 설정용"""
    draft = Draft.objects.filter(user=request.user).order_by('-created_at').first()
    if not draft:
        return JsonResponse({"success": False})
    return JsonResponse({
        "success":       True,
        "task_name":     draft.task_name     or "",
        "region_large":  draft.region_large  or "",
        "region_middle": draft.region_middle or "",
    })


@login_required
def tbm_list(request):
    drafts_qs = Draft.objects.filter(user=request.user).order_by("-created_at")
    page_obj = Paginator(drafts_qs, 6).get_page(request.GET.get("page", 1))
    return render(request, "tbm/tbm_list.html", {"page_obj": page_obj})
