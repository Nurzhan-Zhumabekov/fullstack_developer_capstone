from urllib.parse import quote

import requests
from django.conf import settings


class ServiceError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


def _request(method, service_url, endpoint, data=None):
    url = f"{service_url.rstrip('/')}/{endpoint.lstrip('/')}"
    try:
        response = requests.request(
            method,
            url,
            json=data,
            timeout=(2, 4),
            allow_redirects=False,
            headers={"Accept": "application/json"},
        )
    except requests.Timeout as error:
        raise ServiceError("The data service did not respond in time.", 504) from error
    except requests.RequestException as error:
        raise ServiceError("The data service is unavailable.") from error

    if response.status_code == 404:
        raise ServiceError("The requested record was not found.", 404)
    if response.status_code == 400:
        raise ServiceError("The data service rejected the request.", 400)
    if not 200 <= response.status_code < 300:
        raise ServiceError("The data service returned an error.")
    try:
        return response.json()
    except ValueError as error:
        raise ServiceError("The data service returned an invalid response.") from error


def get_request(endpoint):
    return _request("GET", settings.DEALERS_API_URL, endpoint)


def post_review(data_dict):
    return _request("POST", settings.DEALERS_API_URL, "/insert_review", data_dict)


def analyze_review_sentiments(text):
    # The legacy analyzer receives a path parameter rather than a JSON payload.
    endpoint = f"/analyze/{quote(text, safe='')}"
    response = _request("GET", settings.SENTIMENT_API_URL, endpoint)
    if not isinstance(response, dict):
        raise ServiceError("The sentiment service returned an invalid response.")
    sentiment = response.get("sentiment")
    if sentiment not in ("positive", "neutral", "negative"):
        raise ServiceError("The sentiment service returned an invalid classification.")
    return sentiment
