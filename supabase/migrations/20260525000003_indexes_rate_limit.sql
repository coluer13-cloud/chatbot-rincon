-- ─── Índices y rate limiting a nivel de base de datos ────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Índices: reservas ─────────────────────────────────────────────────────────
-- Consultas frecuentes desde GESRIN: filtrar por restaurante + estado + fecha
CREATE INDEX IF NOT EXISTS idx_reservas_restaurant_estado
  ON reservas (restaurant_id, estado);

CREATE INDEX IF NOT EXISTS idx_reservas_restaurant_fecha
  ON reservas (restaurant_id, fecha DESC);

-- Realtime subscription filtra por restaurant_id
CREATE INDEX IF NOT EXISTS idx_reservas_created_at
  ON reservas (created_at DESC);

-- ── Índices: leads_eventos ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_restaurant_estado
  ON leads_eventos (restaurant_id, estado_lead);

CREATE INDEX IF NOT EXISTS idx_leads_created_at
  ON leads_eventos (created_at DESC);

-- ── Rate limiting: máx. 5 reservas por email en 60 minutos ───────────────────
-- Llamada desde la Edge Function antes de insertar; lanza error si se excede.
-- Usar SECURITY DEFINER para que anon pueda ejecutarla sin ver la tabla.
CREATE OR REPLACE FUNCTION check_reserva_rate_limit(p_email TEXT, p_restaurant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM reservas
  WHERE email           = lower(trim(p_email))
    AND restaurant_id   = p_restaurant_id
    AND created_at      > now() - INTERVAL '60 minutes';

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = 'Demasiadas solicitudes desde este email. Inténtelo más tarde.',
            ERRCODE = 'P0001';
  END IF;
END;
$$;

-- Misma protección para leads_eventos (máx. 3 por email/hora — eventos son menos frecuentes)
CREATE OR REPLACE FUNCTION check_lead_rate_limit(p_email TEXT, p_restaurant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM leads_eventos
  WHERE email           = lower(trim(p_email))
    AND restaurant_id   = p_restaurant_id
    AND created_at      > now() - INTERVAL '60 minutes';

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = 'Demasiadas solicitudes desde este email. Inténtelo más tarde.',
            ERRCODE = 'P0001';
  END IF;
END;
$$;

-- ── Normalización: guardar email siempre en minúsculas ────────────────────────
CREATE OR REPLACE FUNCTION normalize_chatbot_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.email = lower(trim(NEW.email));
  NEW.nombre = trim(NEW.nombre);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_reserva_email
  BEFORE INSERT ON reservas
  FOR EACH ROW EXECUTE FUNCTION normalize_chatbot_email();

CREATE TRIGGER trg_normalize_lead_email
  BEFORE INSERT ON leads_eventos
  FOR EACH ROW EXECUTE FUNCTION normalize_chatbot_email();
