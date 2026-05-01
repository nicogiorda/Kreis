# Kreis Web App

App React + Vite + TypeScript para prototipar la experiencia de Kreis.

## Estructura

```text
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
  brand-assets/         Originales y exports de marca que no se importan en runtime
```

## Comandos

```bash
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run build
npm.cmd run preview
```

Para probar desde el celular en la misma red Wi-Fi:

```bash
npm.cmd run dev -- --host 0.0.0.0
```
