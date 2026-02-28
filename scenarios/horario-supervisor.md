---
description: Creación de Horario Supervisor (Prerequisito de Horario Cajero) - Flujo Diario
client: CI
process: horarios
---

# Escenario: Horario Supervisor — Asignación Diaria

## Propósito

Verificar si existe un horario supervisor para el día actual. Si no, agregarlo al detalle
de la asignación del usuario. Este es el **prerequisito obligatorio** para Horario Cajero.

## Datos Fijos (CI)

| Campo      | Valor                     | Notas                   |
| ---------- | ------------------------- | ----------------------- |
| Área       | AMBULATORIA-ADMISION      | Dropdown, siempre este  |
| Supervisor | `env.user` (ej: PGALVEZ3) | Mismo usuario del login |
| Período    | Mes actual (MM-YYYY)      | Ej: 02-2026             |
| Fechas     | Fecha actual (DD/MM/YYYY) | Fechas de Inicio y Fin  |

## Flujo de Pasos

### Fase 1: Búsqueda del Supervisor

1. Ingresar al app "Horario Supervisor".
2. En el panel izquierdo, llenar los filtros:
   - Área: "AMBULATORIA-ADMISION"
   - Período: mes y año actual
   - Supervisor: código del usuario (ej: PGALVEZ3)
3. Clic en **Buscar**.
4. Clic en el elemento de la lista (el registro del supervisor). Esto abre el detalle a la derecha.

### Fase 2: Verificación de Existencia (Fecha Actual)

1. En el panel derecho (Detalle), hacer scroll hasta la tabla "Horario".
2. Revisar la **última fila** de la tabla.
3. Si la fecha de la última fila coincide con la fecha de hoy:
   - **Terminar la prueba con éxito** mostrando alerta: "Ya existe un horario activo y ya se puede operar".
   - Tomar screenshot final y salir.

### Fase 3: Agregar Nuevo Día (Solo si no existe)

1. Clic en el botón **`+` (Agregar Detalle)** de la tabla Horario.
2. Ingresar la **Fecha Actual** en `Fecha Inicio` y `Fecha Fin` de la nueva fila.
3. Clic en el botón **Check (✔️)** de la fila para confirmar las fechas.
4. Clic en el botón **Persona (👤)** ("Habilitar el día creado") al lado del check.
5. Se abre un popup: marcar el check correspondiente a la fecha de hoy.
6. Clic en **Aceptar** o **OK** en el popup.

### Fase 4: Guardado

1. Clic en el botón **Guardar** (ícono de diskette verde, esquina inferior derecha).
2. Confirmar la grabación si aparece un cuadro de diálogo ("Sí" / "Aceptar").
3. Esperar confirmación visual de éxito.
4. Generar reporte PDF con evidencias de la operación.
