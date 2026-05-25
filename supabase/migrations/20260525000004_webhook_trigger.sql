-- ─── Webhook: dispara la Edge Function al aprobar/rechazar una reserva ────────
-- Requiere tener la Edge Function `notify-reserva` desplegada en Supabase.
-- En Supabase Studio: Database → Webhooks → Create a new hook
-- O ejecutar este SQL (requiere extensión pg_net activa en tu proyecto).
-- ─────────────────────────────────────────────────────────────────────────────

-- Activar la extensión de webhooks HTTP (ya viene en Supabase por defecto)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Función que llama a la Edge Function via HTTP
CREATE OR REPLACE FUNCTION notify_reserva_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url    TEXT;
  v_secret TEXT;
BEGIN
  -- Solo actuar cuando cambia el estado
  IF OLD.estado = NEW.estado THEN
    RETURN NEW;
  END IF;

  -- Solo notificar cuando pasa a estado final
  IF NEW.estado NOT IN ('confirmada', 'rechazada') THEN
    RETURN NEW;
  END IF;

  v_url    := current_setting('app.edge_function_url', true);
  v_secret := current_setting('app.webhook_secret', true);

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/notify-reserva',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body    := jsonb_build_object(
      'type',       'UPDATE',
      'table',      'reservas',
      'record',     row_to_json(NEW),
      'old_record', row_to_json(OLD)
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_reserva_estado
  AFTER UPDATE ON reservas
  FOR EACH ROW
  EXECUTE FUNCTION notify_reserva_estado();

-- ─── Configurar las variables (ejecutar aparte con tus valores reales) ────────
-- ALTER DATABASE postgres SET app.edge_function_url = 'https://xxxx.supabase.co';
-- ALTER DATABASE postgres SET app.webhook_secret    = 'tu-secret-seguro';
