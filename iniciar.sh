#!/bin/bash
echo "🎓 Iniciando EduSpace..."
echo ""

# Backend
cd backend
npm install --silent
node server.js &
BACKEND_PID=$!
echo "✅ Backend iniciado (PID: $BACKEND_PID)"

sleep 2

# Frontend
cd ../frontend
npm install --silent
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend iniciado (PID: $FRONTEND_PID)"
echo ""
echo "🌐 Acesse: http://localhost:5173"
echo "📡 API:    http://localhost:3001"
echo ""
echo "Pressione Ctrl+C para encerrar"
wait
