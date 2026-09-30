@echo off
title Acceso Remoto Seguro LTP v2.0 - Cloudflare Tunnel
echo ===============================================================
echo     INICIANDO ENLACE DE ACCESO EXTERNO (OTRA RED / INTERNET)
echo ===============================================================
echo.
echo Conectando tu servidor local a la red global de Cloudflare...
echo.
"%~dp0cloudflared.exe" tunnel --url http://localhost:3000
pause
