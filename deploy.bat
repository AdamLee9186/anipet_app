@echo off
echo Starting deployment process...

echo Adding all modified files to git...
git add .

echo Committing changes...
git commit -m "Fix auto-selection: only auto-select products from external links, not from regular search"

echo Pushing to GitHub...
git push origin main

echo Deployment completed!
pause 