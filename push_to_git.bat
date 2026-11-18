@echo off
echo ===================================================
echo   Pushing Visit Studio Updates to GitHub Repository
echo ===================================================

cd /d "%~dp0"

echo [1/3] Adding all files to Git...
git add -A

echo [2/3] Committing changes...
git commit -m "Production release: WhatsApp Pass, EC2 automated deployment, MySQL setup, Logo upload & Mobile fixes"

echo [3/3] Pushing to origin main...
git push origin main

echo.
echo ===================================================
echo   Successfully pushed to GitHub!
echo ===================================================
pause
