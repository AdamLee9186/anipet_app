@echo off
echo Starting deployment process...

echo Adding all modified files to git...
git add .

echo Committing changes...
git commit -m "Add clear button (X) to search input when text is present"

echo Pushing to GitHub...
git push origin main

echo Deployment completed!
pause 