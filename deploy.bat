@echo off
echo Starting deployment process...

echo Adding all modified files to git...
git add .

echo Committing changes...
git commit -m "Reduce padding before text to fix excessive spacing in search input"

echo Pushing to GitHub...
git push origin main

echo Deployment completed!
pause 