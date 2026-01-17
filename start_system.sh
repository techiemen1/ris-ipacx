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
pm2 start server.js --name "ris-backend" --watch
cd ..

# Start Frontend (Development mode)
# For prod, you'd verify build, but assuming dev flow for now
echo "🔹 Starting Frontend..."
cd risfrontend
# Usually frontend runs in foreground in terminal, or we can background it.
# Let's just output instruction for frontend or run it in background logging to file
nohup npm start > ../frontend.log 2>&1 &
echo "✅ Frontend running in background (log: frontend.log)"

echo "🌟 System Started! Access at http://localhost:3000"
echo "   Use 'pm2 log' to see backend logs."
