@echo off
title NERO CMS - Auto Sync
echo ================================
echo  NERO CMS Auto Sync
echo  Branch: pakistan-team
echo  Press Ctrl+C to stop
echo ================================
echo.
powershell.exe -ExecutionPolicy Bypass -File "%~dp0auto-sync.ps1"
pause
