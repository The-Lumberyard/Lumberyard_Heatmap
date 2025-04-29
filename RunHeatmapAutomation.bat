@echo off
cd /d "C:\Users\Travis Office\Desktop\Hogman Lumber\Heber Store\Heat Map Project"

python heatmap_automation.py
if errorlevel 1 (
    echo Python not found, trying py instead...
    py heatmap_automation.py
)

pause
