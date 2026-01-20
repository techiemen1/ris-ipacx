#!/bin/bash
# startup.sh - One-click start for RIS Backend & Frontend

echo "🚀 Starting RIS System..."

# Check if pm2 is installed
if ! command -v pm2 &> /dev/null
then
    echo "pm2 could not be found, installing..."
    npm install -g pm2
fi

# Start Backend
echo "🔹 Starting Backend..."
cd risbackend
pm2 delete ris-backend 2>/dev/null || true
pm2 start server.js --name "ris-backend" --watch
cd ..

# Start Frontend (Vite mode)
echo "🔹 Starting Frontend..."
cd risfrontend
# Run Vite with --host for LAN access
nohup npm start > ../frontend.log 2>&1 &
echo "✅ Frontend running in background (log: frontend.log)"

echo "🌟 System Started!"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend:  http://localhost:5000"
echo "   Use 'pm2 log' to see backend logs."
