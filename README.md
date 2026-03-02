# 🤖 AutoBot: Motor de Automatización SAP BTP

**Autor:** Pierre Gálvez Larriega  
**Desarrollado para:** Seidor Perú

AutoBot es una plataforma de automatización de alta performance diseñada para optimizar ciclos de pruebas completas en entornos SAP BTP. Utiliza una arquitectura híbrida de Frontend React y un motor multi-hilo en Node.js impulsado por Playwright.

---

## 📖 Centro de Documentación

Toda la información detallada del proyecto se encuentra centralizada en la carpeta [`/Documentacion`](./Documentacion):

1.  **[Especificaciones Técnicas](./Documentacion/Especificaciones_Tecnicas.md)**: El "Stack" (React, Node, Playwright), arquitectura de hilos y principios de diseño (Modo Turbo).
2.  **[Manual Funcional](./Documentacion/Manual_Funcional.md)**: Guía paso a paso para usuarios finales y probadores.
3.  **[Plan de Implementación](./Documentacion/Plan_Implementacion.md)**: Roadmap de las últimas mejoras y branding.
4.  **[Walkthrough Ejecución](./Documentacion/Walkthrough_Lote_100.md)**: Evidencia visual de las capacidades de la herramienta.

---

## 🚀 Guía de Inicio Rápido (Start / Stop)

### Paso 1: Instalar Dependencias

Abre una terminal en la carpeta principal del proyecto:

```bash
npm install
cd ui && npm install
cd ..
npx playwright install
```

### Paso 2: Levantar AutoBot (Magic Command)

En la raíz del proyecto, ejecuta:

```bash
npm start
```

_(Este comando limpiará automáticamente los puertos 3001 y 5173 antes de iniciar el Dashboard)_. 
Dashboard disponible en: `http://localhost:5173`

### Paso 3: Apagar Correctamente

Presiona `Ctrl + C` en la terminal para limpiar los procesos y navegadores en segundo plano.

---

## 🛠 Estructura de Directorios

- `/ui/`: Dashboard de Control (React/Vite).
- `/scripts/`: Lógica del servidor y scripts de automatización Playwright.
- `/Documentacion/`: Manuales, guías y especificaciones de Pierre Gálvez Larriega.
- `/evidence/`: Capturas de pantalla y reportes PDF generados.

---

_© 2026 Pierre Gálvez Larriega. Todos los derechos reservados._
