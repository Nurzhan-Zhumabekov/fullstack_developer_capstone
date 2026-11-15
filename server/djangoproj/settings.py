import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from django.core.management.utils import get_random_secret_key
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
FRONTEND_BUILD_DIR = FRONTEND_DIR / "build"
load_dotenv(BASE_DIR / ".env")


def enabled(name, default="0"):
    return os.getenv(name, default).lower() in ("1", "true", "yes")


def comma_list(name, default=""):
    return [
        part.strip() for part in os.getenv(name, default).split(",") if part.strip()
    ]


DEBUG = enabled("DJANGO_DEBUG", "1")
DJANGO_DB_PATH = Path(os.getenv("DJANGO_DB_PATH", str(BASE_DIR / "db.sqlite3")))
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")
if not SECRET_KEY and enabled("DJANGO_LOCAL"):
    try:
        SECRET_KEY = (
            DJANGO_DB_PATH.with_name("secret-key").read_text(encoding="utf8").strip()
        )
    except FileNotFoundError:
        pass
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured(
            "Set DJANGO_SECRET_KEY when DJANGO_DEBUG is disabled."
        )
    SECRET_KEY = get_random_secret_key()

ALLOWED_HOSTS = comma_list(
    "DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,[::1],testserver"
)
CSRF_TRUSTED_ORIGINS = comma_list("DJANGO_CSRF_TRUSTED_ORIGINS")
SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = enabled("DJANGO_SECURE_COOKIES")
if enabled("DJANGO_TRUST_PROXY_SSL_HEADER"):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

DEALERS_API_URL = os.getenv(
    "DEALERS_API_URL", os.getenv("backend_url", "http://localhost:3030")
)
SENTIMENT_API_URL = os.getenv(
    "SENTIMENT_API_URL",
    os.getenv("sentiment_analyzer_url", "http://localhost:5050"),
)

INSTALLED_APPS = [
    "djangoapp.apps.DjangoappConfig",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
CSRF_FAILURE_VIEW = "djangoapp.views.json_csrf_failure"
ROOT_URLCONF = "djangoproj.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [FRONTEND_DIR / "static"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "djangoproj.wsgi.application"
ASGI_APPLICATION = "djangoproj.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(DJANGO_DB_PATH),
    },
}
DATA_UPLOAD_MAX_MEMORY_SIZE = 64 * 1024
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

STATIC_URL = "/static/"
STATIC_ROOT = Path(os.getenv("DJANGO_STATIC_ROOT", str(BASE_DIR / "staticfiles")))
STATICFILES_DIRS = [
    directory
    for directory in (FRONTEND_DIR / "static", FRONTEND_BUILD_DIR / "static")
    if directory.is_dir()
]
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}
