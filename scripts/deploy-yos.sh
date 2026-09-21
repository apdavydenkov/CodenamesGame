#!/usr/bin/env bash
# Заливка собранного dist в Yandex Object Storage. Бакет называется как домен,
# HTTPS-сертификат висит на самом бакете, CDN не используется.
# Сжимать на отдаче Object Storage без CDN не умеет, поэтому текстовые файлы
# заливаем уже сжатыми, с Content-Encoding: gzip. У сжатого содержимого тип
# определяется как gzip, поэтому для них Content-Type задаём явно; остальным
# (картинки, шрифты, иконки) Object Storage ставит тип сам по расширению.
#
# Заливаются только файлы, изменившиеся со прошлого раза: их хеши лежат в
# .deploy-state. Запуск с --all перезаливает всё, если состояние разошлось
# с бакетом.
set -e

YC=${YC:-/opt/yc/bin/yc}
BUCKET=code-names.ru
STATE="$(cd "$(dirname "$0")/.." && pwd)/.deploy-state"

declare -A TEXT_TYPES=(
  [html]="text/html; charset=utf-8"
  [css]="text/css"
  [js]="text/javascript"
  [json]="application/json"
  [xml]="application/xml"
  [svg]="image/svg+xml"
  [txt]="text/plain"
)

cd "$(dirname "$0")/../dist"

CURRENT=$(mktemp)
STAGE=$(mktemp -d)
trap 'rm -rf "$CURRENT" "$STAGE"' EXIT

find . -type f | sort | xargs sha256sum > "$CURRENT"

if [ -f "$STATE" ] && [ "$1" != "--all" ]; then
  changed=$(comm -13 <(sort "$STATE") <(sort "$CURRENT") | cut -d' ' -f3-)
else
  changed=$(cut -d' ' -f3- "$CURRENT")
fi

# Изменившиеся файлы складываем рядом: текстовые сжатыми, остальные как есть
extensions=$(IFS='|'; echo "${!TEXT_TYPES[*]}")
while read -r file; do
  [ -n "$file" ] || continue
  mkdir -p "$STAGE/$(dirname "$file")"
  if [[ $file =~ \.($extensions)$ ]]; then
    gzip -9 -c "$file" > "$STAGE/$file"
  else
    cp "$file" "$STAGE/$file"
  fi
done <<< "$changed"

for ext in "${!TEXT_TYPES[@]}"; do
  [ -n "$(find "$STAGE" -name "*.$ext" -type f -print -quit)" ] || continue
  $YC storage s3 cp --recursive "$STAGE/" "s3://$BUCKET/" \
    --exclude "*" --include "*.$ext" \
    --content-encoding gzip --content-type "${TEXT_TYPES[$ext]}" --only-show-errors
done

text_globs=$(printf '*.%s,' "${!TEXT_TYPES[@]}")
if [ -n "$(find "$STAGE" -regextype posix-extended -type f -not -regex ".*\.($extensions)$" -print -quit)" ]; then
  $YC storage s3 cp --recursive "$STAGE/" "s3://$BUCKET/" \
    --exclude "${text_globs%,}" --only-show-errors
fi

# Объекты, которых больше нет в dist: старые бандлы с прежними хешами и прочее.
# design/ живёт отдельно от сборки — это макеты и референсы, их не трогаем.
comm -13 <(cut -d' ' -f3- "$CURRENT" | sed 's|^\./||' | sort) \
         <($YC storage s3api list-objects --bucket "$BUCKET" | grep -oP '^\s+- key: \K.*' | grep -v '^design/' | sort) |
  while read -r key; do
    $YC storage s3 rm "s3://$BUCKET/$key"
  done

cp "$CURRENT" "$STATE"

echo "готово: https://$BUCKET/ (залито файлов: $(find "$STAGE" -type f | wc -l))"
