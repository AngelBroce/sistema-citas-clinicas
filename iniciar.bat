@echo off
title MedPulse - Iniciando Proyecto Completo
chcp 65001 >nul
cls

echo ====================================================================
echo   🏥 MedPulse - Iniciando Backend y Frontend
echo ====================================================================
echo.
echo Verificando Node.js...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

echo Iniciando orquestador...
node start-dev.mjs
if %ERRORLEVEL% neq 0 (
    echo.
    echo [AVISO] El proceso se detuvo con codigo %ERRORLEVEL%.
    pause
)
