# core/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/", views.dashboard, name="dashboard"),
    path("chatbot/", views.chatbot_page, name="chatbot-page"),
    path("ai-test/", views.ai_test, name="ai-test"), # 테스트용 나중에 삭제할 예정
]
