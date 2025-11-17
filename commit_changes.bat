@echo off
cd /d "c:\Users\anna\OWASP"
echo Current directory: %CD%
echo.

echo === Git Status ===
git status
echo.

echo === Adding files ===
git add .
echo.

echo === Committing changes ===
git commit -m "Add file explorer buttons for manual upload areas

- Added file explorer buttons next to Current and Baseline XML upload inputs
- Clicking buttons opens Windows Explorer to \\aut-tfs-file\OWASP Dependency-Checks
- Enhanced JavaScript with openFileServerForCurrent() and openFileServerForBaseline() functions
- Added visual highlighting (green for current, orange for baseline) with user instructions
- Improved user experience with automatic path setting and fallback instructions"
echo.

echo === Pushing to GitHub ===
git push origin main
echo.

echo === Complete ===
pause