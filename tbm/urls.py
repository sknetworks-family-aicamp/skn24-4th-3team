from django.urls import path

from . import views

urlpatterns = [
    path("create/",                       views.tbm_create,    name="tbm-create"),
    path("recording/",                    views.tbm_recording, name="tbm-recording"),
    path("draft/<int:draft_id>/",         views.tbm_draft,     name="tbm-draft"),
    path("edit/<int:draft_id>/",          views.tbm_edit,      name="tbm-edit"),
    path("detail/<int:draft_id>/",        views.tbm_detail,    name="tbm-detail"),
    path("delete/<int:draft_id>/",        views.tbm_delete,    name="tbm-delete"),
    path("last-location/",                views.tbm_last_location, name="tbm-last-location"),
    path("list/",                         views.tbm_list,      name="tbm-list"),
]
