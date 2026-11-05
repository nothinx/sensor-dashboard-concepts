FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir paho-mqtt==2.1.0
COPY sim.py .
RUN useradd -r app
USER app
CMD ["python", "sim.py"]
