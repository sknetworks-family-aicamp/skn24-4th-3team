# core/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/",    views.dashboard,    name="dashboard"),
    path("tbm-by-date/",       views.tbm_by_date,        name="tbm-by-date"),
    path("tbm-dates-by-month/", views.tbm_dates_by_month, name="tbm-dates-by-month"),
    path("chatbot/",      views.chatbot_page,  name="chatbot-page"),
    path("ai-test/",      views.ai_test,       name="ai-test"),
]
