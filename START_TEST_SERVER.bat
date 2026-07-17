@echo off
setlocal
cd /d "%~dp0"

echo Starting Friends With Style website at http://localhost:8000
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8000"

where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8000
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8000
  goto :end
)

echo.
echo Python was not found. Open the folder in VS Code and use the Live Server extension.
pause
:end
endlocal
