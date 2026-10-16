# Gwen Inventario

Aplicación móvil offline-first para que tenderos gestionen productos, existencias y alertas de inventario por tienda.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Gwen Inventario requiere `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` para login y sincronización remota.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/gwen-inventario/app/` — rutas Expo Router, autenticación, dashboard e inventario.
- `artifacts/gwen-inventario/src/domain/` — modelos y contratos de dominio.
- `artifacts/gwen-inventario/src/services/products/productService.ts` — reglas de productos, estados, persistencia local y sync.
- `artifacts/gwen-inventario/src/presentation/context/ProductContext.tsx` — estado compartido del catálogo.
- `artifacts/gwen-inventario/supabase/migrations/` — SQL de aislamiento por tienda y tablas de Fase 3.

## Architecture decisions

- Las operaciones de productos se guardan primero en AsyncStorage y luego se encolan para sincronización.
- Supabase usa Row Level Security; el `store_id` se valida contra el perfil autenticado.
- Los productos vencidos permanecen visibles y gestionables; solo se muestran como vencidos/por vencer.

## Product

Login y registro con Supabase, dashboard de inventario, CRUD completo de productos, categorías iniciales y personalizadas, búsqueda, filtros, alertas de stock bajo/agotado/próximo a vencer y cola offline por tienda.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
