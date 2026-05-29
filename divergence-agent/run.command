#!/bin/bash
cd "$(dirname "$0")"
echo "=== Divergence Detector ==="
echo "Fetching live data and generating dashboard..."
python3 main.py
echo ""
echo "Done. Dashboard is open in your browser."
echo "Press any key to close this window."
read -n 1
