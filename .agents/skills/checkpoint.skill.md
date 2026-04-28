# Skill: Checkpoint

Este skill se activa con la palabra clave **"checkpoint"**. Su objetivo es blindar el progreso actual y asegurar la memoria técnica del proyecto.

## Flujo de Ejecución:

### 1. Documentación de Memoria
Actualizar o crear `/DOCS/MEMORIA.md` con:
- **Estado Actual**: Rama, hitos completados y archivos modificados.
- **Lecciones Aprendidas**: Errores corregidos (ej: conflictos de git, falta de endpoints, dependencias de Electron).
- **Pendientes**: Próximos pasos inmediatos.

### 2. Sincronización de Código (Git)
- `git add .` (Incluyendo archivos nuevos).
- `git commit -m "checkpoint: [Breve descripción de lo avanzado]"`
- `git push origin [rama-actual]` (Si el token está configurado).

### 3. Verificación de Integridad
- Comprobar que no haya pantallas rojas en el navegador.
- Verificar que el backend (`ui-server.js`) esté respondiendo.

---
*Activación: Diga "checkpoint" para ejecutar este flujo.*
