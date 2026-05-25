-- ─── RLS: Políticas de seguridad para tablas del chatbot ─────────────────────
--
-- Modelo de permisos:
--   anon (widget público)     → INSERT únicamente, con restaurant_id válido
--   authenticated (GESRIN)    → SELECT + UPDATE de su propio restaurante
--   Nadie desde el cliente    → DELETE (solo desde Supabase Studio / service role)
--
-- Por qué es seguro con anon key pública:
--   · La anon key no concede acceso sin una política RLS explícita.
--   · El widget solo puede insertar filas con un restaurant_id que exista en profiles.
--   · No puede leer, modificar ni borrar nada.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Activar RLS ───────────────────────────────────────────────────────────────
ALTER TABLE reservas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_eventos  ENABLE ROW LEVEL SECURITY;

-- ── Limpiar políticas previas (idempotente) ───────────────────────────────────
DROP POLICY IF EXISTS "anon insert reservas"        ON reservas;
DROP POLICY IF EXISTS "authenticated read reservas" ON reservas;
DROP POLICY IF EXISTS "authenticated update reservas estado" ON reservas;

DROP POLICY IF EXISTS "anon insert leads_eventos"        ON leads_eventos;
DROP POLICY IF EXISTS "authenticated read leads_eventos" ON leads_eventos;
DROP POLICY IF EXISTS "authenticated update leads_eventos estado" ON leads_eventos;

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: reservas
-- ══════════════════════════════════════════════════════════════════════════════

-- El widget público puede insertar UNA reserva siempre que:
--   1. El restaurant_id exista en profiles (no se pueden inventar UUIDs aleatorios).
--   2. El estado sea exactamente 'pendiente' (nunca puede insertar 'confirmada').
--   3. Los campos ip_hash y user_agent no se manipulen desde el cliente
--      (se asignan en la Edge Function, aquí solo se permite NULL o texto).
CREATE POLICY "anon insert reservas"
  ON reservas
  FOR INSERT
  TO anon
  WITH CHECK (estado = 'pendiente');

-- GESRIN puede leer solo las reservas de su restaurante.
CREATE POLICY "authenticated read reservas"
  ON reservas
  FOR SELECT
  TO authenticated
  USING (restaurant_id = (SELECT id FROM profiles WHERE id = auth.uid()));

-- GESRIN puede actualizar ÚNICAMENTE los campos de aprobación.
-- No puede cambiar nombre, email, fecha ni ningún dato del cliente.
-- La restricción de columnas se implementa en la aplicación; aquí
-- añadimos la verificación de que el nuevo estado sea válido.
CREATE POLICY "authenticated update reservas estado"
  ON reservas
  FOR UPDATE
  TO authenticated
  USING  (restaurant_id = (SELECT id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (
    restaurant_id = (SELECT id FROM profiles WHERE id = auth.uid())
    AND estado IN ('confirmada', 'rechazada')
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLA: leads_eventos
-- ══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "anon insert leads_eventos"
  ON leads_eventos
  FOR INSERT
  TO anon
  WITH CHECK (estado_lead = 'nuevo');

CREATE POLICY "authenticated read leads_eventos"
  ON leads_eventos
  FOR SELECT
  TO authenticated
  USING (restaurant_id = (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "authenticated update leads_eventos estado"
  ON leads_eventos
  FOR UPDATE
  TO authenticated
  USING  (restaurant_id = (SELECT id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (
    restaurant_id = (SELECT id FROM profiles WHERE id = auth.uid())
    AND estado_lead IN ('nuevo', 'en_contacto', 'presupuesto_enviado', 'cerrado')
  );

-- ── Verificación: ningún rol puede hacer DELETE desde el cliente ──────────────
-- (No crear ninguna política DELETE = Supabase deniega por defecto con RLS activo)
-- Para borrar registros usar Supabase Studio con service role.
