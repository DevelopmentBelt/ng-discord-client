#!/bin/sh
set -e

cd /var/www/html

if [ ! -f .env ]; then
  cat > .env <<EOF
DB_HOST=${DB_HOST:-db}
DB_NAME=${DB_NAME:-nimbus}
DB_USER=${DB_USER:-nimbus}
DB_PASS=${DB_PASS:-nimbus}
DB_CHARSET=${DB_CHARSET:-utf8mb4}
EOF
fi

if [ ! -d vendor ]; then
  composer install --no-interaction --prefer-dist
fi

cp /tmp/.htaccess .htaccess

chown -R www-data:www-data /var/www/html || true

exec "$@"
