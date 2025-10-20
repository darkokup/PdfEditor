@echo off
title PDF Editor - Frontend Server
echo Starting PDF Editor Frontend Server...
cd /d "f:\CodeTests\PdfEditor\pdf-annotation-app\frontend"
set PORT=3001
set BROWSER=none
npm start
pause