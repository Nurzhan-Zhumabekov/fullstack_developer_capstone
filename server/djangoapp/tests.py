import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import Client, TestCase


class AccountAPITests(TestCase):
    def test_registration_session_and_logout_require_csrf(self):
        client = Client(enforce_csrf_checks=True)
        session = client.get("/djangoapp/session")
        self.assertEqual(
            session.json(), {"status": 200, "authenticated": False, "userName": ""}
        )
        payload = {
            "userName": "testbuyer",
            "firstName": "Alex",
            "lastName": "Buyer",
            "email": "test@example.com",
            "password": "Secure!DemoPass2026",
        }
        url = "/djangoapp/register"
        self.assertEqual(client.post(url, payload, "application/json").status_code, 403)
        response = client.post(
            url,
            payload,
            "application/json",
            HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["authenticated"])
        self.assertEqual(
            client.get("/djangoapp/session").json()["userName"], "testbuyer"
        )
        response = client.post(
            "/djangoapp/logout",
            {},
            "application/json",
            HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(client.get("/djangoapp/session").json()["authenticated"])

    def test_invalid_login_and_anonymous_submission(self):
        result = self.client.post(
            "/djangoapp/login",
            {"userName": "nobody", "password": "wrong"},
            "application/json",
        )
        self.assertEqual(result.status_code, 401)
        self.assertFalse(result.json()["authenticated"])
        self.assertEqual(self.client.post("/djangoapp/add_review").status_code, 401)

    def test_registration_rejects_weak_password(self):
        result = self.client.post(
            "/djangoapp/register",
            {
                "userName": "testbuyer",
                "email": "test@example.com",
                "password": "12345678",
            },
            "application/json",
        )
        self.assertEqual(result.status_code, 400)
        self.assertFalse(get_user_model().objects.filter(username="testbuyer").exists())


class DealershipAPITests(TestCase):
    @patch("djangoapp.restapis.requests.request")
    def test_dealers_state_and_details(self, upstream):
        upstream.return_value.status_code = 200
        upstream.return_value.json.side_effect = [
            [{"id": 7, "state": "Kansas"}],
            [{"id": 7, "state": "Kansas"}],
            {"id": 7, "state": "Kansas"},
        ]
        self.assertEqual(
            self.client.get("/djangoapp/dealers").json()["dealers"][0]["id"], 7
        )
        state = self.client.get("/djangoapp/dealers/Kansas")
        self.assertEqual(state.json()["dealers"][0]["state"], "Kansas")
        detail = self.client.get("/djangoapp/dealer/7")
        self.assertEqual(detail.json()["dealer"]["id"], 7)
        self.assertTrue(
            upstream.call_args_list[1].args[1].endswith("/fetchDealers/Kansas")
        )

    @patch("djangoapp.restapis.requests.request")
    def test_sentiment_uses_encoded_review_text(self, upstream):
        upstream.return_value.status_code = 200
        upstream.return_value.json.return_value = {"sentiment": "positive"}
        response = self.client.get("/djangoapp/analyze_review/Fantastic%20services")
        self.assertEqual(response.json(), {"status": 200, "sentiment": "positive"})
        self.assertTrue(
            upstream.call_args.args[1].endswith("/analyze/Fantastic%20services")
        )

    @patch("djangoapp.restapis.requests.request")
    def test_accepts_review_from_signed_in_user_and_sets_name(self, upstream):
        user = get_user_model().objects.create_user(
            username="testbuyer",
            first_name="Alex",
            last_name="Buyer",
            password="goodPass!",
        )
        self.client.force_login(user)
        upstream.return_value.status_code = 201
        upstream.return_value.json.return_value = {"id": 61}
        response = self.client.post(
            "/djangoapp/add_review",
            json.dumps(
                {
                    "dealership": 7,
                    "review": "Fantastic services",
                    "name": "Spoofed name",
                    "purchase": False,
                }
            ),
            "application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(upstream.call_args.kwargs["json"]["name"], "Alex Buyer")

    def test_car_records_provide_makes_and_models_and_seed_can_repeat(self):
        call_command("seed_cars", verbosity=0)
        first = self.client.get("/djangoapp/get_cars").json()
        call_command("seed_cars", verbosity=0)
        second = self.client.get("/djangoapp/get_cars").json()
        self.assertEqual(first, second)
        self.assertTrue(any(make["name"] == "Nissan" for make in first["CarMakes"]))
        self.assertTrue(
            any(
                car["CarMake"] == "Nissan" and car["CarModel"] == "Pathfinder"
                for car in first["CarModels"]
            )
        )
