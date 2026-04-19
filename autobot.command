#!/bin/bash
# AutoBot — doble clic para iniciar
# Compatible con macOS

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "╔══════════════════════════════════════╗"
echo "║         AutoBot v1.1.0               ║"
echo "║         Seidor Perú                  ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
  echo "❌ Node.js no está instalado."
  echo "   Descárgalo en: https://nodejs.org"
  read -p "Presiona Enter para cerrar..."
  exit 1
fi

# Instalar dependencias si faltan
if [ ! -d "node_modules" ]; then
  echo "📦 Primera vez — instalando dependencias del servidor..."
  npm install
fi

if [ ! -d "ui/node_modules" ]; then
  echo "📦 Primera vez — instalando dependencias del dashboard..."
  cd ui && npm install && cd ..
fi

echo ""
echo "🚀 Iniciando AutoBot..."
echo "   Dashboard: http://localhost:5173"
echo "   Backend:   http://localhost:3001"
echo ""
echo "   Cierra esta ventana para detener AutoBot."
echo ""

# Abrir el navegador automáticamente después de 3 segundos
(sleep 3 && open "http://localhost:5173") &

# Lanzar servidor + UI
npm start
