from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("api/cloudkit-token/", views.cloudkit_api_token, name="cloudkit_api_token"),
    path("api/screenshots/save/", views.save_screenshot, name="save_screenshot"),
    path("api/screenshots/", views.get_screenshots, name="get_screenshots"),
    path("api/screenshots/<int:screenshot_id>/delete/", views.delete_screenshot, name="delete_screenshot"),
]
