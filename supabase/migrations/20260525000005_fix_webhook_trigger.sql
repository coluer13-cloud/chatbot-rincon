-- ─── Reemplaza el trigger con URL y secret hardcodeados ──────────────────────
-- Necesario porque ALTER DATABASE requiere permisos de superuser.
-- Si migras el proyecto de Supabase, actualiza la URL aquí.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_reserva_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.estado = NEW.estado THEN
    RETURN NEW;
  END IF;

  IF NEW.estado NOT IN ('confirmada', 'rechazada') THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://whmhmocgbteguyaxhepn.supabase.co/functions/v1/notify-reserva',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer chatbot-reservas-apprincon-2026'
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
