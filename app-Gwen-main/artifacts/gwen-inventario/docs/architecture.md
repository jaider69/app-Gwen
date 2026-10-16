# Gwen Inventario — base arquitectónica

## Decisión inicial

El proyecto se prepara como una aplicación Expo/React Native para poder iterar desde Replit y probarla en Expo Go. La estructura conserva límites claros para que la futura aplicación Flutter/Python pueda integrarse por API sin mezclar reglas de negocio con pantallas.

## Patrón

La app sigue una separación tipo Clean Architecture: la presentación conoce casos de uso, el dominio define contratos, y los repositorios aíslan el almacenamiento local o remoto. Las rutas de Expo actúan como adaptadores de navegación, no como lugar para reglas de negocio.

## Capas

- `app/`: rutas delgadas y composición de navegación.
- `src/presentation/screens/`: pantallas.
- `src/presentation/widgets/`: componentes visuales reutilizables.
- `src/domain/models.ts`: modelos de tiendas, usuarios, productos y movimientos.
- `src/domain/repositories/`: contratos que desacoplan dominio de datos.
- `src/data/database/`: registro de tablas y fachada de base local.
- `src/data/repositories/`: repositorios locales.
- `constants/` y `hooks/`: tokens visuales y acceso al tema.
- `src/domain/`: contratos del dominio y límites de aislamiento por tienda.
- `src/data/local/`: persistencia local. Es la fuente de trabajo cuando el dispositivo no tiene conexión.
- `src/services/auth/`: frontera para el proveedor de autenticación, sin autenticación activa en esta fase.
- `src/services/config/`: variables públicas de runtime, sin credenciales incrustadas.
- `src/services/supabase/`: adaptador remoto preparado, sin lecturas ni escrituras activas.
- `src/services/sync/`: inspección y frontera de sincronización, sin sincronización real todavía.
- `src/services/prediction/`: contrato de la futura API Python, sin predicciones.
- `lib/api-spec/`: contrato OpenAPI compartido cuando se agreguen endpoints reales.
- `artifacts/api-server/`: servidor Express compartido. No se modifica en esta preparación.

## Tablas locales previstas

`stores`, `users`, `categories`, `products`, `inventory_movements`, `sales`, `sale_items` y `sync_queue`.

La fachada actual usa almacenamiento local JSON para no introducir filas ni datos falsos. Puede sustituirse por SQLite manteniendo los contratos de `LocalDatabase` y `LocalRepository`.

## Configuración remota

Las variables públicas esperadas están documentadas en `.env.example`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_PREDICTION_API_URL`

No hay valores reales en el repositorio y la app no realiza llamadas remotas en esta fase.

## Reglas que se mantienen

1. No se guardan datos de una tienda sin `storeId`.
2. La cola local no envía nada por sí sola: necesitará una sesión válida y un adaptador remoto.
3. Las predicciones no se simulan en el cliente.
4. La voz y la API Python serán adaptadores independientes cuando llegue su fase.
5. Cada fase debe conservar la navegación y la base local de las fases anteriores.