#!/usr/bin/env bash
set -e
echo "==================================================="
echo "  Pushing Visit Studio Updates to GitHub Repository"
echo "==================================================="

git add -A
git commit -m "Production release: WhatsApp Pass, EC2 automated deployment, MySQL setup, Logo upload & Mobile fixes" || true
git push origin main

echo "Successfully pushed to GitHub!"
