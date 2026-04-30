from django.shortcuts import render
from django.utils import timezone

def dashboard(request):
    today = timezone.now()
    context = {
        'current_month': today.month,
        'current_year': today.year,
        'months': range(1, 13),
        'years': [2024, 2025, 2026],
    }
    return render(request, "core/dashboard.html", context)


def chatbot_page(request):
    return render(request, "core/chatbot.html")