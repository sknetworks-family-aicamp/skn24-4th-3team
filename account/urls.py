from django.urls import path
from . import views

urlpatterns = [
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("mypage/", views.mypage_view, name="mypage"),
    path("signup/", views.signup_view, name="signup"),
]
