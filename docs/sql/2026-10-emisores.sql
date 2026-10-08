-- =====================================================================
-- Módulo de facturación · Paso 1: emisores
--
-- Un emisor es un admin que puede emitir facturas a su nombre.
-- Cada admin carga sus propios datos desde Configuración → Datos de
-- facturación. La tabla solo se accede con service_role desde las
-- Netlify Functions (RLS activada sin policies, igual que cupones).
--
-- Correr primero en innova-trabajosocial-develop y después en
-- innova-trabajosocial (producción), ANTES de mergear el código.
-- =====================================================================

create table if not exists public.emisores (
  id                  uuid primary key default gen_random_uuid(),
  usuario_id          uuid not null unique references public.usuarios(id) on delete restrict,

  -- Datos fiscales
  razon_social        text not null,
  cuit                text not null unique check (cuit ~ '^[0-9]{11}$'),
  condicion_fiscal    text not null
                      check (condicion_fiscal in ('monotributo', 'responsable_inscripto', 'exento')),
  punto_venta         integer check (punto_venta between 1 and 99998),
  domicilio_fiscal    text,
  inicio_actividades  date,

  -- Estado
  is_default          boolean not null default false,
  active              boolean not null default true,

  -- Certificado digital de ARCA.
  -- La clave privada se guarda cifrada (AES-256-GCM) con FISCAL_ENCRYPTION_KEY
  -- y nunca sale del backend.
  private_key_enc     text,
  csr_pem             text,
  csr_generated_at    timestamptz,
  cert_pem            text,
  cert_expires_at     timestamptz,
  cert_uploaded_at    timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Solo puede haber un emisor por defecto.
create unique index if not exists emisores_unico_default
  on public.emisores (is_default)
  where is_default;

drop trigger if exists emisores_updated_at on public.emisores;
create trigger emisores_updated_at
  before update on public.emisores
  for each row execute function public.update_updated_at();

alter table public.emisores enable row level security;
revoke all on public.emisores from anon, authenticated;
