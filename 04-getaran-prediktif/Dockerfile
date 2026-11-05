# Satu image untuk api (FastAPI + Strawberry) dan simulator (DuckDB menulis Parquet).
FROM python:3.13-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY db ./db
COPY api ./api
COPY simulator ./simulator
COPY web ./web
RUN useradd --uid 10001 --no-create-home app && mkdir /data && chown app /data
USER app
EXPOSE 8000
CMD ["uvicorn", "app:app", "--app-dir", "api", "--host", "0.0.0.0", "--port", "8000"]
