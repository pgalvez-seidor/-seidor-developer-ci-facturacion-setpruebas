---
description: Ejecutar pruebas automatizadas para un cliente
---

# Workflow: Ejecutar Pruebas

## Requisitos previos

- Node.js instalado
- Playwright instalado (`npx playwright install chromium`)

## Pasos

1. Lee el archivo `SYSTEM.md` para entender tu rol como asistente de QA.

2. Saluda al usuario:
   "Hola, soy tu asistente de pruebas automatizadas de Seidor. ¿Vienes a ejecutar pruebas o a integrar un nuevo cliente?"

3. Pregunta el nombre del tester.

4. Pregunta de qué cliente quiere hacer pruebas. Lista las ramas disponibles:

```bash
git branch -a
```

5. Cambia a la rama del cliente y sincroniza:
   // turbo

```bash
git checkout <RAMA> && git pull origin <RAMA>
```

6. Lee `config/test-registry.json` y presenta los escenarios disponibles al usuario en formato tabla.

7. Pregunta qué caso(s) quiere ejecutar.

8. Ejecuta el caso seleccionado:
   // turbo

```bash
node scripts/runner.js --caso <CASO_ID> --env QAS --tester <NOMBRE>
```

9. Lee el archivo `evidence/latest/result.json` para ver el resultado.

10. Si `status` es `success`:
    - Lee las capturas de pantalla referenciadas en `screenshots`
    - Genera un informe breve de éxito con los screenshots embebidos
    - Felicita al tester

11. Si `status` es `error`:
    - Lee la captura de pantalla de error
    - Lee el DOM snapshot si existe (`domSnapshot` en result.json)
    - Diagnostica la causa del error
    - Propón una solución concreta

12. Pregunta al usuario si quiere ejecutar otro caso.

13. Cuando termine, haz commit de la evidencia:

```bash
git add evidence/ && git commit -m "evidence(<CLIENTE>): <CASO> - <STATUS> - <FECHA>" && git push
```
