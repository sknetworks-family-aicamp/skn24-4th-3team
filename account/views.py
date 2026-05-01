import json
import random
import re

from django.conf import settings
from django.contrib.auth import (
    authenticate,
    get_user_model,
    login as auth_login,
    logout as auth_logout,
    update_session_auth_hash,
)
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.core.mail import send_mail
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST


User = get_user_model()

MAX_FAIL_COUNT = 5
LOCK_MINUTES = 10


def get_fail_cache_key(email):
    return f"login_fail_{email}"


def get_lock_cache_key(email):
    return f"login_lock_{email}"


def get_request_data(request):
    content_type = request.content_type or ""

    if "application/json" in content_type:
        try:
            return json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return {}

    return request.POST


def wants_json(request):
    return (
        "application/json" in (request.content_type or "")
        or request.headers.get("x-requested-with") == "XMLHttpRequest"
    )


def validate_password(password):
    if not (8 <= len(password) <= 16):
        return "비밀번호는 8~16자여야 합니다."

    if not re.search(r"[A-Z]", password):
        return "비밀번호에는 영문 대문자를 최소 1개 포함해야 합니다."

    if not re.search(r"[a-z]", password):
        return "비밀번호에는 영문 소문자를 최소 1개 포함해야 합니다."

    if not re.search(r"[0-9]", password):
        return "비밀번호에는 숫자를 최소 1개 포함해야 합니다."

    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return "비밀번호에는 특수문자를 최소 1개 포함해야 합니다."

    return None


def login_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        data = get_request_data(request)

        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not email or not password:
            payload = {
                "success": False,
                "message": "이메일과 비밀번호를 입력해주세요.",
            }

            if wants_json(request):
                return JsonResponse(payload, status=400)

            return render(
                request,
                "account/login.html",
                {
                    "error_message": payload["message"],
                    "email": email,
                },
            )

        lock_key = get_lock_cache_key(email)

        if cache.get(lock_key):
            payload = {
                "success": False,
                "locked": True,
                "message": "비밀번호를 5회 잘못 입력했습니다. 10분 후 다시 시도해주세요.",
            }

            if wants_json(request):
                return JsonResponse(payload, status=403)

            return render(
                request,
                "account/login.html",
                {
                    "locked": True,
                    "email": email,
                },
            )

        user = authenticate(request, username=email, password=password)

        if user is not None:
            cache.delete(get_fail_cache_key(email))
            auth_login(request, user)

            payload = {
                "success": True,
                "message": "로그인 성공",
                "redirect_url": "/core/dashboard/",
            }

            if wants_json(request):
                return JsonResponse(payload)

            return redirect("dashboard")

        fail_key = get_fail_cache_key(email)
        fail_count = cache.get(fail_key, 0) + 1
        cache.set(fail_key, fail_count, timeout=LOCK_MINUTES * 60)

        if fail_count >= MAX_FAIL_COUNT:
            cache.set(get_lock_cache_key(email), True, timeout=LOCK_MINUTES * 60)
            cache.delete(fail_key)

            payload = {
                "success": False,
                "locked": True,
                "message": "비밀번호를 5회 잘못 입력했습니다. 10분 후 다시 시도해주세요.",
            }

            if wants_json(request):
                return JsonResponse(payload, status=403)

            return render(
                request,
                "account/login.html",
                {
                    "locked": True,
                    "email": email,
                },
            )

        payload = {
            "success": False,
            "message": f"이메일 또는 비밀번호가 올바르지 않습니다. ({fail_count}/{MAX_FAIL_COUNT})",
        }

        if wants_json(request):
            return JsonResponse(payload, status=400)

        return render(
            request,
            "account/login.html",
            {
                "error_message": payload["message"],
                "email": email,
            },
        )

    return render(request, "account/login.html")


def logout_view(request):
    auth_logout(request)
    return redirect("login")


def signup_view(request):
    return redirect("register-terms")


def register_terms_view(request):
    return render(request, "account/register_terms.html")


def register_form_view(request):
    if request.method == "POST":
        data = get_request_data(request)

        email = data.get("email", "").strip()
        password = data.get("password", "")
        password_confirm = data.get("password_confirm", "")
        name = data.get("name", "").strip()
        company_name = data.get("company_name", data.get("company", "")).strip()
        position = data.get("position", "").strip()

        if not email or not password or not password_confirm or not name or not company_name or not position:
            return JsonResponse({
                "success": False,
                "message": "필수 항목을 입력해주세요.",
            }, status=400)

        verified_email = request.session.get("verified_email")

        if verified_email != email:
            return JsonResponse({
                "success": False,
                "message": "이메일 인증을 완료해주세요.",
            }, status=400)

        if password != password_confirm:
            return JsonResponse({
                "success": False,
                "message": "비밀번호가 일치하지 않습니다.",
            }, status=400)

        password_error = validate_password(password)

        if password_error:
            return JsonResponse({
                "success": False,
                "message": password_error,
            }, status=400)

        if User.objects.filter(email=email).exists():
            return JsonResponse({
                "success": False,
                "message": "이미 가입된 이메일입니다.",
            }, status=400)

        user = User(
            email=email,
            name=name,
            company_name=company_name,
            position=position,
            is_active=True,
        )
        user.set_password(password)
        user.save()

        request.session.pop("verified_email", None)

        return JsonResponse({
            "success": True,
            "message": "회원가입이 완료되었습니다.",
            "redirect_url": "/account/register/complete/",
        })

    return render(request, "account/register_form.html")


def register_user_info_view(request):
    return render(request, "account/register_user_info.html")


def register_complete_view(request):
    return render(request, "account/register_complete.html")


