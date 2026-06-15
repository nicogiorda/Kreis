# Kreis — Claude Context

## Producto

Kreis es una PWA mobile-first para estudiantes universitarios (centro actual: UADE). Ayuda a descubrir eventos del campus, unirse a comunidades de interés y publicar posts dentro de las mismas. El tono es energético, cálido, local y estudiantil — no una plataforma corporativa de eventos.

## Stack técnico

- **Frontend**: React 19 + Vite 7 + TypeScript + Tailwind CSS v4
- **Backend**: Express 5 + Node.js + TypeScript (monolito modular en `apps/api`)
- **Shared**: contratos TypeScript en `packages/shared`
- **PWA**: `vite-plugin-pwa`, manifest en `apps/web/public/manifest.json`
- **Icons**: Solar Icons (`@solar-icons/react`), Phosphor como secundario
- **Router**: React Router 7
- **Testing**: Vitest + Testing Library
- **Deploy**: Vercel (`vercel.json` en raíz)

## Estructura del repo

```
apps/
  web/          PWA React/Vite — todo el frontend
    src/
      app/         App.tsx (root)
      components/  home, events, communities, navigation, profile, composer, common
      data/        mockData.ts, profile.ts
      assets/      brand/, characters/, fonts/
      styles/      global.css (tokens CSS)
      utils/       cn, events, navigation, text
      types.ts
  api/          API Express — monolito modular
    src/
      platform/    server.ts, app.ts, routes.ts
      core/        config.ts, http.ts
      modules/     (events, communities, users, auth, posts, discovery, notifications)
      shared/
packages/
  shared/       Contratos TypeScript compartidos
infra/
  database/     Migraciones, schema, seeds
docs/
  architecture/ backend-stack.md, monolito-modular.md, project-structure.md
  design/       DESIGN.md
  product/      PRODUCT.md
  onboarding/   repo-handbook.md
codex-skills/   Skills locales del proyecto
.claude/
  commands/     Slash commands instalados (27 skills)
```

## Design system

**Paleta**
- Brand orange: `#f0531c` — estados activos, splash, identidad
- Cream background (light): `#f7edda`
- Deep green: `#09332c`
- Norfolk green: `#2e4b3c`
- Pumpkin accent: `#ffa74f`
- Ink: `#0a0a0a`
- Dark background: `#2b2928`
- Dark surface: `#332f2d`

**Tipografía**: `Satoshi` como UI principal, `Arial` fallback. Amsi Pro y Gazpacho disponibles para momentos de marca. Mantener labels compactos y legibles.

**Tokens**: definidos en `apps/web/src/styles/global.css`

**Assets brand runtime**: `apps/web/src/assets/brand/`
- `fondo-uade-light.webp` / `fondo-uade-dark.webp` — banner home
- SVGs: ISOTIPO, IMAGOTIPO (normal e invertido)
- `isotype-inverted-splash.svg` — para splash

**Personaje mascota**: `apps/web/src/assets/characters/kreisito*`

## Componentes clave

| Componente | Descripción |
|---|---|
| `SplashScreen` | Pantalla de entrada — naranja, isotipo, sin delays largos |
| `HeroBanner` | Banner full-bleed, toggle de tema, sin glass |
| `HomeScreen` | Tab switch eventos/comunidades, rails de contenido |
| `EventCard` | Fila compacta con date chip, título, lugar, badge oficial |
| `BottomNav` | Barra fija, Solar Icons, naranja activo, muted inactivo |
| `Header` | Fuera de home — búsqueda global y acciones utility |
| `CommunitiesScreen` | Grid de comunidades |
| `ProfileScreen` | Perfil del usuario |
| `ComposerModal` | Crear post/evento |

## Principios de diseño

- Mobile-first, thumb-friendly (testar en 393px y 430px de ancho)
- Naranja solo para momentos de marca y estados activos — las pantallas producto se mantienen cálidas y claras
- Motion: `transform`, `opacity`, `clip-path` — nunca layout properties. Respetar `prefers-reduced-motion`
- Splash: momento de marca corto, luego desaparece sin demorar el acceso
- Usar Tailwind utilities + CSS custom properties para tokens compartidos

## Anti-referencias

- Feeds azul-gris fríos
- Dashboards SaaS genéricos
- Splash screens que parecen ads
- Glassmorphism decorativo
- Motion que bloquea el acceso rápido
- Depender solo del color para significado (badges, filtros activos)

## Comandos

```bash
npm run dev          # Frontend PWA
npm run dev:api      # Backend Express
npm run lint
npm run format
npm run test
npm run typecheck
npm run build
```

## Skills instaladas (`.claude/commands/`)

brandkit, design-taste-frontend, find-skills, frontend-design, frontend-responsive-ui, full-output-enforcement, gpt-taste, gsap-core, gsap-frameworks, gsap-performance, gsap-plugins, gsap-react, gsap-scrolltrigger, gsap-timeline, gsap-utils, high-end-visual-design, image-to-code, imagegen-frontend-mobile, imagegen-frontend-web, impeccable, industrial-brutalist-ui, minimalist-ui, nodejs-backend-patterns, pwa-development, redesign-existing-projects, stitch-design-taste, ui-animation

## Archivos de contexto del repo

- `PRODUCT.md` — propósito, usuarios, principios de producto
- `DESIGN.md` — sistema visual, colores, tipografía, motion, assets
- `docs/product/PRODUCT.md` — contexto de producto extendido
- `docs/design/DESIGN.md` — design context extendido
- `docs/architecture/backend-stack.md` — stack y decisiones backend
- `docs/architecture/monolito-modular.md` — arquitectura backend
- `docs/architecture/project-structure.md` — ownership de carpetas
