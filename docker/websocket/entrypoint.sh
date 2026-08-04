#!/bin/sh
set -e

cd /var/www/html

if [ ! -d vendor ]; then
  composer install --no-interaction --prefer-dist
fi

exec "$@"
