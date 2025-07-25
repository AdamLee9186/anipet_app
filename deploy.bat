@echo off
echo Starting deployment process...

echo Adding all modified files to git...
git add .

echo Committing changes...
git commit -m "Fix JSX syntax error: InputRightElement closing tag"

echo Pushing to GitHub...
git push origin main

echo Deployment completed!
pause 