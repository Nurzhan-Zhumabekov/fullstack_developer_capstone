import unittest

from app import app


class SentimentTests(unittest.TestCase):
    def test_course_phrase(self):
        response = app.test_client().get("/analyze/Fantastic%20services")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {"sentiment": "positive"})
