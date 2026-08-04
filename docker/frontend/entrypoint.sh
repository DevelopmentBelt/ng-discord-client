#!/bin/sh
set -e

cd /app

if [ ! -x node_modules/.bin/ng ]; then
  npm install --legacy-peer-deps
fi

exec "$@"
