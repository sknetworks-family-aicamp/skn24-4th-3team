from django.urls import path
from . import views

urlpatterns = [
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("mypage/", views.mypage_view, name="mypage"),
    path("signup/", views.signup_view, name="signup"),
    path("register/terms/", views.register_terms_view, name="register-terms"),
    path("register/form/", views.register_form_view, name="register-form"),
    path("register/user-info/", views.register_user_info_view, name="register-user-info"),
    path("register/complete/", views.register_complete_view, name="register-complete"),
    path("password/find/", views.password_find_view, name="password-find"),
    path("api/page", views.api_sample_page, name="sample-api-page"),
    path("api/response", views.api_sample_response, name="sample-api-response"),
    path("send-verification-code/", views.send_verification_code, name="send-verification-code"),
    path("verify-certification-code/", views.verify_certification_code, name="verify-certification-code"),
]
