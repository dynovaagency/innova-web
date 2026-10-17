-- =====================================================================
-- Módulo de facturación · Paso 4: facturas
--
-- Una fila por comprobante (factura o nota de crédito) ligado a un pago.
--
-- Ciclo de vida:
--   pendiente  → programada para emitirse (programada_para)
--   emitiendo  → tomada por el proceso de emisión (evita duplicados)
--   emitida    → ARCA otorgó CAE
--   error      → ARCA la rechazó o falló la conexión (se reintenta)
--   anulada    → se emitió una nota de crédito que la cancela
--
-- Correr primero en innova-trabajosocial-develop y después en
-- innova-trabajosocial (producción), ANTES de mergear el código.
-- =====================================================================

create table if not exists public.facturas (
  id                   uuid primary key default gen_random_uuid(),
  payment_ref          text not null,
  tipo                 text not null check (tipo in ('factura', 'nota_credito')),
  factura_asociada_id  uuid references public.facturas(id) on delete restrict,

  -- Emisor elegido (puede cambiarse mientras esté pendiente) y foto de
  -- sus datos al momento de emitir, para el PDF.
  emisor_id            uuid references public.emisores(id) on delete restrict,
  emisor_snapshot      jsonb,

  estado               text not null default 'pendiente'
                       check (estado in ('pendiente', 'emitiendo', 'emitida', 'error', 'anulada')),
  programada_para      timestamptz not null default now(),
  intentos             integer not null default 0,
  error_message        text,

  -- Datos del comprobante (se completan al emitir)
  cbte_tipo            integer,
  punto_venta          integer,
  numero               bigint,
  cae                  text,
  cae_vto              date,
  fecha                date,

  importe              numeric(12, 2) not null check (importe > 0),
  importe_neto         numeric(12, 2),
  importe_iva          numeric(12, 2),

  receptor_email       text,
  receptor_nombre      text,
  receptor_doc_tipo    integer,
  receptor_doc_nro     text,
  fecha_servicio       date,

  ambiente             text not null check (ambiente in ('homologacion', 'produccion')),
  created_by           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  emitida_at           timestamptz
);

-- Un mismo número no puede repetirse para un emisor / tipo / punto de venta.
create unique index if not exists facturas_numero_unico
  on public.facturas (emisor_id, cbte_tipo, punto_venta, numero)
  where estado in ('emitida', 'anulada');

-- Un pago tiene como máximo una factura vigente (las anuladas no cuentan).
create unique index if not exists facturas_una_por_pago
  on public.facturas (payment_ref)
  where tipo = 'factura' and estado <> 'anulada';

create index if not exists facturas_cola
  on public.facturas (estado, programada_para);

create index if not exists facturas_por_pago
  on public.facturas (payment_ref);

drop trigger if exists facturas_updated_at on public.facturas;
create trigger facturas_updated_at
  before update on public.facturas
  for each row execute function public.update_updated_at();

alter table public.facturas enable row level security;
revoke all on public.facturas from anon, authenticated;