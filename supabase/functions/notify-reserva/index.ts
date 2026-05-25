import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ReservaRecord {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  fecha: string;      // YYYY-MM-DD
  hora: string;       // HH:MM
  comensales: number;
  estado: 'confirmada' | 'rechazada';
  motivo_rechazo?: string;
  detalles?: {
    ocasion?: string;
    alergias?: string;
    tronas?: boolean;
    notas?: string;
  };
}

interface WebhookPayload {
  type: 'UPDATE';
  table: string;
  record: ReservaRecord;
  old_record: ReservaRecord;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${d} de ${meses[parseInt(m) - 1]} de ${y}`;
}

// ─── Plantilla: Reserva Confirmada ────────────────────────────────────────────
function emailConfirmada(r: ReservaRecord): { subject: string; html: string } {
  const ocasion = r.detalles?.ocasion
    ? `<p style="margin:0 0 8px;">🎉 <strong>Ocasión especial:</strong> ${escapeHtml(r.detalles.ocasion)}</p>`
    : '';
  const alergias = r.detalles?.alergias
    ? `<p style="margin:0 0 8px;">🌿 <strong>Alergias/dieta:</strong> ${escapeHtml(r.detalles.alergias)}</p>`
    : '';
  const tronas = r.detalles?.tronas
    ? `<p style="margin:0 0 8px;">🪑 <strong>Tronas:</strong> Sí, las prepararemos</p>`
    : '';

  return {
    subject: `✅ Reserva confirmada — ${formatFecha(r.fecha)}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f8f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#f2cc0d;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:32px;">🍽️</p>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#1a180d;">Rincón de Alfonso</h1>
            <p style="margin:6px 0 0;font-size:14px;color:#4a4010;">Reservas y Eventos</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px;">
            <h2 style="margin:0 0 8px;font-size:20px;color:#1a180d;">¡Reserva confirmada! ✅</h2>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;">Hola ${escapeHtml(r.nombre)}, tu reserva ha sido confirmada. Te esperamos con todo listo.</p>

            <!-- Caja de detalles -->
            <div style="background:#f8f8f5;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Detalles de tu reserva</p>
              <p style="margin:0 0 8px;font-size:15px;color:#1e293b;">📅 <strong>${formatFecha(r.fecha)}</strong> a las <strong>${r.hora}</strong></p>
              <p style="margin:0 0 8px;font-size:15px;color:#1e293b;">👥 <strong>${r.comensales} ${r.comensales === 1 ? 'persona' : 'personas'}</strong></p>
              ${ocasion}${alergias}${tronas}
            </div>

            <p style="margin:0 0 8px;font-size:14px;color:#64748b;">¿Necesitas modificar o cancelar? Llámanos con antelación:</p>
            <p style="margin:0 0 24px;font-size:15px;font-weight:600;color:#1a180d;">📞 659 254 121</p>

            <p style="margin:0;font-size:14px;color:#94a3b8;">¡Hasta pronto! 👋</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f8f5;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">Rincón de Alfonso · Carril Torre Los Leales, 4 · Los Dolores, Murcia</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

// ─── Plantilla: Reserva Rechazada ─────────────────────────────────────────────
function emailRechazada(r: ReservaRecord): { subject: string; html: string } {
  const motivo = r.motivo_rechazo
    ? `<p style="margin:0 0 16px;font-size:14px;color:#64748b;">Motivo: <em>${escapeHtml(r.motivo_rechazo)}</em></p>`
    : '';

  return {
    subject: `❌ Solicitud de reserva — ${formatFecha(r.fecha)}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f8f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#f2cc0d;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:32px;">🍽️</p>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#1a180d;">Rincón de Alfonso</h1>
            <p style="margin:6px 0 0;font-size:14px;color:#4a4010;">Reservas y Eventos</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px;">
            <h2 style="margin:0 0 8px;font-size:20px;color:#1a180d;">Lo sentimos, no podemos confirmarte</h2>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;">Hola ${escapeHtml(r.nombre)}, lamentablemente no podemos confirmar tu solicitud para el <strong>${formatFecha(r.fecha)}</strong> a las <strong>${escapeHtml(r.hora)}</strong> para ${r.comensales} persona${r.comensales !== 1 ? 's' : ''}.</p>

            ${motivo}

            <div style="background:#f8f8f5;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 8px;font-size:14px;color:#64748b;">¿Quieres intentarlo con otra fecha? Contáctanos:</p>
              <p style="margin:0;font-size:15px;font-weight:600;color:#1a180d;">📞 659 254 121</p>
            </div>

            <p style="margin:0;font-size:14px;color:#94a3b8;">Esperamos poder recibirte pronto. ¡Disculpa las molestias!</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f8f5;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">Rincón de Alfonso · Carril Torre Los Leales, 4 · Los Dolores, Murcia</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

// ─── Handler principal ────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Verificar secret para que solo Supabase pueda llamar a esta función
  const expectedSecret = Deno.env.get('WEBHOOK_SECRET');
  if (!expectedSecret) {
    console.error('WEBHOOK_SECRET not configured — rejecting request');
    return new Response('Server misconfigured', { status: 500 });
  }
  if (req.headers.get('Authorization') !== `Bearer ${expectedSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const { record, old_record } = payload;

  // Solo actuar cuando el estado cambia a confirmada o rechazada
  if (record.estado === old_record.estado) {
    return new Response('No state change', { status: 200 });
  }
  if (record.estado !== 'confirmada' && record.estado !== 'rechazada') {
    return new Response('Not a final state', { status: 200 });
  }

  const { subject, html } = record.estado === 'confirmada'
    ? emailConfirmada(record)
    : emailRechazada(record);

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.error('RESEND_API_KEY not set');
    return new Response('Config error', { status: 500 });
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Rincón de Alfonso <reservas@rincondealfonso.com>',
      to: [record.email],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Resend error:', err);
    return new Response('Email error', { status: 500 });
  }

  console.log(`Email ${record.estado} enviado para reserva ${record.id}`);
  return new Response('OK', { status: 200 });
});
