from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("api/cloudkit-token/", views.cloudkit_api_token, name="cloudkit_api_token"),
    path("authentication", views.authentication, name="authentication"),
]
