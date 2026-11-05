# Satu image PHP untuk api, simulator, dan penerima webhook tiruan. Build context: folder proyek.
FROM composer:2 AS vendor
WORKDIR /app
COPY api/composer.json ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

FROM php:8.3-cli-alpine
RUN docker-php-ext-install pdo_mysql
WORKDIR /app
COPY --from=vendor /app/vendor ./vendor
COPY api/ ./api/
COPY simulator/ ./simulator/
COPY penerima/ ./penerima/
# ponytail: server bawaan PHP satu proses; ganti php-fpm + nginx bila beban produksi
CMD ["php", "-S", "0.0.0.0:8080", "-t", "api/public", "api/public/index.php"]
