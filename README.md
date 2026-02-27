# Set de Pruebas - Facturación Clínica Internacional

Este repositorio contiene los escenarios de prueba automatizada para el portal de Facturación.

## Estructura
- `/config/`: Configuración de ambientes (URLs y Credenciales).
- `/scenarios/`: Instrucciones detalladas de cada caso de prueba.
- `/evidence/`: (Opcional) Carpeta para guardar capturas de pantalla de las ejecuciones.

## Cómo ejecutar una prueba
Para ejecutar una prueba usando Antigravity:
1. Pide: "Ejecuta el escenario **[Nombre del Escenario]** en el ambiente **[QAS/PRD]**".
2. Antigravity leerá las instrucciones y las ejecutará automáticamente de forma rápida.

## Escenarios Disponibles
1. [Facturacion Boleta con Efectivo sin vuelto](scenarios/boleta-efectivo.md)
