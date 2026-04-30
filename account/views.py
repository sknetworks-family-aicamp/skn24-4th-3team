import re
import json
import random

from django.conf import settings
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout, update_session_auth_hash, get_user_model
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.core.mail import send_mail
from django.http import JsonResponse
from django.views.decorators.http import require_POST


User = get_user_model()


# ----------------------------
# 로그인 실패 횟수 관련 설정
# ----------------------------

MAX_FAIL_COUNT = 5
LOCK_MINUTES = 10


def get_fail_cache_key(email):
    return f"login_fail_{email}"


def get_lock_cache_key(email):
    return f"login_lock_{email}"


# ----------------------------
# 공통 함수
# ----------------------------

def get_request_data(request):
    content_type = request.content_type or ""

    if "application/json" in content_type:
        try:
            return json.loads(request.body)
        except json.JSONDecodeError:
            return {}

    return request.POST


def validate_password(password):
    if not (8 <= len(password) <= 16):
        return "비밀번호는 8~16자여야 합니다."

    if not re.search(r"[A-Z]", password):
        return "비밀번호에 영문 대문자를 최소 1개 포함해야 합니다."

    if not re.search(r"[a-z]", password):
        return "비밀번호에 영문 소문자를 최소 1개 포함해야 합니다."

    if not re.search(r"[0-9]", password):
        return "비밀번호에 숫자를 최소 1개 포함해야 합니다."

    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return "비밀번호에 특수문자를 최소 1개 포함해야 합니다."

    return None


# ----------------------------
# 로그인
# ----------------------------

def login_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        data = get_request_data(request)

        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not email or not password:
            return JsonResponse({
                "success": False,
                "message": "이메일과 비밀번호를 입력해주세요.",
            }, status=400)

        lock_key = get_lock_cache_key(email)

        if cache.get(lock_key):
            return JsonResponse({
                "success": False,
                "locked": True,
                "message": "비밀번호를 5회 잘못 입력하였습니다. 10분 후 다시 시도해주세요.",
            }, status=403)

        # USERNAME_FIELD = "email" 이므로 username 인자에 email을 넣어 인증
        user = authenticate(request, username=email, password=password)

        if user is not None:
            cache.delete(get_fail_cache_key(email))
            auth_login(request, user)

            return JsonResponse({
                "success": True,
                "message": "로그인 성공",
                "redirect_url": "/core/dashboard/",
            })

        fail_key = get_fail_cache_key(email)
        fail_count = cache.get(fail_key, 0) + 1
        cache.set(fail_key, fail_count, timeout=LOCK_MINUTES * 60)

        if fail_count >= MAX_FAIL_COUNT:
            cache.set(lock_key, True, timeout=LOCK_MINUTES * 60)
            cache.delete(fail_key)

            return JsonResponse({
                "success": False,
                "locked": True,
                "message": "비밀번호를 5회 잘못 입력하였습니다. 10분 후 다시 시도해주세요.",
            }, status=403)

        return JsonResponse({
            "success": False,
            "message": f"이메일 또는 비밀번호가 올바르지 않습니다. ({fail_count}/{MAX_FAIL_COUNT})",
        }, status=400)

    return render(request, "account/login.html")


# ----------------------------
# 로그아웃
# ----------------------------

def logout_view(request):
    auth_logout(request)
    return redirect("login")


# ----------------------------
# 회원가입 화면
# ----------------------------

def signup_view(request):
    return redirect("register_terms")


def register_terms_view(request):
    return render(request, "account/register_terms.html")


def register_form_view(request):
    if request.method == "POST":
        data = get_request_data(request)

        email = data.get("email", "").strip()
        password = data.get("password", "")
        password_confirm = data.get("password_confirm", "")
        name = data.get("name", "").strip()
        company_name = data.get("company_name", "").strip()
        position = data.get("position", "").strip()

        if not email or not password or not password_confirm or not name:
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

        # username = None 구조라 create_user 대신 직접 생성 + set_password 사용
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
            "redirect_url": "/account/register-complete/",
        })

    return render(request, "account/register_form.html")


def register_user_info_view(request):
    return render(request, "account/register_user_info.html")


def register_complete_view(request):
    return render(request, "account/register_complete.html")


# ----------------------------
# 이메일 인증번호 발송 / 확인
# 회원가입, 비밀번호 찾기 공통 사용
# ----------------------------

@require_POST
def send_verification_code(request):
    try:
        data = get_request_data(request)
        email = data.get("email", "").strip()

        if not email:
            return JsonResponse({
                "success": False,
                "message": "이메일을 입력해주세요.",
            }, status=400)

        code = str(random.randint(100000, 999999))

        cache.set(f"auth_code_{email}", code, timeout=300)

        subject = "[Helpmet] 이메일 인증번호입니다."
        message = f"인증번호는 [{code}] 입니다. 5분 이내에 입력해주세요."

        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )

        return JsonResponse({
            "success": True,
            "message": "인증번호가 발송되었습니다.",
        })

    except Exception as e:
        return JsonResponse({
            "success": False,
            "message": str(e),
        }, status=500)


@require_POST
def verify_certification_code(request):
    try:
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

        # 회원가입 / 비밀번호 찾기에서 공통 사용
        request.session["verified_email"] = email
        request.session.modified = True

        return JsonResponse({
            "success": True,
            "message": "인증에 성공했습니다.",
        })

    except Exception:
        return JsonResponse({
            "success": False,
            "message": "검증 중 오류가 발생했습니다.",
        }, status=500)


# ----------------------------
# 비밀번호 찾기 + 비밀번호 재설정
# ----------------------------

def password_find_view(request):
    if request.method == "GET":
        return render(request, "account/password_find.html")

    if request.method == "POST":
        try:
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

        except Exception as e:
            return JsonResponse({
                "success": False,
                "message": str(e),
            }, status=500)


# ----------------------------
# 마이페이지
# ----------------------------

@login_required
def mypage_view(request):
    if request.method == "GET":
        return render(request, "account/mypage.html")

    data = get_request_data(request)
    action = data.get("action")

    # ── 정보 수정 ──
    if action == "update_info":
        name = data.get("name", "").strip()

        company_name = data.get("company_name", "").strip()

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
                "company_name": user.company_name,
                "position": user.position,
            },
        })

    # ── 비밀번호 변경 ──
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

    # ── 회원 탈퇴 ──
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



def api_sample_page(request):
    return render(request, "account/apisample.html")

def api_sample_response(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        user_name = data.get('username')
        return JsonResponse({'status': 'success', 'message': f'{user_name} 님 환영합니다!'}, status=200)
    else :
        return JsonResponse({'status': 'fail', 'message':"POST 로 요청주세요"}, status=400)