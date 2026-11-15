import json
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from functools import wraps
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import FileResponse, HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.csrf import csrf_failure
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from . import restapis
from .models import CarMake, CarModel


class RequestError(ValueError):
    pass


def api_errors(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        try:
            return view(*args, **kwargs)
        except RequestError as error:
            return api_response(400, error=str(error))
        except restapis.ServiceError as error:
            return api_response(error.status, error=str(error))

    return wrapped


def api_response(status=200, **data):
    return JsonResponse({"status": status, **data}, status=status)


def user_response(user, status=200, **data):
    return api_response(
        status,
        authenticated=bool(user and user.is_authenticated),
        userName=user.get_username() if user and user.is_authenticated else "",
        **data,
    )


def read_body(request):
    if request.content_type != "application/json":
        raise RequestError("Use Content-Type application/json.")
    try:
        data = json.loads(request.body)
    except (UnicodeDecodeError, ValueError) as error:
        raise RequestError("Send a valid JSON object.") from error
    if not isinstance(data, dict):
        raise RequestError("Send a valid JSON object.")
    return data


def text_field(data, name, limit, *, required=True, strip=True):
    value = data.get(name, "")
    if not isinstance(value, str):
        raise RequestError(f"{name} must be text.")
    if strip:
        value = value.strip()
    if (required and not value) or len(value) > limit:
        raise RequestError(f"{name} has an invalid length.")
    return value


def integer_field(data, name, *, minimum=1, maximum=2_147_483_647):
    value = data.get(name)
    if isinstance(value, str) and re.fullmatch(r"[0-9]{1,10}", value):
        value = int(value)
    if type(value) is not int or not minimum <= value <= maximum:
        raise RequestError(
            f"{name} must be an integer between {minimum} and {maximum}."
        )
    return value


def json_csrf_failure(request, reason=""):
    if request.path.startswith("/djangoapp/"):
        return api_response(
            403, error="CSRF validation failed. Reload the page and try again."
        )
    return csrf_failure(request, reason=reason)


@require_GET
def health(request):
    return JsonResponse({"status": "OK"})


@ensure_csrf_cookie
@never_cache
@require_GET
def session(request):
    return user_response(request.user)


@never_cache
@require_POST
@api_errors
def login_user(request):
    data = read_body(request)
    username = text_field(data, "userName", 150)
    password = text_field(data, "password", 256, strip=False)
    user = authenticate(request, username=username, password=password)
    if user is None:
        return user_response(None, 401, error="Invalid username or password.")
    login(request, user)
    return user_response(user)


@never_cache
@require_POST
def logout_user(request):
    logout(request)
    return user_response(None)


@never_cache
@require_POST
@api_errors
def registration(request):
    data = read_body(request)
    password = text_field(data, "password", 256, strip=False)
    user = get_user_model()(
        username=text_field(data, "userName", 150),
        first_name=text_field(data, "firstName", 150, required=False),
        last_name=text_field(data, "lastName", 150, required=False),
        email=text_field(data, "email", 254),
    )
    try:
        user.full_clean(exclude=("password",), validate_unique=False)
        validate_password(password, user=user)
    except ValidationError as error:
        return api_response(400, error=" ".join(error.messages))
    user.set_password(password)
    try:
        with transaction.atomic():
            user.save()
    except IntegrityError:
        return api_response(409, error="This username is already registered.")
    login(request, user)
    return user_response(user, 201)


def as_collection(data, key):
    entries = data.get(key) if isinstance(data, dict) else data
    if not isinstance(entries, list) or not all(
        isinstance(entry, dict) for entry in entries
    ):
        raise restapis.ServiceError("The dealership service returned invalid records.")
    return entries


@require_GET
@api_errors
def get_dealerships(request, state=""):
    endpoint = "/fetchDealers"
    if state and state.lower() not in ("all", "all states"):
        if not re.fullmatch(r"[a-zA-Z][a-zA-Z .-]{0,49}", state):
            raise RequestError("Use a valid state name or postal abbreviation.")
        endpoint += f"/{quote(state, safe='')}"
    return api_response(
        dealers=as_collection(restapis.get_request(endpoint), "dealers")
    )


@require_GET
@api_errors
def get_dealer_details(request, dealer_id):
    dealer = restapis.get_request(f"/fetchDealer/{dealer_id}")
    if isinstance(dealer, list):
        # Older versions of the starter return an array for a single dealer.
        dealer = dealer[0] if dealer else None
    if dealer is None:
        return api_response(404, error="Dealership not found.")
    if not isinstance(dealer, dict) or not dealer.get("id"):
        raise restapis.ServiceError("The dealership service returned invalid details.")
    return api_response(dealer=dealer)


def add_sentiment(review):
    if review.get("sentiment") not in ("positive", "neutral", "negative"):
        text = review.get("review")
        if isinstance(text, str) and text.strip():
            try:
                return {**review, "sentiment": restapis.analyze_review_sentiments(text)}
            except restapis.ServiceError:
                # Reviews remain available if the separate analyzer is offline.
                pass
    return review


@require_GET
@api_errors
def get_dealer_reviews(request, dealer_id):
    reviews = as_collection(
        restapis.get_request(f"/fetchReviews/dealer/{dealer_id}"),
        "reviews",
    )
    if reviews:
        with ThreadPoolExecutor(max_workers=4) as workers:
            reviews = list(workers.map(add_sentiment, reviews))
    return api_response(reviews=reviews)


@never_cache
@require_POST
@api_errors
def add_review(request):
    if not request.user.is_authenticated:
        return api_response(401, error="Sign in before submitting a review.")
    data = read_body(request)
    if type(data.get("purchase")) is not bool:
        raise RequestError("purchase must be true or false.")
    review = {
        "dealership": integer_field(data, "dealership"),
        "name": request.user.get_full_name() or request.user.get_username(),
        "review": text_field(data, "review", 1000),
        "purchase": data["purchase"],
    }
    if data["purchase"]:
        date_text = text_field(data, "purchase_date", 10)
        try:
            purchase_date = date.fromisoformat(date_text)
        except ValueError as error:
            raise RequestError("Use YYYY-MM-DD for the purchase date.") from error
        if purchase_date > date.today():
            raise RequestError("The purchase date cannot be in the future.")
        review.update(
            purchase_date=purchase_date.isoformat(),
            car_make=text_field(data, "car_make", 80),
            car_model=text_field(data, "car_model", 80),
            car_year=integer_field(
                data, "car_year", minimum=1886, maximum=date.today().year + 1
            ),
        )
    saved = restapis.post_review(review)
    if not isinstance(saved, dict) or not saved.get("id"):
        raise restapis.ServiceError(
            "The dealership service returned an invalid saved review."
        )
    return api_response(201, review=saved)


@require_GET
def get_cars(request):
    makes = list(CarMake.objects.values("id", "name", "description"))
    cars = [
        {
            "id": car.id,
            "CarMake": car.car_make.name,
            "CarModel": car.name,
            "year": car.year,
            "type": car.type,
        }
        for car in CarModel.objects.select_related("car_make")
    ]
    return api_response(CarMakes=makes, CarModels=cars)


@require_GET
@api_errors
def analyze_review(request, text):
    message = text_field({"text": text}, "text", 1000)
    return api_response(sentiment=restapis.analyze_review_sentiments(message))


@ensure_csrf_cookie
@require_GET
def static_page(request, template):
    return render(request, template)


@ensure_csrf_cookie
@require_GET
def spa(request, **kwargs):
    index = settings.FRONTEND_BUILD_DIR / "index.html"
    try:
        source = index.open("rb")
    except FileNotFoundError:
        return HttpResponse("The frontend build is unavailable.", status=503)
    return FileResponse(source, content_type="text/html; charset=utf-8")
