-- =====================================================================
-- Módulo de facturación · Paso 6: envío de la factura por mail
--
-- Registra si el PDF del comprobante se le mandó al comprador.
--
-- Correr primero en innova-trabajosocial-develop y después en
-- innova-trabajosocial (producción), ANTES de mergear el código.
-- =====================================================================

alter table public.facturas
  add column if not exists email_enviado_at timestamptz,
  add column if not exists email_error      text;