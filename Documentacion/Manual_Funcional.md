# 📖 Guía de Usuario: AutoBot (Motor de Automatización de Seidor Perú)

Este manual te enseñará cómo usar la herramienta para automatizar pruebas de facturación y gestión de horarios en los portales de **Clínica Internacional (QAS)** usando la tecnología de **AutoBot**, diseñada para optimizar ciclos de pruebas completas en entornos SAP BTP.

---

## 🚀 Paso 1: Acceso al Tablero

1. Asegúrate de que el servidor esté corriendo (normalmente `http://localhost:5173`).
2. Notarás un diseño limpio en **Modo Claro** para facilitar la lectura.
3. En la barra lateral izquierda (**Sidebar**), selecciona tu entorno de trabajo (Git Branch) y el proyecto: **Clínica Internacional**.

---

## ⚙️ Paso 2: Selección del Proceso

Dependiendo de lo que necesites probar, elige el "Proceso Analítico":

- **Facturación**: Para emitir Comprobantes de Pago.
- **Horario Supervisor**: Para habilitar días en el calendario.
- **Horario Cajero**: Para asignar turnos a usuarios específicos.

---

## 📝 Paso 3: Configuración de escenario

En el panel central (**Configuración**), llena los datos necesarios:

### Si es Facturación:

- **Tipo de Comprobante**: Elige entre "Boleta" o "Factura".
  - > [!IMPORTANT]
  - > Si eliges **Factura**, el campo **RUC** es obligatorio. El sistema lo verificará en SUNAT automáticamente.
- **Métodos de Pago**:
  - Haz clic en **Efectivo** o **Tarjeta**. Puedes agregar varios (Pago Mixto).
  - Define el monto (si lo dejas vacío, el bot pagará el 100% de la deuda).
- **Iteraciones**: ¿Cuántas veces quieres repetir esta prueba? (Ej: 100 pruebas iguales).

---

## 🏎️ Paso 4: Añadir y Preparar el Lote

1. Una vez configurado, haz clic en el botón verde: **"＋ Añadir al Lote de Pruebas"**.
2. Verás que las pruebas aparecen en la lista de la derecha (**Lote de jecución**).
3. **Scroll infinito**: Puedes añadir cientos de pruebas; el panel tiene scroll interno para que nunca las pierdas de vista.

---

## 🌪️ Paso 5: Ejecución y Concurrencia

Antes de darle a "EJECUTAR", revisa el pie de la lista:

1. **Hilos en Paralelo (Hilos/Threads)**:
   - Usa el slider para elegir cuántas pruebas quieres que mallasen al mismo tiempo.
   - **Recomendación**: Para una Mac Mini M4, puedes probar con entre **5 y 10 hilos** para máxima estabilidad.
2. **Ejecutar Pruebas**: Haz clic en el botón morado que indica el total de casos.

---

## 🔬 Paso 6: Análisis de Resultados

Mientras las pruebas corren, verás:

- **Barra de Progreso**: El avance real de cada navegador.
- **Logs en Vivo**: Mensajes como "Navegando a Fiori", "Ingresando Pago", etc.
- **Resultados**:
  - ✅ **Éxito**: Indica el número de Pre-factura y Documento generado.
  - ❌ **Fallo**: Si es un error de SAP (ej. "No hay horario"), el sistema lo marcará como **Error de Negocio** y guardará el mensaje exacto para que lo analices.

---

## 📄 Paso 7: Reportes y Evidencias

- Cada test tiene un botón **"VER PDF"**.
- Al hacer clic, se abrirá un informe técnico con:
  - Capturas de pantalla (Screenshots) de cada paso.
  - Tiempos de duración.
  - Detalle del error (si falló).
- **Reporte Global**: Al terminar todo el lote de 100, aparecerá un botón arriba para descargar un **PDF Consolidado** con el resumen de todas las pruebas.

---

> [!TIP]
> **Modo Turbo**: El sistema está optimizado para reaccionar en milisegundos. No te asustes si el PDF se genera muy rápido; el bot ya cerró las ventanas de SAP de forma ultra-eficiente.

¿Tienes dudas? ¡Pregúntale a tu administrador del sistema! 🌪️🚀
