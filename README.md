# Set de Pruebas Automatizadas — Facturación Seidor

Sistema de pruebas E2E para portales de facturación SAP Fiori, con arquitectura híbrida: **Playwright ejecuta, IA valida**.

## Arquitectura

```
┌─────────────────────────────────────────────┐
│            Antigravity (IA)                 │
│  • Saluda y guía al tester                  │
│  • Sincroniza rama del cliente              │
│  • Lee resultados y genera reportes         │
│  • Diagnostica errores                      │
│  • Consumo: ~5-10 tool calls               │
└──────────────┬──────────────────────────────┘
               │ ejecuta
┌──────────────▼──────────────────────────────┐
│         runner.js (Node.js)                 │
│  • Crea pre-factura vía API                 │
│  • Lanza Playwright                         │
│  • Genera result.json + screenshots         │
│  • Consumo de IA: CERO                      │
└──────────────┬──────────────────────────────┘
               │ controla
┌──────────────▼──────────────────────────────┐
│      Playwright (Navegador)                 │
│  • Login al portal SAP                      │
│  • Busca pre-factura, cobra, emite boleta   │
│  • Capturas automáticas en puntos clave     │
│  • Consumo de IA: CERO                      │
└─────────────────────────────────────────────┘
```

## Inicio Rápido

### Ejecutar pruebas (recomendado: usar el workflow)

```bash
# Antigravity ejecuta esto por ti con /run-tests
node scripts/runner.js --caso caso1 --env QAS --tester Pierre
```

### Ejecución directa (sin runner)

```bash
npm run test:caso1
```

### Dry run (sin tocar API ni portal)

```bash
npm run dry-run
```

## Estructura

```
├── SYSTEM.md              ← Comportamiento de la IA
├── CONTRIBUTING.md        ← Guía para nuevos clientes
├── config/
│   ├── environments.json  ← URLs y credenciales portal
│   ├── api-config.json    ← Endpoint y auth del API
│   ├── state.properties   ← Último ID usado
│   └── test-registry.json ← Catálogo de casos
├── scripts/
│   ├── runner.js          ← Orquestador
│   ├── api-helper.js      ← Creación de pre-facturas
│   ├── report-generator.js← Reportes .md
│   └── caso1-boleta.spec.js ← Playwright caso 1
├── templates/             ← Plantillas JSON
├── scenarios/             ← Docs de escenarios
└── evidence/              ← Capturas y reportes
```

## Clientes

Cada rama = un cliente:

| Rama   | Cliente               |
| ------ | --------------------- |
| `CI`   | Clínica Internacional |
| `main` | Template base         |

## Workflows (Slash Commands)

| Comando          | Descripción                      |
| ---------------- | -------------------------------- |
| `/run-tests`     | Ejecutar pruebas para un cliente |
| `/nuevo-cliente` | Integrar un nuevo cliente        |

## Escenarios Disponibles (CI)

| Caso  | Descripción                | Medio de Pago |
| ----- | -------------------------- | ------------- |
| caso1 | Boleta Efectivo sin vuelto | Efectivo      |
