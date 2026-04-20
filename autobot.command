#!/bin/bash
# AutoBot — doble clic para iniciar
# Compatible con macOS

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "----------------------------------------"
echo "         AutoBot v1.1.0"
echo "         Seidor Perú"
echo "----------------------------------------"
echo ""

# Sincronizar con el repositorio (Git Pull)
echo "🔄 Sincronizando scripts con el servidor..."
git fetch --all >/dev/null 2>&1
git pull
if [ $? -ne 0 ]; then
  echo "⚠️  No se pudo sincronizar con Git. Usando versión local..."
fi
echo ""

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
  echo "❌ Node.js no está instalado."
  echo "   Descárgalo en: https://nodejs.org"
  read -p "Presiona Enter para cerrar..."
  exit 1
fi

echo "✅ Node.js $(node -v) detectado"
echo ""

# Instalar dependencias del servidor si faltan
if [ ! -d "node_modules" ]; then
  echo "📦 Instalando dependencias del servidor (primera vez)..."
  npm install
  echo ""
fi

# Instalar dependencias del dashboard si faltan
if [ ! -d "ui/node_modules" ]; then
  echo "📦 Instalando dependencias del dashboard (primera vez)..."
  cd ui && npm install && cd ..
  echo ""
fi

# Verificar e instalar Playwright Chromium (siempre valida, solo instala si falta)
echo "🔍 Verificando Playwright Chromium..."
PLAYWRIGHT_BIN="$DIR/node_modules/.bin/playwright"
if "$PLAYWRIGHT_BIN" install chromium --dry-run 2>&1 | grep -q "chromium.*is not installed\|will be installed"; then
  echo "📥 Instalando Chromium (esto toma unos minutos la primera vez)..."
  "$PLAYWRIGHT_BIN" install chromium
else
  echo "✅ Chromium ya está instalado"
fi
echo ""

echo "🚀 Iniciando AutoBot..."
echo "   Dashboard: http://localhost:5173"
echo "   Backend:   http://localhost:3001"
echo ""
echo "   Cierra esta ventana para detener AutoBot."
echo ""

# Abrir el navegador automáticamente después de 4 segundos
(sleep 4 && open "http://localhost:5173") &

# Lanzar servidor + UI
npm start
