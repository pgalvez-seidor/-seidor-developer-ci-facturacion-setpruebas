# 🆕 Guía de Integración de Nuevos Clientes

Este documento es para cualquier IA que trabaje con este repositorio. Sigue estos pasos exactos cuando un usuario quiera integrar un nuevo cliente de pruebas.

## ¿Cuándo activar este flujo?

Activa este flujo si el usuario dice algo como:

- "Quiero agregar un nuevo cliente"
- "Tengo un cliente nuevo para pruebas"
- "Necesito configurar pruebas para X"
- "Quiero integrar a [nombre de empresa]"

## Fase 1: Recolección de Información

Haz estas preguntas **en orden**, una por una. No pases a la siguiente hasta tener la respuesta:

### Datos del Cliente

| #   | Pregunta                                         | Ejemplo                      | Archivo destino      |
| --- | ------------------------------------------------ | ---------------------------- | -------------------- |
| 1   | ¿Cuál es el **nombre corto/siglas** del cliente? | `AUNA`                       | Nombre de rama git   |
| 2   | ¿Cuál es el **nombre completo** del cliente?     | `Auna Clínicas y Hospitales` | `test-registry.json` |

### Portal de Facturación (UI)

| #   | Pregunta                                                      | Ejemplo                          | Archivo destino     |
| --- | ------------------------------------------------------------- | -------------------------------- | ------------------- |
| 3   | ¿Cuál es la **URL del portal** de facturación? (ambiente QAS) | `https://auna-qas.cpp.cfapps...` | `environments.json` |
| 4   | **Usuario** para login del portal                             | `user_pruebas`                   | `environments.json` |
| 5   | **Contraseña** para login del portal                          | `Pass123.@`                      | `environments.json` |

### API de Pre-facturas

| #   | Pregunta                                                      | Ejemplo                                 | Archivo destino   |
| --- | ------------------------------------------------------------- | --------------------------------------- | ----------------- |
| 6   | ¿Cuál es la **URL del endpoint API** para crear pre-facturas? | `https://api.auna.../emisionprefactura` | `api-config.json` |
| 7   | ¿Qué **tipo de autenticación** usa? (Basic, OAuth, API Key)   | `Basic`                                 | `api-config.json` |
| 8   | **Credenciales del API** (usuario y contraseña o key)         | `S00254...` / `TemBTP...`               | `api-config.json` |

### Estructura de Pruebas

| #   | Pregunta                                                          | Ejemplo                              | Archivo destino      |
| --- | ----------------------------------------------------------------- | ------------------------------------ | -------------------- |
| 9   | ¿Tienes un **JSON de ejemplo** de pre-factura? (pegar o subir)    | `{ "EPrefactura": {...} }`           | `templates/`         |
| 10  | ¿Qué **medios de pago** maneja el portal?                         | `Efectivo, Tarjeta, Depósito`        | `test-registry.json` |
| 11  | ¿El portal usa la **misma estructura Fiori/UI5** que CI?          | `Sí` / `No, tiene X diferente`       | `HINTS.md`           |
| 12  | ¿Hay algún **flujo especial**? (aprobaciones, validaciones extra) | `Requiere supervisión si > 5000 PEN` | `scenarios/`         |

### Preguntas opcionales (si aplica)

| #   | Pregunta                                             | Contexto                           |
| --- | ---------------------------------------------------- | ---------------------------------- |
| 13  | ¿Tienen ambientes **PRD** y **DEV** además de QAS?   | Para completar `environments.json` |
| 14  | ¿Hay un **ID inicial** de pre-factura que deba usar? | Para `state.properties`            |
| 15  | ¿Algún **header especial** que requiera el API?      | Para `api-config.json`             |

## Fase 2: Generación Automática

Una vez recopilada toda la información, ejecuta estos comandos:

### 2.1 Crear rama

```bash
git checkout main
git pull origin main
git checkout -b <SIGLAS_CLIENTE>
```

### 2.2 Generar `config/environments.json`

```json
{
  "<AMBIENTE>": {
    "url": "<URL_PORTAL>",
    "user": "<USUARIO_PORTAL>",
    "pass": "<CONTRASEÑA_PORTAL>"
  }
}
```

Agregar secciones PRD y DEV como TODO si no se proporcionaron.

### 2.3 Generar `config/api-config.json`

```json
{
  "<AMBIENTE>": {
    "url_create_prefactura": "<URL_API>",
    "auth_type": "<TIPO_AUTH>",
    "user": "<USER_API>",
    "pass": "<PASS_API>",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}
```

### 2.4 Generar `config/state.properties`

```properties
# Últimos IDs usados para pruebas
last_prefactura_id=0
```

Si el usuario proporcionó un ID inicial, usar ese valor.

### 2.5 Generar `config/test-registry.json`

```json
{
  "cliente": "<SIGLAS>",
  "nombre": "<NOMBRE_COMPLETO>",
  "casos": []
}
```

Los casos se agregan en la Fase 3 o cuando el usuario pida escenarios.

### 2.6 Guardar template de pre-factura

Guardar el JSON proporcionado en `templates/pre-factura-caso-1.json`.
Reemplazar los campos de ID con `{{ID}}` y el usuario transaccional con `{{USER}}`.

### 2.7 Copiar scripts base

Si el portal usa la misma estructura Fiori/UI5:

- Copiar `scripts/caso1-boleta.spec.js` como base
- Ajustar selectores si es necesario

Si tiene estructura diferente:

- Crear un script mínimo que solo haga login y tome screenshot
- Pedir al usuario que guíe la primera ejecución para mapear selectores

### 2.8 Commit inicial

```bash
git add .
git commit -m "feat(<SIGLAS>): setup inicial de pruebas para <NOMBRE_COMPLETO>"
git push -u origin <SIGLAS_CLIENTE>
```

## Fase 3: Validación Post-Setup

Antes de dar por terminado, ejecuta una prueba seca:

1. **Test API:** Llamar al endpoint con la plantilla → verificar respuesta exitosa
2. **Test Portal:** Abrir la URL del portal → verificar que carga y acepta login
3. **Resultado:**
   - ✅ Ambos OK → "El cliente **<NOMBRE>** está listo. Puedes ejecutar pruebas con `/run-tests`"
   - ❌ API falla → Diagnosticar (URL incorrecta, credenciales, formato JSON)
   - ❌ Portal falla → Diagnosticar (URL, credenciales, VPN requerida)

## Agregar Escenarios a un Cliente Existente

Cuando el usuario dice "quiero agregar un caso nuevo", preguntar:

1. ¿Qué **tipo de comprobante**? (Boleta, Factura, Nota de Crédito)
2. ¿Qué **medio de pago**? (Efectivo, Tarjeta, Depósito, Anticipo, Mixto)
3. ¿Alguna **condición especial**? (Con vuelto, sin vuelto, monto > límite, paciente específico)
4. ¿Necesita una **plantilla JSON diferente** o la misma del caso 1?

### Generar:

1. `scripts/caso<N>-<descripcion>.spec.js` — basado en el caso 1 o personalizado
2. `templates/pre-factura-caso-<N>.json` — si se necesita plantilla diferente
3. `scenarios/<descripcion>.md` — documentación del flujo
4. Agregar entrada en `config/test-registry.json`
5. Agregar script en `package.json`
6. Commit: `feat(<CLIENTE>): add caso<N> - <descripcion>`
