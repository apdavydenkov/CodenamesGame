#!/usr/bin/env bash
# Заливка собранного dist в Yandex Object Storage. Бакет называется как домен,
# HTTPS-сертификат висит на самом бакете, CDN не используется.
set -e

YC=${YC:-/opt/yc/bin/yc}
BUCKET=code-names.ru
cd "$(dirname "$0")/../dist"

$YC storage s3 cp --recursive . "s3://$BUCKET/"

# При заливке content-type у текстовых файлов теряется — проставляем заново
fix() {
  find . -name "*.$1" | sed 's|^\./||' | while read -r key; do
    $YC storage s3api copy-object --bucket "$BUCKET" --key "$key" \
      --copy-source "$BUCKET/$key" --metadata-directive REPLACE \
      --content-type "$2" >/dev/null
  done
}
fix html "text/html; charset=utf-8"
fix css "text/css"
fix js "text/javascript"
fix json "application/json"
fix svg "image/svg+xml"

echo "готово: https://$BUCKET/"
