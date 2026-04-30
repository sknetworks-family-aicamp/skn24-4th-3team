# core/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/", views.dashboard, name="dashboard"),
    path("ai-test/", views.ai_test, name="ai-test"),
    path("chatbot/", views.chatbot_page, name="chatbot-page"),
]
