from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("api/screenshots/save/", views.save_screenshot, name="save_screenshot"),
    path("api/screenshots/", views.get_screenshots, name="get_screenshots"),
]
