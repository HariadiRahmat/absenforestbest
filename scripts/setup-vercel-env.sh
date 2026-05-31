#!/usr/bin/env bash
# Push VITE_* vars from .env.local to Vercel (production + development)
# Prerequisites: vercel login && vercel link
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

trim() { printf '%s' "$1" | tr -d '\n\r'; }

while IFS='=' read -r key val; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  val=$(trim "$val")
  for scope in production development; do
    echo "→ $key ($scope)"
    vercel env add "$key" "$scope" --value "$val" --yes --force --no-sensitive --non-interactive </dev/null
  done
done < "$ENV_FILE"

echo "Selesai. Redeploy: vercel --prod --yes"
