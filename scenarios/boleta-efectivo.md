---
description: Facturacion Boleta Caso 1 (API + Cobro Efectivo)
---

# Escenario: Facturación Boleta Caso 1 (Flujo Completo)

Este flujo automatiza la creación de una pre-factura vía API y su posterior cobro en el portal.

## Instrucciones Detalladas

### Fase 0: Preparación de Datos y Envío API (Postman Mode)
1. **Incremento de Correlativo:** 
   - Leer el último ID de `config/state.properties`.
   - Sumar +1 al PK.
2. **Preparación del JSON:** 
   - Tomar la plantilla `templates/pre-factura-caso-1.json`.
   - Reemplazar **TODOS** los campos `{{ID}}` (cabecera y **todos** los ítems del detalle) con el nuevo PK.
   - Reemplazar `{{USER}}` con `PGALVEZ3`.
3. **Envío al CPI:** 
   - Ejecutar POST al endpoint definido en `config/api-config.json`.
   - **Lógica de Reintento:** Si la respuesta indica que la pre-factura ya existe, incrementar el PK en +1 y reintentar hasta obtener un código de éxito (200 OK / 201 Created).
   - **Actualización de Estado:** Una vez exitoso, guardar el nuevo PK en `config/state.properties`.

### Fase 1: Navegación y Login
1. **Verificación de Sesión:** Ir a la URL del ambiente. Si la página carga directamente el Launchpad (sin pedir login), **continuar de inmediato** a la Fase 2 sin cerrar sesión.
2. **Login (si es necesario):**
   - **LIMPIEZA OBLIGATORIA:** Antes de escribir en los campos de usuario y contraseña, se debe hacer clic, seleccionar todo (Ctrl+A / Cmd+A) y borrar el texto existente. **SIEMPRE** realizar este paso para evitar errores de autocompletado.
   - Ingresar credenciales y clic en "Log On".
   - Actuar con la mayor rapidez posible (Speedrun mode).

### Fase 2: Localización y Selección en UI
1. Localizar el tile **"Facturación"** y entrar.
2. **Búsqueda por ID:** 
   - En lugar de tomar la primera, usar el campo de búsqueda (Search) de la lista de pre-facturas e ingresar el **PK generado en la Fase 0**.
   - Si no aparece de inmediato, usar el botón de **Refresh** del footer.
   - Si tras el refresh no aparece el ID específico, fallar con error: "No se encontró la pre-factura [ID] generada por API".
3. Clic en la pre-factura encontrada.

### Fase 3: Proceso de Cobro (Efectivo)
1. Clic en el botón **"Efectivo"**.
2. Confirmar monto total y clic en **"Pagar/Agregar"**.
3. **Manejo de Alertas:** Si aparece el aviso de *"Trasladar a bóveda"*, ignorar y dar clic en **"OK/Aceptar"**.

### Fase 4: Emisión de Boleta
1. Clic en el botón verde **"Generar"**.
2. Asegurar pestaña **"Boleta"** y clic en **"Imprimir"**.
3. En el popover "¿Seguro que desea imprimir?", confirmar con **"SÍ"**.

### Fase 5: Documentación y Observaciones
1. Capturar pantalla del documento con estado "Pagado".
2. **IMPORTANTE:** Dejar un comentario final detallando cualquier observación o anomalía detectada durante el trayecto (logs de consola, lentitud, alertas inesperadas).
