# Plan de desarrollo por fases

## Fase 1 — Arquitectura base

- Separación de presentación, dominio, repositorios, servicios y datos.
- Registro de tablas locales previstas.
- Fachada de almacenamiento local y repositorio genérico.
- Fronteras preparadas para autenticación, Supabase, sincronización y predicción.
- Sistema visual con botones grandes, legibilidad y navegación clara.

## Fase 2 — Identidad y acceso

- Definir el proveedor de autenticación.
- Registrar el vínculo entre usuario y tienda.
- Aplicar aislamiento de datos en cada operación.
- Persistir de forma segura la sesión necesaria para trabajar offline.

## Fase 2 — Productos e inventario

- Catálogo de productos.
- Existencias y unidades.
- Entradas y movimientos.

## Fase 3 — Alertas y reportes

- Stock bajo.
- Vencimientos.
- Notificaciones locales y reportes básicos.

## Fase 4 — Sincronización

- Adaptador remoto.
- Reintentos y resolución de conflictos.
- Sincronización con Supabase/PostgreSQL.

## Fase 5 — Gwen por voz

- Reconocimiento de comandos.
- Confirmación de acciones antes de modificar datos.

## Fase 6 — Predicción de demanda

- API REST en Python.
- Integración Flutter/cliente → API → modelo → resultado.
- No se muestran predicciones hasta contar con resultados reales del servicio.

## Fuera de alcance

Contabilidad, facturación electrónica, nómina y módulos financieros avanzados.