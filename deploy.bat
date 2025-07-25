@echo off
echo Starting deployment process...

echo Adding all modified files to git...
git add .

echo Committing changes...
git commit -m "Fix text overlap with clear button by adjusting padding and positioning"

echo Pushing to GitHub...
git push origin main

echo Deployment completed!
pause 