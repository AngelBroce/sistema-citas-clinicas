# MedPulse - Script de inicio rápido en PowerShell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  🏥 MedPulse - Iniciando Backend y Frontend" -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Cyan

# Comprobar Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Node.js no está instalado o no está en el PATH." -ForegroundColor Red
    exit 1
}

# Ejecutar el orquestador principal
node "$PSScriptRoot/start-dev.mjs"
