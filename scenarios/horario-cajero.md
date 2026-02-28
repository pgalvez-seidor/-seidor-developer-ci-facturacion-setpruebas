---
description: Verificación / Consulta de Horario Cajero (requiere Horario Supervisor previo)
client: CI
process: horarios
---

# Escenario: Horario Cajero — Consultar y Verificar

## Propósito

Consultar el **Horario Cajero** del usuario en un Área y Semana específica, y verificar
que el horario asignado coincide con lo esperado.

## Regla de Negocio Clave

> ⚠️ **PREREQUISITO**: El usuario debe tener un Horario Supervisor creado para el mismo
> Área + Período. Si el Horario Supervisor no existe, el botón de creación estará
> deshabilitado. Ejecutar `horario-supervisor.spec.js` primero.

## Datos Fijos (CI)

| Campo   | Valor                    | Notas                  |
| ------- | ------------------------ | ---------------------- |
| Área    | AMBULATORIA-ADMISION     | Dropdown obligatorio   |
| Período | Parametrizable (MM-YYYY) | Ej: 03-2026            |
| Semana  | Parametrizable           | Ej: "Semana 1"         |
| Usuario | `env.user` (PGALVEZ3)    | Mismo usuario de login |

## Campos de la UI (tabla HorarioCajero)

| Columna | Tipo              | Ejemplo     |
| ------- | ----------------- | ----------- |
| Item    | Número automático | 1, 2, 3, 4  |
| Usuario | Texto             | PGALVEZ3    |
| Día (N) | Rango horario     | 14:53-15:00 |
| Sábado  | Rango horario     | 00:00-00:00 |
| Domingo | Rango horario     | 00:00-00:00 |

## Alerta Conocida

> El sistema muestra **"⚠️ Alerta: El horario se encuentra en el pasado. Realice una
> selección diferente."** si se selecciona una Semana cuya fecha ya pasó. Cerrar con "OK".

## Flujo de Pasos

### Fase 1: Navegación

1. Login en el portal (o verificar sesión activa).
2. Desde el Launchpad, clic en tile **"Horario cajero"**.
3. Esperar que cargue el app (visible: nombre del usuario logueado en la cabecera).

### Fase 2: Filtrado

1. **Área** → Seleccionar "AMBULATORIA-ADMISION".
2. **Período** → Seleccionar el período configurado.
3. **Semana** → Seleccionar la semana configurada.
4. **Usuario** (opcional) → Ingresar `env.user` para filtrar solo su cajero.
5. Clic en botón 🔍 (Buscar).

### Fase 3: Manejo de Alerta de Período Pasado

1. Si aparece dialog **"Alerta: El horario se encuentra en el pasado"** → Clic "OK".
2. Continuar con la verificación.

### Fase 4: Verificación

1. Tomar screenshot `hc_lista_cajero` (tabla con los horarios del usuario).
2. Verificar que el usuario `PGALVEZ3` aparece en la tabla.

### Fase 5: Asignación de Turnos (NUEVO)

1. Para cada día especificado en la configuración `turnos`:
   - Encontrar la columna correspondiente al día (ej. "Lunes (2)").
   - En la fila del cajero (`env.user`), hacer clic en la celda intersectada.
   - Ingresar el horario (ej. "08:00-14:00").
   - Confirmar con la tecla Tab.
2. Tomar screenshot `hc_turnos_ingresados`.
3. Clic al botón **Guardar** (inferior derecha).
4. Esperar diálogo de éxito local y confirmar "OK".
5. Tomar screenshot `hc_turnos_guardados`.

## Hints Técnicos

- **Header de App**: Muestra nombre del usuario logueado y sede.
- **Tabla Editables**: Las celdas de días se convierten en input box al enfocarlas o hacer clic. Hay que iterar sobre los nombres de los días y encontrar la columna para la celda edit.
- **Alerta de pasado**: Dialog SAP estándar, botón "OK" en el footer.
