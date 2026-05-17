# Kreis Web App

App React + Vite + TypeScript para prototipar la experiencia de Kreis.

## Estructura

```text
backend/
  src/                  Base futura del API Node.js como monolito modular
database/
  migrations/           Cambios versionados de schema
  schema/               Modelo de datos y decisiones de persistencia
  seeds/                Datos iniciales para entornos locales
shared/
  contracts/            Tipos/contratos compartidos entre frontend y backend
src/
  app/                  Punto de entrada de la app y estado principal
  assets/               Assets runtime importados por Vite
  components/           Componentes agrupados por funcionalidad
  data/                 Datos iniciales/mock de eventos, comunidades y perfil
  styles/global.css     CSS global de la aplicacion
  utils/                Helpers reutilizables
public/
  icons/                Iconos PWA y manifest
docs/
  architecture/         Decisiones tecnicas y limites de modulos
  brand-assets/         Originales y exports de marca que no se importan en runtime
```

## Backend

La direccion recomendada es Node.js + TypeScript + Express dentro de `backend/`. Next.js solo conviene si se migra tambien el frontend desde Vite a Next; no hace falta instalarlo para tener un backend modular.

## Comandos

```bash
npm.cmd run dev
npm.cmd run dev:api
npm.cmd run typecheck
npm.cmd run typecheck:api
npm.cmd run build
npm.cmd run preview
```

Para probar desde el celular en la misma red Wi-Fi:

```bash
npm.cmd run dev -- --host 0.0.0.0
```
