from django.contrib import admin
from django.urls import include, path, re_path
from djangoapp import views

admin.site.site_header = "Best Cars Administration"
admin.site.index_title = "Dealership site administration"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("djangoapp/", include("djangoapp.urls")),
    path("health", views.health, name="health"),
    path("", views.static_page, {"template": "Home.html"}, name="home"),
    re_path(r"^about/?$", views.static_page, {"template": "About.html"}, name="about"),
    re_path(
        r"^contact/?$", views.static_page, {"template": "Contact.html"}, name="contact"
    ),
    re_path(r"^(?:login|register|dealers)/?$", views.spa),
    re_path(r"^(?:dealer|postreview)/\d+/?$", views.spa),
]
