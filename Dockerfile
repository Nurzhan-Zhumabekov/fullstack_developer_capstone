FROM node:22-bookworm-slim AS frontend
WORKDIR /frontend
COPY server/frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY server/frontend/public/ ./public/
COPY server/frontend/src/ ./src/
RUN CI=true npm run build

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DJANGO_DB_PATH=/data/db.sqlite3
WORKDIR /app
COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --uid 10001 --no-create-home app \
    && install -d -o app -g app /data /app/staticfiles
COPY server/manage.py server/entrypoint.sh ./
COPY server/djangoapp/ ./djangoapp/
COPY server/djangoproj/ ./djangoproj/
COPY server/database/data/car_records.json ./database/data/car_records.json
COPY server/frontend/static/ ./frontend/static/
COPY --from=frontend /frontend/build/ ./frontend/build/
USER 10001
RUN DJANGO_DEBUG=1 python manage.py collectstatic --noinput
EXPOSE 8000
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--threads", "4", "--no-control-socket", "djangoproj.wsgi:application"]
