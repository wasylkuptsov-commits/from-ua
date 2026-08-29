@echo off
title Serwer Scrapowania Porównywarki Cen Zakupowych
echo Uruchamianie lokalnego serwera pobierania cen...
echo Upewnij sie, ze telefon jest w tej samej sieci Wi-Fi.
echo Serwer bedzie dostepny pod adresem http://localhost:8080 lub adresem IP komputera.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scraper_server.ps1"
pause
