# Fase 2 — conexión manual de Supabase

La app ya contiene las pantallas y el cliente de autenticación, pero no crea cuentas localmente ni usa credenciales ficticias cuando Supabase no está configurado.

## 1. Crear el proyecto

1. Crea un proyecto en Supabase.
2. Abre el SQL Editor.
3. Ejecuta `supabase/migrations/001_phase2_auth_and_stores.sql`.
4. Decide si exigirás confirmación de correo en Authentication → Providers → Email.

## 2. Configurar Replit

Agrega estas variables en Secrets/Environment Variables de Replit, sin escribirlas en archivos versionados:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

La clave anon es pública para el cliente, pero las políticas RLS son obligatorias. Nunca uses una `service_role` en la aplicación móvil.

## 3. Qué hace el registro

La app envía `full_name` y `store_name` como metadatos de Supabase Auth. El trigger crea una tienda y un perfil vinculados al nuevo usuario. El cliente nunca recibe permisos para asignarse a otra tienda.

## 4. Aislamiento

Las consultas de perfil y tienda usan el token del usuario. RLS permite leer únicamente:

- el perfil cuyo `id` coincide con `auth.uid()`;
- la tienda cuyo `id` coincide con el `store_id` del perfil autenticado.

La pantalla no debe considerarse lista para datos reales hasta ejecutar la migración y probar dos cuentas separadas.