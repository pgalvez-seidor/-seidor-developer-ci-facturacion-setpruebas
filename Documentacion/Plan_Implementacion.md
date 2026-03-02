# Plan de Implementación: Interfaz Premium y Errores Detallados

## Propósito

Actualizar la interfaz del Dashboard de Pruebas a una estética Premium (AutoBot), optimizar ciclos de pruebas completas en entornos SAP BTP y mejorar la visibilidad de los errores de negocio.

## Proposed Changes

### UI & UX (Light Mode & Dynamic Concurrency)

- [ ] **Tema Light Mode**: Inversión de la paleta de colores para mejorar la legibilidad.
  - `--bg-dark`: `#f8fafc` (Slate 50)
  - `--sidebar-bg`: `rgba(255, 255, 255, 0.8)`
  - `--card-bg`: `rgba(255, 255, 255, 0.9)`
  - `--text-main`: `#0f172a` (Slate 900)
  - `--text-muted`: `#64748b` (Slate 500)
  - `--card-border`: `rgba(0, 0, 0, 0.08)`
- [ ] **Concurrencia Ajustable**: Reemplazo del checkbox por un input numérico que permita definir cuántas pruebas ejecutar en paralelo (ej. 10, 20 o más en la Mac Mini M4).
- [ ] **Scroll Inteligente**: (Ya implementado) Panel de Lote con scroll interno funcional.

### UI & UX (Credits & Change Log)

- [ ] **Modal de Créditos**: Popup sutil con los derechos de Pierre Gálvez Larriega.
- [ ] **Change Log**: Historial cronológico de funcionalidades y fixes.
- [ ] **Trigger**: Disparador sutil en el footer del Sidebar.

### UI & UX (AutoBot Rebranding - Seidor Peru)

- [ ] **Identidad Visual**: Cambio de nombre a **"AutoBot"**.
- [ ] **Paleta Seidor**:
  - Primario: `#004a99` (Azul Seidor Tecnológico)
  - Secundario: `#ffffff` (Blanco Creativo)
  - Acentos: Gradientes de azul cobalto a cian.
- [ ] **Logo Corporativo**: Reemplazo del icono actual por el isologo de Seidor en la parte superior izquierda.
- [ ] **Tipografía**: Priorizar **Poppins** para un look moderno y alineado a la marca.

### Performance & Turbo Mode (Completado)

- [x] **Modo Turbo**: Reducción de esperas estratégicas a 10ms.
- [x] **Limpieza Inteligente**: Cerramiento de fragments basado en visibilidad real.

## Verification Plan

### Automated Tests

1. Ejecutar lote de 5 pruebas concurrentes.
2. Forzar un error de negocio (ej. período inválido) y verificar que el Dashboard muestre el texto exacto del error en la fila correspondiente.
3. Verificar que el "Reporte Global" incluya todos los resultados correctamente.

### Manual Verification

1. El usuario validará visualmente si el tema Dark Mode y los efectos de glassmorphism cumplen con la expectativa "Premium".
2. Probar la apertura de PDFs nativos desde las filas de error.r que al ocurrir un error de negocio, el texto específico se muestra en la fila correspondiente de la derecha.

- **IMPORTANTE**: No realizar `git commit` ni `git push` en esta fase.
