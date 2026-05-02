@echo off
chcp 65001 >nul
PowerShell -NoProfile -ExecutionPolicy Bypass -Command "& '.\release.ps1'"
pause