from django.shortcuts import render

def dashboard(request):
    return render(request, "core/dashboard.html")


def ai_test(request):
    return render(request, "core/ai_test.html")


def chatbot_page(request):
    return render(request, "core/chatbot.html")
