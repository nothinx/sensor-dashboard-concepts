# Satu image untuk API, host change feed, dan simulator (beda perintah di compose).
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY common/ ./common/
COPY db/ ./db/
COPY api/ ./api/
COPY fungsi/ ./fungsi/
COPY simulator/ ./simulator/
COPY uji.py .
RUN useradd --uid 10001 app
USER app
