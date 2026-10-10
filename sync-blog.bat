@echo off
rem One-click two-way sync for ymmblog (Windows clone <-> GitHub <-> WSL clone).
rem Runs the bash core script inside WSL; the actual progress output follows.
chcp 65001 >nul
title ymmblog two-way sync
wsl.exe -d Ubuntu-24.04 -e bash -lc "/home/fishhhh/ymmblog/scripts/sync-both-sides.sh /mnt/d/blog/YumengmengPC.github.io"
echo.
pause
