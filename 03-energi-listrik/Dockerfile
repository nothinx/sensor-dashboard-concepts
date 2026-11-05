# Satu image untuk api dan simulator: Python pustaka standar, tanpa dependensi pihak ketiga.
FROM python:3.13-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY db ./db
COPY api ./api
COPY simulator ./simulator
COPY web ./web
RUN useradd --uid 10001 --no-create-home app && mkdir /data && chown app /data
USER app
EXPOSE 8000
CMD ["python", "api/server.py"]
