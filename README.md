# Set de Pruebas - Facturación Clínica Internacional

Este repositorio contiene los escenarios de prueba automatizada para el portal de Facturación.

## Estructura
- `/config/`: Configuración de ambientes (URLs y Credenciales).
- `/scenarios/`: Instrucciones detalladas de cada caso de prueba.
- `/evidence/`: (Opcional) Carpeta para guardar capturas de pantalla de las ejecuciones.

## Escenarios Disponibles
1. [Facturación Boleta Caso 1 (API + Cobro Efectivo)](scenarios/boleta-efectivo.md)

## Cómo funciona el Flujo End-to-End
1. **Fase API:** Antigravity toma la plantilla `/templates/pre-factura-caso-X.json`, incrementa el ID correlativo, cambia el `CO_USUA_TRAN` y lo envía al endpoint de CPI.
2. **Fase UI:** Con el ID confirmado por la API, Antigravity abre el navegador, busca ese ID específico y completa el flujo de cobro.
