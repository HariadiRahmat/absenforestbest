#!/usr/bin/env bash
# Deploy Firestore rules + indexes to Firebase project absenforestbest
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Deploying Firestore rules to project: absenforestbest"
echo "Pastikan sudah: firebase login"
echo ""

firebase deploy --only firestore:rules,firestore:indexes --project absenforestbest

echo ""
echo "Selesai. Rules aktif dalam ~1 menit."
