@echo off
echo Starting deployment process...

echo Adding all modified files to git...
git add .

echo Committing changes...
git commit -m "Fix RTL layout: move clear button to right side and adjust padding correctly"

echo Pushing to GitHub...
git push origin main

echo Deployment completed!
pause 