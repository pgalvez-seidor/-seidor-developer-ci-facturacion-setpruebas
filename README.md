# SetPruebas CI - Motor de Pruebas Fiori

Este proyecto es una herramienta de automatización para flujos de pago complejos en SAP Fiori construida mediante una arquitectura híbrida: un Frontend en React (El Lote de Pruebas) y un Backend en Node.js que orquesta múltiples hilos de Playwright simultáneos.

---

## 🚀 Guía de Inicio y Apagado (Start / Stop)

La aplicación requiere levantar dos servicios independientes en tu terminal: **El Servidor Node (Backend)** y **El Servidor Web (Frontend)**.

### Paso 1: Instalar Dependencias (Solo la primera vez)

Abre una terminal en la carpeta principal del proyecto e instala todo:

```bash
npm install
cd ui && npm install
cd ..
npx playwright install
```

### Paso 2: Levantar el Backend (Orquestador)

En la raíz del proyecto, ejecuta el servidor Node. Este servidor recibirá las órdenes de la interfaz web y lanzará los navegadores automatizados:

```bash
node scripts/ui-server.js
```

_(Debe aparecer el mensaje: `✅ UI Backend API Server running at http://localhost:3001`)_

### Paso 3: Levantar el Frontend (Interfaz Web)

Abre **una nueva pestaña/ventana de terminal**, navega a la carpeta `ui` y lanza la interfaz gráfica:

```bash
cd ui
npm run dev
```

_(La terminal te indicará una URL local, generalmente `http://localhost:5173`. Ábrela en tu navegador Chrome/Safari)._

---

### Paso 4: Apagar la Aplicación Correctamente (Shutdown)

Para detener la herramienta y liberar la memoria de tu computadora, debes ir a **ambas terminales** y presionar:
`Ctrl + C` (En Mac o Windows)

1. En la terminal del Frontend (`npm run dev`), presiona `Ctrl + C`.
2. En la terminal del Backend (`node scripts/ui-server.js`), presiona `Ctrl + C`. **Es muy importante detener este proceso para asegurar que los navegadores fantasma (Headless) de Playwright se destruyan y no consuman RAM en segundo plano.**

---

## 🛠 Arquitectura del Proyecto

- `/ui/`: Contiene la aplicación React (Vite) que sirve como "Shopping Cart" / Constructor Dinámico de Lotes.
- `/scripts/ui-server.js`: El corazón del proyecto. Recibe el Array JSON desde React, reserva las prefacturas usando `api-helper.js` y lanza los `workers` de Playwright. Emite logs en tiempo real vía Server Sent Events (SSE).
- `/scripts/casoX-boleta.spec.js`: Los scripts de Playwright que navegan por el DOM de Fiori. Leen la variable de entorno `TEST_PARAMS` inyectada por el servidor Node.
- `/evidence/`: Directorio donde de guardan los Screenshots y los Reportes PDF finales.

## 🤖 Integración de Nuevos Clientes (Flujo IA)

Consultar el archivo `.agents/workflows/nuevo-cliente.md` para entender el protocolo estricto _"Exploration First"_ que las Inteligencias Artificiales deben seguir antes de programar automatizaciones en este repositorio.
