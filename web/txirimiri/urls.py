from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("api/cloudkit-token/", views.cloudkit_api_token, name="cloudkit_api_token"),
    path("api/save-user-session/", views.save_user_session, name="save_user_session"),
    path("api/clear-user-session/", views.clear_user_session, name="clear_user_session"),
    path("api/get-user-session/", views.get_user_session, name="get_user_session"),
    path("authentication", views.authentication, name="authentication"),
]
