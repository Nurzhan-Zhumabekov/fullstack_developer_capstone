set -eu

if [ "${DJANGO_LOCAL:-0}" = "1" ] && [ -z "${DJANGO_SECRET_KEY:-}" ]; then
    secret_file="$(dirname "$DJANGO_DB_PATH")/secret-key"
    if [ ! -s "$secret_file" ]; then
        (umask 077; python -c 'import secrets; print(secrets.token_urlsafe(48))' > "$secret_file")
    fi
    DJANGO_SECRET_KEY="$(cat "$secret_file")"
    export DJANGO_SECRET_KEY
fi

python manage.py migrate --noinput
python manage.py seed_cars
exec "$@"
