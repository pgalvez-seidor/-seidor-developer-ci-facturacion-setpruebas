---
description: Facturacion Boleta con Efectivo sin vuelto
---

# Escenario: Facturación Boleta con Efectivo sin vuelto

Este flujo automatiza el proceso de cobro en efectivo y emisión de boleta en el portal seleccionado.

## Instrucciones

1. **Navegación y Login:**
   - Ir a la URL del ambiente seleccionado (ver `config/environments.json`).
   - **CRITICAL:** Limpiar campos de usuario y clave (Ctrl+A + Delete) antes de escribir.
   - Usar las credenciales del ambiente.
   - Clic en "Log On".

2. **Apertura de App:**
   - Localizar el tile **"Facturación"** y entrar.

3. **Búsqueda de Pre-factura:**
   - Si la lista en la izquierda está vacía ("Sin documentos"), hacer clic en el botón de **Refresh** del footer (ícono de flecha circular).
   - **Error Handling:** Si después del refresh sigue vacía, detenerse y reportar: "No hay pre-factura para realizar la prueba. Emite una pre-factura primero".

4. **Selección y Cobro:**
   - Clic en la primera pre-factura de la lista.
   - Clic en el botón **"Efectivo"** (parte superior derecha).
   - En el modal de Efectivo, confirmar el monto total.
   - Clic en **"Pagar"** o **"Agregar"**.

5. **Manejo de Alertas:**
   - **IMPORTANTE:** Si aparece la alerta *"Se excedió el monto límite, trasladar a bóveda"*, ignorar el mensaje y simplemente hacer clic en **"OK"** o **"Aceptar"** para continuar.

6. **Emisión de Comprobante:**
   - Clic en el botón verde **"Generar"** (footer derecho).
   - En el modal "Imprimir comprobante", seleccionar la pestaña **"Boleta"**.
   - Clic en **"Imprimir"**.
   - Si aparece el popover de confirmación *"¿Seguro que desea imprimir?"*, hacer clic en **"SÍ"**.

7. **Finalización:**
   - Capturar pantalla de la Boleta emitida con estado "Pagado".
   - Finalizar la prueba.