@require_POST
def send_verification_code(request):
    data = get_request_data(request)
    email = data.get("email", "").strip()

    if not email:
        return JsonResponse({
            "success": False,
            "message": "이메일을 입력해주세요.",
        }, status=400)

    code = str(random.randint(100000, 999999))
    cache.set(f"auth_code_{email}", code, timeout=300)

    try:
        result = send_mail(
            "[Helpmet] 이메일 인증번호입니다.",
            f"인증번호는 [{code}] 입니다. 5분 이내에 입력해주세요.",
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )

        print("인증번호 발송 요청:", email)
        print("보내는 이메일:", settings.DEFAULT_FROM_EMAIL)
        print("메일 발송 결과:", result)

    except Exception as exc:
        print("메일 발송 오류:", exc)

        return JsonResponse({
            "success": False,
            "message": str(exc),
        }, status=500)

    return JsonResponse({
        "success": True,
        "message": "인증번호가 발송되었습니다.",
    })


@require_POST
def verify_certification_code(request):
    data = get_request_data(request)

    email = data.get("email", "").strip()
    user_code = data.get("code", "").strip()

    if not email or not user_code:
        return JsonResponse({
            "success": False,
            "message": "이메일과 인증번호를 모두 입력해주세요.",
        }, status=400)

    expected_code = cache.get(f"auth_code_{email}")

    if expected_code is None:
        return JsonResponse({
            "success": False,
            "message": "인증 시간이 만료되었거나 이메일 주소가 잘못되었습니다.",
        }, status=400)

    if expected_code != user_code:
        return JsonResponse({
            "success": False,
            "message": "인증번호가 일치하지 않습니다.",
        }, status=400)

    cache.delete(f"auth_code_{email}")

    request.session["verified_email"] = email
    request.session.modified = True

    return JsonResponse({
        "success": True,
        "message": "인증에 성공했습니다.",
    })


def password_find_view(request):
    if request.method == "GET":
        return render(request, "account/password_find.html")

    data = get_request_data(request)

    email = request.session.get("verified_email")
    new_password = data.get("new_password", "")
    new_password_confirm = data.get("new_password_confirm", "")

    if not email:
        return JsonResponse({
            "success": False,
            "message": "이메일 인증을 먼저 완료해주세요.",
        }, status=400)

    if not new_password or not new_password_confirm:
        return JsonResponse({
            "success": False,
            "message": "새 비밀번호를 입력해주세요.",
        }, status=400)

    if new_password != new_password_confirm:
        return JsonResponse({
            "success": False,
            "message": "비밀번호가 일치하지 않습니다.",
        }, status=400)

    password_error = validate_password(new_password)

    if password_error:
        return JsonResponse({
            "success": False,
            "message": password_error,
        }, status=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({
            "success": False,
            "message": "가입된 사용자를 찾을 수 없습니다.",
        }, status=404)

    user.set_password(new_password)
    user.save()

    request.session.pop("verified_email", None)

    return JsonResponse({
        "success": True,
        "message": "비밀번호가 성공적으로 재설정되었습니다.",
        "redirect_url": "/account/login/",
    })


@login_required
def mypage_view(request):
    if request.method == "GET":
        return render(request, "account/mypage.html")

    data = get_request_data(request)
    action = data.get("action")

    if action == "update_info":
        name = data.get("name", "").strip()
        company_name = data.get("company_name", data.get("company", "")).strip()
        position = data.get("position", "").strip()

        pattern = re.compile(r"^[가-힣a-zA-Z0-9\s]+$")

        if name and not pattern.match(name):
            return JsonResponse({
                "success": False,
                "message": "성명은 한글, 영어, 숫자만 입력 가능합니다.",
            }, status=400)

        if company_name and not pattern.match(company_name):
            return JsonResponse({
                "success": False,
                "message": "업체명은 한글, 영어, 숫자만 입력 가능합니다.",
            }, status=400)

        if position and not pattern.match(position):
            return JsonResponse({
                "success": False,
                "message": "직책은 한글, 영어, 숫자만 입력 가능합니다.",
            }, status=400)

        user = request.user

        if name:
            user.name = name

        if company_name:
            user.company_name = company_name

        if position:
            user.position = position

        user.save()

        return JsonResponse({
            "success": True,
            "message": "개인정보가 성공적으로 변경되었습니다.",
            "data": {
                "name": user.name,
                "company": user.company_name,
                "company_name": user.company_name,
                "position": user.position,
            },
        })

    if action == "change_password":
        current_password = data.get("current_password", "")
        new_password = data.get("new_password", "")
        new_password_confirm = data.get("new_password_confirm", "")

        if not request.user.check_password(current_password):
            return JsonResponse({
                "success": False,
                "message": "현재 비밀번호가 올바르지 않습니다.",
            }, status=400)

        if new_password != new_password_confirm:
            return JsonResponse({
                "success": False,
                "message": "새 비밀번호가 일치하지 않습니다.",
            }, status=400)

        password_error = validate_password(new_password)

        if password_error:
            return JsonResponse({
                "success": False,
                "message": password_error,
            }, status=400)

        request.user.set_password(new_password)
        request.user.save()

        update_session_auth_hash(request, request.user)

        return JsonResponse({
            "success": True,
            "message": "비밀번호가 변경되었습니다.",
        })

    if action == "withdraw":
        confirm_text = data.get("confirm_text", "").strip()

        if confirm_text != "회원탈퇴":
            return JsonResponse({
                "success": False,
                "message": "'회원탈퇴'를 정확히 입력해주세요.",
            }, status=400)

        user = request.user
        auth_logout(request)
        user.delete()

        return JsonResponse({
            "success": True,
            "message": "회원 탈퇴가 완료되었습니다.",
            "redirect_url": "/account/login/",
        })

    return JsonResponse({
        "success": False,
        "message": "알 수 없는 요청입니다.",
    }, status=400)