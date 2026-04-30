import re
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.core.cache import cache


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
# 로그인
# ----------------------------

def login_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        email = request.POST.get("email", "").strip()
        password = request.POST.get("password", "")

        lock_key = get_lock_cache_key(email)
        if cache.get(lock_key):
            return render(request, "account/login.html", {
                "locked": True,
                "email": email,
            })

        user = authenticate(request, username=email, password=password)

        if user is not None:
            cache.delete(get_fail_cache_key(email))
            auth_login(request, user)
            return redirect("dashboard")

        else:
            fail_key = get_fail_cache_key(email)
            fail_count = cache.get(fail_key, 0) + 1
            cache.set(fail_key, fail_count, timeout=LOCK_MINUTES * 60)

            if fail_count >= MAX_FAIL_COUNT:
                cache.set(lock_key, True, timeout=LOCK_MINUTES * 60)
                cache.delete(fail_key)
                return render(request, "account/login.html", {
                    "locked": True,
                    "email": email,
                })

            return render(request, "account/login.html", {
                "error_message": f"이메일 또는 비밀번호가 올바르지 않습니다. ({fail_count}/{MAX_FAIL_COUNT})",
                "email": email,
            })

    return render(request, "account/login.html")


# ----------------------------
# 로그아웃
# ----------------------------

def logout_view(request):
    auth_logout(request)
    return redirect("login")


# ----------------------------
# 마이페이지
# ----------------------------

@login_required
def mypage_view(request):
    context = {}
    tab = request.GET.get("tab", "info")

    if request.method == "POST":
        action = request.POST.get("action")

        # ── 정보 수정 ──
        if action == "update_info":
            name = request.POST.get("name", "").strip()
            company = request.POST.get("company", "").strip()
            position = request.POST.get("position", "").strip()

            pattern = re.compile(r'^[가-힣a-zA-Z0-9]+$')

            if name and not pattern.match(name):
                context["info_error"] = "성명은 한글, 영어, 숫자만 입력 가능합니다."
            elif company and not pattern.match(company):
                context["info_error"] = "업체명은 한글, 영어, 숫자만 입력 가능합니다."
            elif position and not pattern.match(position):
                context["info_error"] = "직책은 한글, 영어, 숫자만 입력 가능합니다."
            else:
                user = request.user
                if name:
                    user.name = name
                if company:
                    user.company = company
                if position:
                    user.position = position
                user.save()
                context["info_success"] = True

            return render(request, "account/mypage.html", {**context, "tab": "info"})

        # ── 비밀번호 변경 ──
        elif action == "change_password":
            current_password = request.POST.get("current_password", "")
            new_password = request.POST.get("new_password", "")
            new_password_confirm = request.POST.get("new_password_confirm", "")

            if not request.user.check_password(current_password):
                context["pw_error"] = "현재 비밀번호가 올바르지 않습니다."
            elif new_password != new_password_confirm:
                context["pw_error"] = "새 비밀번호가 일치하지 않습니다."
            elif not re.search(r'[A-Z]', new_password):
                context["pw_error"] = "새 비밀번호에 영문 대문자를 최소 1개 포함해야 합니다."
            elif not re.search(r'[a-z]', new_password):
                context["pw_error"] = "새 비밀번호에 영문 소문자를 최소 1개 포함해야 합니다."
            elif not re.search(r'[0-9]', new_password):
                context["pw_error"] = "새 비밀번호에 숫자를 최소 1개 포함해야 합니다."
            elif not re.search(r'[!@#$%^&*(),.?":{}|<>]', new_password):
                context["pw_error"] = "새 비밀번호에 특수문자를 최소 1개 포함해야 합니다."
            elif not (8 <= len(new_password) <= 16):
                context["pw_error"] = "새 비밀번호는 8~16자여야 합니다."
            else:
                request.user.set_password(new_password)
                request.user.save()
                update_session_auth_hash(request, request.user)
                context["pw_success"] = True

            return render(request, "account/mypage.html", {**context, "tab": "password"})

        # ── 회원 탈퇴 ──
        elif action == "withdraw":
            confirm_text = request.POST.get("confirm_text", "").strip()

            if confirm_text != "회원탈퇴":
                context["withdrawal_error"] = "'회원탈퇴'를 정확히 입력해주세요."
                return render(request, "account/mypage.html", {**context, "tab": "withdrawal"})

            user = request.user
            logout_view(request)
            user.delete()
            return redirect("login")

    return render(request, "account/mypage.html", {"tab": tab})

#-------------------------------
# 회원가입 페이지 (임시) 
# ------------------------------
def signup_view(request):
    return render(request, "account/signup.html")