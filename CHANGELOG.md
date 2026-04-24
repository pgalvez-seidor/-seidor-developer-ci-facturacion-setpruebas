# 📜 Historial de Evolución: AutoBotIA

Este documento registra las habilidades y mejoras adquiridas por AutoBotIA en su camino a ser la herramienta definitiva de automatización para Seidor.

---

## 🚀 v2.0.0 - "The Synchronization Era" (Hoy)
*Nivel de Estabilidad: Enterprise*

### 🛠️ Git & Persistencia Definitiva
- **Detección Inteligente de Proyecto**: Se implementó una lógica de 4 capas para encontrar el repositorio `.git` incluso dentro de aplicaciones empaquetadas en macOS.
- **Hot-Reload de Ruta**: Ahora puedes cambiar la carpeta del proyecto desde la UI y el servidor se actualiza **al instante** sin necesidad de reiniciar la App.
- **Selector de Carpeta Nativo**: Añadido botón "📁 Buscar..." que abre el diálogo oficial de macOS para seleccionar tu repo de forma segura y sin errores de escritura.

### 🔐 Seguridad & Conectividad
- **Soporte de GitHub Tokens**: Integración completa con Personal Access Tokens (PAT) para sincronizar repositorios privados de Seidor/Medifarma de forma automática y segura.
- **Guía de Configuración Integrada**: Instrucciones paso a paso dentro de la App para que cualquier tester sepa cómo obtener su token en 30 segundos.

### 🔔 Experiencia de Usuario (UX)
- **Notificaciones Nativas macOS**: La App ahora te avisa con un globo de notificación cuando un compañero de equipo sube nuevos escenarios a Git.
- **Banner de Estado Git**: Un aviso amigable en el sidebar te guía si la App detecta que el repositorio no ha sido vinculado aún.
- **Manejo de Errores Silencioso**: Se eliminaron los pantallazos rojos de error cuando no hay internet o Git no está listo, reemplazándolos por estados de espera elegantes.

---

## 🌟 v1.5.0 - "Visual Refinement"
- **Rediseño de Sidebar**: Estética moderna con efectos de cristal (glassmorphism) y jerarquía visual clara para proyectos (Medifarma / Clínica Internacional).
- **Dashboard de Escenarios**: Lista de flujos grabados con estados de sincronización en tiempo real.

---

## 🐣 v1.0.0 - "The Birth"
- **Core de Grabación**: Integración con Playwright Codegen para capturar flujos de usuario en SAP Fiori.
- **IA Vision**: Motor básico para analizar pasos de prueba mediante Gemini AI.
