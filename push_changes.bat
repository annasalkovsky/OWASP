@echo off
cd /d "C:\Users\anna\OWASP"
git add .
git commit -m "Remove dialog popups from file explorer functions - direct Windows Explorer opening"
git push origin main
pause