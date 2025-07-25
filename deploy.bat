@echo off
echo Starting deployment process...

echo Adding all modified files to git...
git add .

echo Committing changes...
git commit -m "Swap search and clear button positions for proper RTL layout"

echo Pushing to GitHub...
git push origin main

echo Deployment completed!
pause 