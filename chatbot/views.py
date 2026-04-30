import uuid
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from services.chatbot_service import answer_safety_question


@csrf_exempt
@require_http_methods(["POST"])
def chatbot_ask(request):
    reset = request.POST.get("reset") == "true"
    if reset:
        request.session["chatbot_thread_id"] = str(uuid.uuid4())

    user_message = request.POST.get("message", "").strip()

    if not user_message:
        return JsonResponse(
            {"success": False, "error": "메시지를 입력해주세요."},
            status=400,
        )

    thread_id = request.session.get("chatbot_thread_id")
    if not thread_id:
        thread_id = str(uuid.uuid4())
        request.session["chatbot_thread_id"] = thread_id

    answer = answer_safety_question(
        user_input=user_message,
        thread_id=thread_id,
    )

    return JsonResponse({
        "success": True,
        "data": {
            "answer": answer,
            "thread_id": thread_id,
        }
    })