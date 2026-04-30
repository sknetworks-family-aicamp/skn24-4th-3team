# core/urls.py
from django.urls import path
from . import views

app_name = "core"

urlpatterns = [
    path("dashboard/", views.dashboard, name="dashboard"),
    path("chatbot/", views.chatbot_page, name="chatbot-page"),
]
