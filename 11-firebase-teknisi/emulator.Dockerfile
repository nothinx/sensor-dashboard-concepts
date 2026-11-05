# Firebase Emulator Suite (Firestore, Auth, Functions, Hosting, UI). Java 17 untuk emulator Firestore.
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jre-headless \
 && rm -rf /var/lib/apt/lists/*
RUN npm install -g firebase-tools@13.35.1 --no-audit --no-fund \
 && firebase setup:emulators:firestore && firebase setup:emulators:ui
WORKDIR /proyek
COPY functions/package.json functions/
RUN cd functions && npm install --omit=dev --no-audit --no-fund
