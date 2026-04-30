from django.urls import path
from . import views

urlpatterns = [
    path("create/", views.tbm_create, name="tbm-create"),
]