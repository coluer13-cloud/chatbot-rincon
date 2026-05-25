-- ─── Chatbot: Tablas principales ─────────────────────────────────────────────
-- reservas     → solicitudes de mesa diarias (requieren aprobación manual)
-- leads_eventos → captación de eventos grandes (bodas, comuniones, corporativos)
--
-- Ambas tablas están vinculadas a `profiles.id` de GESRIN mediante restaurant_id,
-- lo que permite que el mismo Supabase sirva al widget público y al dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensión necesaria (ya activa en GESRIN, pero segura de repetir) ─────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tabla: reservas ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservas (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL    DEFAULT now(),

  -- Datos del cliente
  nombre            TEXT        NOT NULL    CHECK (char_length(trim(nombre)) >= 2),
  telefono          TEXT        NOT NULL    CHECK (telefono ~ '^\+?[0-9\s\-]{7,20}$'),
  email             TEXT        NOT NULL    CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),

  -- Datos de la reserva
  fecha             DATE        NOT NULL    CHECK (fecha >= CURRENT_DATE),
  hora              TIME        NOT NULL,
  comensales        INTEGER     NOT NULL    CHECK (comensales BETWEEN 1 AND 50),
  detalles          JSONB                   DEFAULT '{}',

  -- Flujo de aprobación
  estado            TEXT        NOT NULL    DEFAULT 'pendiente'
                                CHECK (estado IN ('pendiente', 'confirmada', 'rechazada')),
  motivo_rechazo    TEXT,

  -- Multi-restaurante (FK al perfil de GESRIN)
  restaurant_id     UUID        NOT NULL    REFERENCES profiles(id) ON DELETE CASCADE,

  -- Metadatos de seguridad
  ip_hash           TEXT,       -- SHA256 de la IP, nunca la IP en claro
  user_agent        TEXT
);

COMMENT ON TABLE  reservas IS 'Solicitudes de reserva de mesa recibidas desde el widget público.';
COMMENT ON COLUMN reservas.ip_hash IS 'Hash SHA256 de la IP del visitante. Nunca almacenar la IP en claro.';
COMMENT ON COLUMN reservas.estado  IS 'pendiente → aprobación manual en GESRIN → confirmada | rechazada';

-- ── Tabla: leads_eventos ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads_eventos (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL    DEFAULT now(),

  -- Datos del organizador
  nombre            TEXT        NOT NULL    CHECK (char_length(trim(nombre)) >= 2),
  telefono          TEXT        NOT NULL    CHECK (telefono ~ '^\+?[0-9\s\-]{7,20}$'),
  email             TEXT        NOT NULL    CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),

  -- Datos del evento
  tipo_evento       TEXT        NOT NULL
                                CHECK (tipo_evento IN (
                                  'boda', 'comunion', 'bautizo',
                                  'cumpleanos', 'corporativo', 'otro'
                                )),
  fecha_aprox       TEXT,                   -- texto libre: "octubre 2026", "sin fecha"
  invitados_est     INTEGER                 CHECK (invitados_est IS NULL OR invitados_est > 0),
  tipo_menu         TEXT,
  contacto_pref     TEXT        NOT NULL
                                CHECK (contacto_pref IN ('llamada', 'email', 'visita')),
  notas             TEXT,

  -- Seguimiento comercial
  estado_lead       TEXT        NOT NULL    DEFAULT 'nuevo'
                                CHECK (estado_lead IN (
                                  'nuevo', 'en_contacto', 'presupuesto_enviado', 'cerrado'
                                )),

  -- Multi-restaurante
  restaurant_id     UUID        NOT NULL    REFERENCES profiles(id) ON DELETE CASCADE,

  -- Metadatos de seguridad
  ip_hash           TEXT,
  user_agent        TEXT
);

COMMENT ON TABLE  leads_eventos IS 'Leads de eventos grandes captados desde el widget público.';
COMMENT ON COLUMN leads_eventos.estado_lead IS 'Ciclo comercial: nuevo → en_contacto → presupuesto_enviado → cerrado';
