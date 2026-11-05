# Satu image untuk API dan simulator (beda perintah di compose).
FROM python:3.12-slim
WORKDIR /app
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY api/ ./api/
COPY simulator/ ./simulator/
RUN useradd --uid 10001 app
USER app
