---
description: Integrar un nuevo caso, flujo o cliente al set de pruebas
---

# Flujo de Trabajo: Creación de Nuevos Casos de Prueba (SetPruebas)

Este documento instruye a cualquier futura IA sobre cómo abordar la creación de nuevos escenarios automatizados de prueba sobre esta plataforma.

## 1. Reglas de Negocio (El "Qué")

Antes de programar, debes entender **perfectamente** la regla de negocio que estás intentando automatizar.

- Pide al usuario que te cuente la historia en lenguaje natural (ej: "Un paciente paga una boleta de 100 con 50 en efectivo y 50 en tarjeta...").
- **IMPORTANTE**: Solicita las URLs de prueba, credenciales de API o usuarios de Fiori si no las tienes en contexto. **NO inventes datos de acceso ni intentes adivinar endpoints privados**. Si no tienes acceso, deten el proceso y pide las credenciales necesarias.

## 2. Fase de Exploración Inteligente (El "Cómo")

Eres una IA con capacidades de navegación (`browser_subagent`).

- Antes de escribir `Playwright` o código Node.js, debes **abrir el navegador de manera oculta/interactiva** y tratar de ejecutar el flujo por ti misma.
- Observa qué selectores cambian, qué APIs se llaman y documenta internamente las esperas (`waitFor`).
- Informa al usuario: "He navegado por el flujo manualmente y entiendo los pasos. ¿Te presento una propuesta de script?". Solo procede al código tras la aprobación del humano.

## 3. Configuración en Base de Datos (SQLite)

La aplicación usa SQLite (`config/database.sqlite`) para persistir la jerarquía: **Cliente -> Proceso -> Escenario**.

- Cuando logres automatizar el caso o diseñes los parámetros, debes ir a la Interfaz Gráfica (`http://localhost:5173`) y crear el escenario.
- En el panel izquierdo, llena los parámetros JSON.
- **CRÍTICO**: En el campo **"Instrucciones para IA / QA (Narrativa)"**, debes redactar el paso a paso humano de este test y guardar la configuración. Esto asegura que la próxima IA que lea el escenario sepa exactamente la intención funcional sin tener que descifrar el JSON.

## 4. Desarrollo de Script (Playwright / API)

- Escribe el test bajo `tests/` respetando modularización y funciones de ayuda (`api-helper.js`, `login-helper.js` si existieran).
- No corras todas las pruebas a la vez durante tu desarrollo. Apunta a la prueba individual.
- Cuando todo pase localmente, pídele al usuario que cargue el lote visual desde la UI y presionen juntos el botón de ejecución para ver los resultados en vivo.
