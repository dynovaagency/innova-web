-- =====================================================================
-- Módulo de facturación · Paso 3: conexión con ARCA
--
-- Agrega a `emisores`:
--   - ta_enc:     ticket de acceso de ARCA (token + sign), cifrado con
--                 FISCAL_ENCRYPTION_KEY. ARCA lo entrega por 12 horas y
--                 no da uno nuevo mientras el anterior esté vigente, por
--                 eso hay que guardarlo.
--   - arca_check: resultado de la última "Probar conexión con ARCA".
--
-- Correr primero en innova-trabajosocial-develop y después en
-- innova-trabajosocial (producción), ANTES de mergear el código.
-- =====================================================================

alter table public.emisores
  add column if not exists ta_enc     text,
  add column if not exists arca_check jsonb;