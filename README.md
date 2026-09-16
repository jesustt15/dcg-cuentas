# DCG BOX — Centro Operativo

Desktop app para gestión integral de gimnasios y boxes de entrenamiento. Control de atletas, membresías, punto de venta (POS), reportes de ingresos y cuentas por cobrar — todo en una sola app nativa.

![Version](https://img.shields.io/badge/version-1.2.0-D4AF37)
![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### Gestión de Atletas
- CRUD completo con plan, teléfono, límite de crédito y fecha de vencimiento
- Importación masiva desde Excel
- Historial de pagos y movimientos por atleta
- Control de estado (activo/suspendido)

### Punto de Venta (POS)
- Búsqueda de productos con imágenes por categoría
- Selección de atleta con autocompletado (ventas a cuenta o mostrador)
- Métodos de pago: efectivo, pago móvil, a cuenta
- Control de inventario con alertas de stock bajo

### Reportes de Ingresos
- Desglose **membresías vs ventas POS** por período (día / semana / mes)
- Gráfico comparativo diario
- Ingresos POS por categoría de producto
- Tabla resumen diario con totales

### Cuentas por Cobrar (CXC)
- Lista de deudores con deuda total, promedio y máxima
- Antigüedad de deuda (0-30, 31-60, 61-90, 90+ días)
- Envío de recordatorios por WhatsApp (individual y masivo)
- Plantilla de recordatorio personalizable

### Dashboard Operativo
- KPIs: ventas del día, semana, mes, CXC total, deudores activos
- Gráfico de ventas de los últimos 30 días
- Panel de planes por vencer con badges de estado
- Distribución de atletas por plan
- Tasa de cambio BCV actualizable (manual o auto-fetch)

## Stack

| Capa | Tecnología |
|---|---|
| Framework | [Tauri v2](https://tauri.app/) (Rust backend) |
| Frontend | [React 19](https://react.dev/) + TypeScript |
| Database | SQLite (local, archivo único) |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Routing | React Router v7 |
| Icons | Lucide React |

## Instalación

### Desde binario (más rápido)

Descarga el instalador desde [Releases](../../releases):
- `dcg-cuentas_1.2.0_x64-setup.exe` — Instalador NSIS
- `dcg-cuentas_1.2.0_x64_en-US.msi` — Paquete MSI

### Desde código fuente

**Requisitos:** [Rust](https://rustup.rs/), [Node.js](https://nodejs.org/) 18+, [pnpm](https://pnpm.io/)

```bash
# Clonar el repo
git clone https://github.com/jesustt15/dcg-cuentas.git
cd dcg-cuentas

# Instalar dependencias
pnpm install

# Modo desarrollo
pnpm dev

# Build de producción
pnpm build
```

Los binarios se generan en `src-tauri/target/release/bundle/`.

## Estructura del proyecto

```
dcg-cuentas/
├── src/                      # Frontend React
│   └── src/
│       ├── pages/            # Dashboard, Athletes, POS, Debts, Reports, Products
│       ├── components/       # Modales, diálogos, recordatorios
│       ├── lib/              # DB client, helpers, teléfono, reminder
│       ├── hooks/            # DbProvider (estado global)
│       └── types/            # TypeScript interfaces
├── src-tauri/                # Backend Rust
│   └── src/
│       ├── main.rs           # Tauri entry point + command registration
│       └── db.rs             # SQLite schema + all commands
└── package.json              # Scripts y dependencias
```

## Licencia

[MIT](LICENSE) — 2026
