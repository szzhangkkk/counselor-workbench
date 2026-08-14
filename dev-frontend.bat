@echo off
chcp 65001 >nul
title 辅导员工作台 - 前端开发模式
cd /d "%~dp0frontend"
npm install
npm run dev
