# 🤖 AutoBot: Especificaciones Técnicas y Funcionales

**Autor:** Pierre Gálvez Larriega  
**Cliente:** Seidor Perú  
**Versión:** 1.0.0  
**Fecha de Lanzamiento:** 01 de Marzo, 2026

---

## 🎨 Identidad Visual y Diseño

Para AutoBot, hemos implementado una estética **Premium Light Mode** alineada con la identidad corporativa de Seidor.

- **Tipografía Principal:** `Poppins` (Google Fonts). Elegida por su legibilidad excepcional, geometría moderna y alineación con los estándares de diseño de Seidor.
- **Paleta de Colores:**
  - **Azul Seidor (#004a99):** Color primario para acentos, botones de acción y branding.
  - **Slate 50 / 900:** Escala de grises moderna para fondos y texto de alto contraste.
  - **Glassmorphism:** Efectos de desenfoque (`backdrop-filter: blur`) en modales y paneles para una sensación de profundidad.

---

## 🛠️ Stack Tecnológico (The Stack)

### Frontend (Dashboard de Control)

- **React 18:** Biblioteca principal para la interfaz reactiva.
- **Vite:** Herramienta de construcción (build tool) ultra rápida para desarrollo local.
- **Vanilla CSS + CSS Variables:** Sistema de estilos personalizado para control total sin dependencias pesadas.
- **Lucide React:** Iconografía vectorial moderna.

### Backend (Motor de Ejecución)

- **Node.js + Express:** Servidor de API para coordinar las pruebas y el sistema de archivos.
- **Playwright:** El motor de automatización core. Elegido sobre Selenium por su velocidad nativa en navegadores modernos y mejor manejo de Shadow DOM (común en SAP).
- **Server-Sent Events (SSE):** Streaming de logs en tiempo real desde el terminal hacia la UI.

---

## 🌪️ Arquitectura de Automatización (Principios de Pierre)

### 1. Modo Turbo (Execution Optimization)

AutoBot no "espera por esperar". Utiliza selectores inteligentes y estados de visibilidad para reducir los `waitForTimeout` a un mínimo de **10ms**, permitiendo que la prueba avance tan rápido como el portal de SAP lo permita.

### 2. Concurrencia Dinámica (Dynamic Threading)

El sistema permite configurar el número de hilos (`MAX_CONCURRENT`) desde la UI.

- **Escalabilidad:** Diseñado para aprovechar procesadores multi-núcleo (como el Apple M4).
- **Aislamiento:** Cada instancia de navegador corre en su propio contexto, evitando colisiones de cookies o sesiones.

### 3. Limpieza Inteligente (Smart Fragment Cleanup)

Implementación de lógica para cerrar automáticamente fragments y diálogos residuales de SAP Fiori que suelen bloquear las pruebas en cadena.

---

## 📖 Funcionalidades Core (Functional Scope)

1.  **Gestión de Lotes (Batch Mode):** Permite configurar múltiples casos de prueba y lanzarlos masivamente.
2.  **Etapas de Ejecución Visuales:** AutoBot reporta en tiempo real hitos como:
    - _Emitiendo PRE-FACTURA vía API_
    - _Iniciando sesión en Portal_
    - _Buscando PRE-FACTURA emitida por API_
    - _Cobrando / Validando pago realizado_
    - _Emitiendo comprobante electrónico_
    - _Tomando captura de evidencia del comprobante_
3.  **Detección de Errores de Negocio:** El motor lee los mensajes de error de los portales (ej: "No hay horario disponible") y los reporta directamente en el Dashboard.
4.  **Persistencia de Resultados:** Cada ejecución genera logs detallados y captura de PDFs de comprobantes.

---

## 🏗️ Directorio del Proyecto

- `/ui`: Código fuente del Dashboard (React).
- `/scripts`: Scripts de automatización Playwright `.spec.js`.
- `/scenarios`: Documentación de casos de uso en Markdown.
- `/registry`: Base de datos local (JSON) de configuraciones guardadas.

---

_© 2026 Pierre Gálvez Larriega. Desarrollado para Seidor Perú._
