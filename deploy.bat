@echo off
echo Starting deployment process...

echo Adding all modified files to git...
git add .

echo Committing changes...
git commit -m "Add click-to-open autocomplete dropdown functionality"

echo Pushing to GitHub...
git push origin main

echo Deployment completed!
pause 