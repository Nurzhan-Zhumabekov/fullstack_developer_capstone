from django.urls import path

from . import views

app_name = "djangoapp"
urlpatterns = [
    path("session", views.session, name="session"),
    path("login", views.login_user, name="login"),
    path("logout", views.logout_user, name="logout"),
    path("register", views.registration, name="register"),
    path("dealers", views.get_dealerships, name="dealers"),
    path("dealers/<str:state>", views.get_dealerships, name="dealers_by_state"),
    path("dealer/<int:dealer_id>", views.get_dealer_details, name="dealer"),
    path("reviews/dealer/<int:dealer_id>", views.get_dealer_reviews, name="reviews"),
    path("add_review", views.add_review, name="add_review"),
    path("get_cars", views.get_cars, name="get_cars"),
    path("analyze_review/<path:text>", views.analyze_review, name="sentiment"),
    path("loginuser", views.login_user),
    path("logoutuser", views.logout_user),
    path("getalldealers", views.get_dealerships),
    path("getdealersbyState/<str:state>", views.get_dealerships),
    path("getdealerbyid/<int:dealer_id>", views.get_dealer_details),
    path("getdealerreviews/<int:dealer_id>", views.get_dealer_reviews),
    path("getallcarmakes", views.get_cars),
    path("analyzereview/<path:text>", views.analyze_review),
]
