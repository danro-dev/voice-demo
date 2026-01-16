from django.contrib import admin
from django.urls import path
from core.views import session_token

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/session/", session_token, name="session_token"),
]
