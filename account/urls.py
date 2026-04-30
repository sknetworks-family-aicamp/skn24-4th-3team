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
]
