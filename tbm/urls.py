from django.urls import path
from . import views

app_name = "tbm"

urlpatterns = [
    path("create/", views.tbm_create, name="tbm-create"),
    path("recording/", views.tbm_recording, name="tbm-recording"),
    path("draft/", views.tbm_draft, name="tbm-draft"),
    path("edit/<int:draft_id>/", views.tbm_edit, name="tbm-edit"),
    path("update/<int:draft_id>/", views.tbm_update, name="tbm-update"),
    path("list/", views.tbm_list, name="tbm-list"),
    path("detail/<int:draft_id>/", views.tbm_detail, name="tbm-detail"),
    path("delete/<int:draft_id>/", views.tbm_delete, name="tbm-delete"),
]