-- Seguridad: el frontend y los asesores solo consultan el backend Express,
-- que se conecta a PostgreSQL con su cuenta privada (postgres).
-- No se requieren permisos directos de Data API para anon/authenticated.
-- Las tablas conservan RLS; no se alteran filas ni reglas de negocio.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
-- Las funciones internas y triggers no son endpoints RPC públicos.
-- Conserva los permisos directos del propietario y de service_role.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

COMMIT;
