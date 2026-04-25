<div align="center">

<br/>

<img src="ui/public/logo-pure.png" width="88" alt="AutoBotIA logo" />

<br/>

# AutoBot**IA**

### Orquestador de pruebas automatizadas · Seidor AI Vision

[![Versión](https://img.shields.io/badge/versión-2.1.0-6366f1?style=flat-square&labelColor=f1f5f9)](./CHANGELOG.md)
[![Plataforma](https://img.shields.io/badge/plataforma-macOS-000000?style=flat-square&logo=apple&logoColor=white)](https://www.apple.com/macos)
[![Hecho con](https://img.shields.io/badge/hecho%20con-Electron%20+%20React-61dafb?style=flat-square&labelColor=20232a)](https://www.electronjs.org)
[![Autor](https://img.shields.io/badge/autor-Pierre%20Gálvez-10b981?style=flat-square&labelColor=f1f5f9)](https://seidor.com)

<br/>

> *Una herramienta pensada para que puedas enfocarte en probar,*
> *no en configurar. El sistema hace el trabajo pesado por ti.*

<br/>

</div>

---

## ✨ ¿Qué es AutoBotIA?

AutoBotIA es tu asistente de pruebas automatizadas. La abres, eliges la rama de trabajo, y el sistema se conecta solo al repositorio, descarga lo último y te deja lista para ejecutar escenarios de prueba sobre SAP BTP — sin tocar una línea de código.

**Lo que hace por ti automáticamente:**

- 🔗 Se conecta al repositorio git al arrancar
- ⬇️ Descarga los últimos cambios en segundo plano
- 🌿 Te avisa si llegaron escenarios nuevos
- 🧹 Limpia las ramas borradas del selector
- 🤖 Ejecuta tus pruebas con Playwright con un clic

---

## 🗂 Estructura del proyecto

```
AutoBotIA/
├── 📱 main.js              → Corazón de la app Electron
├── 🔌 preload.js           → Puente entre la interfaz y el sistema
├── 🧠 scripts/
│   ├── ui-server.js        → Servidor backend (Express)
│   ├── *.spec.js           → Tus escenarios de prueba (Playwright)
│   └── api-helper.js       → Helpers para la API SAP
├── 🎨 ui/
│   ├── src/App.jsx         → Interfaz React completa
│   └── src/index-*.css     → Estilos del dashboard
├── 📦 dist/                → Aquí vive el instalador .dmg generado
└── 🔒 .env                 → Credenciales (nunca va al repo)
```

---

## 🚀 Para usuarias nuevas — Instalar el app

> **Esto es lo único que necesitas hacer.** No hay código, no hay terminal. Pídele el archivo `.dmg` a tu equipo y sigue estos pasos.

<br/>

**Paso 1 — Abre el instalador**

Haz doble clic sobre el archivo `AutoBotIA-2.1.0-arm64.dmg` que te enviaron.

<br/>

**Paso 2 — Arrastra el ícono**

Verás una ventana así. Arrastra el ícono de AutoBotIA hacia la carpeta Aplicaciones.

```
┌─────────────────────────────────────┐
│                                     │
│    ⚙️  AutoBotIA   →→→   📁 Apps    │
│                                     │
└─────────────────────────────────────┘
```

<br/>

**Paso 3 — Ábrelo**

Ve a tu carpeta Aplicaciones y haz doble clic en AutoBotIA.

> 💡 **Si macOS dice "no se puede abrir porque es de un desarrollador no identificado":**
> Haz clic derecho sobre el ícono → **Abrir** → **Abrir** de nuevo en el diálogo que aparece. Solo necesitas hacerlo la primera vez.

<br/>

**Paso 4 — Conecta tu repositorio**

La primera vez que abres el app, verás una pantalla con las opciones de rama. Si aparece "Sin repositorio", haz clic en **"Seleccionar carpeta del proyecto"** y navega hasta la carpeta del repo que clonaste.

```
📁 Seleccionar carpeta del proyecto
   ↓
   Navega hasta tu carpeta del repo → "Usar esta carpeta"
   ↓
   ✅ El app detecta el git y lista las ramas
```

<br/>

**Paso 5 — Elige tu rama y entra**

Haz clic sobre la rama con la que quieres trabajar y luego en **"Continuar"**. ¡Listo! Estás dentro.

---

## 🛠 Para el equipo técnico — Generar un nuevo instalador

> Sigue estos pasos cada vez que haya cambios en el código y necesites distribuir una versión nueva.

<br/>

### Requisitos previos (solo la primera vez)

| Herramienta | Cómo instalarla |
|---|---|
| **Node.js LTS** | Descarga en [nodejs.org](https://nodejs.org) → botón verde → instala con siguiente, siguiente, finalizar |
| **Git** | Descarga en [git-scm.com/download/mac](https://git-scm.com/download/mac) → instala igual |

<br/>

### Genera el `.dmg` paso a paso

**1. Abre la Terminal**

`Cmd ⌘ + Espacio` → escribe `Terminal` → Enter.

<br/>

**2. Ve a la carpeta del proyecto**

Escribe `cd ` (con un espacio al final) y arrastra la carpeta del proyecto directo a la Terminal. Presiona Enter.

```bash
cd /ruta/a/tu/proyecto
```

<br/>

**3. Instala las dependencias** *(solo si es la primera vez o si alguien las actualizó)*

```bash
npm install
npm install --prefix ui
```

Espera a que termine. Puede tardar 1-2 minutos — es normal ver texto corriendo.

<br/>

**4. Genera el instalador** *(el comando importante)*

```bash
npm run build --prefix ui && CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder
```

Tarda entre 2 y 5 minutos. Cuando termine, verás algo así al final:

```
• building   target=DMG file=dist/AutoBotIA-2.1.0-arm64.dmg
• building block map
```

<br/>

**5. Encuentra tu archivo**

Abre Finder → carpeta del proyecto → carpeta `dist/` → ahí está tu instalador:

```
📁 dist/
   └── AutoBotIA-2.1.0-arm64.dmg  ← Este es el que distribuyes
```

<br/>

**6. Distribúyelo**

Compártelo por Slack, Drive, o como prefieras. El receptor solo necesita seguir los pasos de "Instalar el app" de arriba.

---

## ⚠️ Solución de problemas comunes

| Lo que ves | Qué hacer |
|---|---|
| `command not found: npm` | Instala Node.js (ver requisitos previos) y cierra/abre la Terminal |
| El build se queda varios minutos sin responder | Espera — Playwright y sqlite3 tardan en compilar la primera vez |
| El `.dmg` pesa menos de 50 MB | Algo falló — repite el paso 4 |
| macOS bloquea el app al abrirlo | Clic derecho → Abrir → Abrir |
| "Sin repositorio" al abrir el app | Usa el botón "Seleccionar carpeta" y apunta al repo clonado |
| `npx: command not found` al ejecutar pruebas | Asegúrate de tener Node.js instalado en el Mac donde corre el DMG |

---

## 🌿 Flujo de trabajo diario (referencia rápida)

```
Abrir AutoBotIA
      ↓
Selector de rama → elige tu rama → Continuar
      ↓ (el sistema hace pull automático)
Dashboard cargado
      ↓
Escoge un escenario → configura → Ejecutar
      ↓
Ve los resultados en tiempo real
      ↓
Botón ⏻ para cerrar todo limpiamente
```

---

## 🔐 Configuración de credenciales

El archivo `.env` en la raíz del proyecto contiene las credenciales del sistema. **Nunca se sube al repositorio.** Si eres nueva en el equipo, pídele a Pierre una copia de ese archivo.

```env
GEMINI_API_KEY=tu_clave_aqui
GIT_TOKEN=tu_token_de_github
```

El **Git Token** también se puede configurar desde dentro del app en **⚙️ Configuración**, sin necesidad de editar archivos.

---

## 📋 Historial de versiones

Consulta el archivo [`CHANGELOG.md`](./CHANGELOG.md) para ver todas las mejoras por versión.

---

<div align="center">

<br/>

Hecho con 💜 por **Pierre Gálvez** · Seidor Perú · 2026

*Si algo no funciona, no lo dudes — pregunta. Estamos para ayudarte.* 🤝

<br/>

</div>
