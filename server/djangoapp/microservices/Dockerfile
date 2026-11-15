FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --uid 10001 --no-create-home app
COPY app.py test_app.py ./
COPY sentiment/vader_lexicon.zip sentiment/vader_lexicon.zip
USER 10001
EXPOSE 5050
CMD ["gunicorn", "--bind", "0.0.0.0:5050", "--no-control-socket", "app:app"]
