# 🧠 Notas Técnicas de Automatización (M4 Speedrun)

Este repositorio utiliza un motor de automatización diseñado para máquinas de alto rendimiento. Aquí explicamos por qué es rápido y cómo manejar errores.

## 🚀 Optimizaciones de Velocidad
1. **Parallel Frame Racing**: En lugar de buscar secuencialmente en cada `iframe` de SAP, el script lanza búsquedas paralelas en todos los marcos disponibles simultáneamente. Esto reduce la latencia de detección de UI5 de segundos a milisegundos.
2. **Zero-Wait Policy**: Se han eliminado los `waitForTimeout` (esperas muertas). El script ahora intenta interactuar con los elementos en cuanto son "interactuables" en el DOM.
3. **Global Launcher**: Usamos el buscador global del Launchpad en lugar de navegar por el Menú/Tiles, lo cual es un 40% más rápido.

## 🔍 Precisión de Búsqueda
- **Filtrado por Código**: Las pruebas ahora fuerzan el filtro "Pre-factura" en el buscador. Esto evita falsos positivos por nombres de pacientes similares o encuentros duplicados.

## 🛠️ Solución de Problemas
- **Timeout en Buscador**: Si falla, usualmente es porque la sesión de SAP expiró o el Shell de Fiori cambió de ID. El script realiza un reintento automático.
- **Botón Efectivo no visible**: Suele ocurrir si la red está lenta y el detalle del documento no carga a tiempo. El script ahora hace "re-click" en el item para refrescar el panel lateral.

---
*Documento actualizado automáticamente tras optimización de motor v2.0*
