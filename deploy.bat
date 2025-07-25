@echo off
echo Starting deployment process...

echo Adding all modified files to git...
git add .

echo Committing changes...
git commit -m "Fix lodash import: use lodash.debounce instead of lodash to fix Netlify build"

echo Pushing to GitHub...
git push origin main

echo Deployment completed!
pause 