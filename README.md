# SetPruebas CI - Motor de Pruebas Fiori

Este proyecto es una herramienta de automatización para flujos de pago complejos en SAP Fiori construida mediante una arquitectura híbrida: un Frontend en React (El Lote de Pruebas) y un Backend en Node.js que orquesta múltiples hilos de Playwright simultáneos.

---

## 🚀 Guía de Inicio Rápido (Start / Stop)

Gracias al orquestador global, la aplicación Frontend y Backend se levantan con un solo comando mágico.

### Paso 1: Instalar Dependencias (Solo la primera vez)

Abre una terminal en la carpeta principal del proyecto e instala todo:

```bash
npm install
cd ui && npm install
cd ..
npx playwright install
```

### Paso 2: Levantar Todo (Magic Command)

En la raíz del proyecto, ejecuta el siguiente comando. Esto lanzará simultáneamente el servidor Node y la Interfaz Web:

```bash
npm start
```

_(Se abrirá tu navegador automáticamente en `http://localhost:5173`. Verás logs de ambos servicios en la misma terminal)._

---

### Paso 3: Apagar la Aplicación Correctamente (Shutdown)

Para detener la herramienta y liberar la memoria de tu computadora:

1. Ve a la terminal donde ejecutaste `npm start`.
2. Presiona `Ctrl + C` (En Mac o Windows).
3. Confirma con `Y` si la terminal te pregunta "Terminate batch job?".

**Es muy importante hacer esto para asegurar que los navegadores fantasma (Headless) de Playwright se destruyan y no consuman RAM en segundo plano.**

---

## 🛠 Arquitectura del Proyecto

- `/ui/`: Contiene la aplicación React (Vite) que sirve como "Shopping Cart" / Constructor Dinámico de Lotes.
- `/scripts/ui-server.js`: El corazón del proyecto. Recibe el Array JSON desde React, reserva las prefacturas usando `api-helper.js` y lanza los `workers` de Playwright. Emite logs en tiempo real vía Server Sent Events (SSE).
- `/scripts/casoX-boleta.spec.js`: Los scripts de Playwright que navegan por el DOM de Fiori. Leen la variable de entorno `TEST_PARAMS` inyectada por el servidor Node.
- `/evidence/`: Directorio donde de guardan los Screenshots y los Reportes PDF finales.

## 🤖 Integración de Nuevos Clientes (Flujo IA)

Consultar el archivo `.agents/workflows/nuevo-cliente.md` para entender el protocolo estricto _"Exploration First"_ que las Inteligencias Artificiales deben seguir antes de programar automatizaciones en este repositorio.
