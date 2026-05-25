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

const LOGO_URL = 'https://chatbot-rincon.vercel.app/logo.png';

const EMAIL_BASE = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#f0ede6;font-family:Georgia,'Times New Roman',serif;">
`;

const EMAIL_HEADER = `
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
        <tr>
          <td style="background:#1a1208;border-radius:12px 12px 0 0;padding:36px 48px;text-align:center;">
            <img src="${LOGO_URL}" alt="Rincón de Alfonso" width="200" style="max-width:200px;height:auto;display:block;margin:0 auto;" />
          </td>
        </tr>
        <tr>
          <td style="background:#c9a24a;height:3px;"></td>
        </tr>
`;

const EMAIL_FOOTER = `
        <tr>
          <td style="background:#c9a24a;height:1px;"></td>
        </tr>
        <tr>
          <td style="background:#1a1208;border-radius:0 0 12px 12px;padding:24px 48px;text-align:center;">
            <p style="margin:0 0 6px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#c9a24a;letter-spacing:0.12em;text-transform:uppercase;">Rincón de Alfonso</p>
            <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#7a6a4a;">Carril Torre Los Leales, 4 · Los Dolores, Murcia</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:0 16px 48px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
        <tr>
          <td style="padding:12px 0;text-align:center;">
            <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#a09070;">Este correo ha sido enviado automáticamente. Por favor no respondas a este mensaje.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

// ─── Plantilla: Reserva Confirmada ────────────────────────────────────────────
function emailConfirmada(r: ReservaRecord): { subject: string; html: string } {
  const ocasion = r.detalles?.ocasion
    ? `<tr><td style="padding:12px 0;border-bottom:1px solid #f0ede6;">
         <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#c9a24a;letter-spacing:0.1em;text-transform:uppercase;">Ocasión especial</p>
         <p style="margin:4px 0 0;font-size:15px;color:#1a1208;">${escapeHtml(r.detalles.ocasion)}</p>
       </td></tr>`
    : '';
  const alergias = r.detalles?.alergias
    ? `<tr><td style="padding:12px 0;border-bottom:1px solid #f0ede6;">
         <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#c9a24a;letter-spacing:0.1em;text-transform:uppercase;">Alergias / Dieta</p>
         <p style="margin:4px 0 0;font-size:15px;color:#1a1208;">${escapeHtml(r.detalles.alergias)}</p>
       </td></tr>`
    : '';
  const tronas = r.detalles?.tronas
    ? `<tr><td style="padding:12px 0;">
         <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#c9a24a;letter-spacing:0.1em;text-transform:uppercase;">Tronas</p>
         <p style="margin:4px 0 0;font-size:15px;color:#1a1208;">Sí, las tendremos listas</p>
       </td></tr>`
    : '';

  return {
    subject: `Reserva confirmada · ${formatFecha(r.fecha)} · Rincón de Alfonso`,
    html: `${EMAIL_BASE}${EMAIL_HEADER}
        <tr>
          <td style="background:#ffffff;padding:48px 48px 40px;">

            <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#c9a24a;letter-spacing:0.12em;text-transform:uppercase;">Confirmación de reserva</p>
            <h1 style="margin:0 0 24px;font-size:28px;font-weight:400;color:#1a1208;line-height:1.2;">Su mesa está<br><em>reservada</em></h1>

            <p style="margin:0 0 32px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;color:#5a4e3a;line-height:1.7;">Estimado/a <strong>${escapeHtml(r.nombre)}</strong>, es un placer confirmarle su reserva. Le esperamos con todo preparado para ofrecerle una experiencia inolvidable.</p>

            <!-- Detalles -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e0d0;border-radius:8px;margin-bottom:32px;">
              <tr>
                <td style="padding:20px 24px;border-bottom:1px solid #e8e0d0;">
                  <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#c9a24a;letter-spacing:0.12em;text-transform:uppercase;">Fecha y hora</p>
                  <p style="margin:6px 0 0;font-size:18px;color:#1a1208;font-weight:400;">${formatFecha(r.fecha)} · ${r.hora}h</p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 24px;${ocasion || alergias || tronas ? 'border-bottom:1px solid #e8e0d0;' : ''}">
                  <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#c9a24a;letter-spacing:0.12em;text-transform:uppercase;">Comensales</p>
                  <p style="margin:6px 0 0;font-size:18px;color:#1a1208;">${r.comensales} ${r.comensales === 1 ? 'persona' : 'personas'}</p>
                </td>
              </tr>
              ${ocasion || alergias || tronas ? `<tr><td style="padding:4px 24px;"><table width="100%" cellpadding="0" cellspacing="0">${ocasion}${alergias}${tronas}</table></td></tr>` : ''}
            </table>

            <!-- Contacto -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ef;border-radius:8px;margin-bottom:32px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#a09070;">¿Necesita modificar o cancelar su reserva?</p>
                  <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;font-weight:600;color:#1a1208;">659 254 121</p>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:15px;color:#5a4e3a;font-style:italic;">Hasta pronto. Será un placer recibirle.</p>

          </td>
        </tr>
${EMAIL_FOOTER}`,
  };
}

// ─── Plantilla: Reserva Rechazada ─────────────────────────────────────────────
function emailRechazada(r: ReservaRecord): { subject: string; html: string } {
  const motivo = r.motivo_rechazo
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-left:3px solid #c9a24a;margin-bottom:28px;">
         <tr><td style="padding:12px 20px;">
           <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#a09070;text-transform:uppercase;letter-spacing:0.1em;">Motivo</p>
           <p style="margin:0;font-size:14px;color:#5a4e3a;font-style:italic;">${escapeHtml(r.motivo_rechazo)}</p>
         </td></tr>
       </table>`
    : '';

  return {
    subject: `Su solicitud de reserva · Rincón de Alfonso`,
    html: `${EMAIL_BASE}${EMAIL_HEADER}
        <tr>
          <td style="background:#ffffff;padding:48px 48px 40px;">

            <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#c9a24a;letter-spacing:0.12em;text-transform:uppercase;">Solicitud de reserva</p>
            <h1 style="margin:0 0 24px;font-size:28px;font-weight:400;color:#1a1208;line-height:1.2;">Lo sentimos,<br><em>no podemos confirmarlo</em></h1>

            <p style="margin:0 0 28px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;color:#5a4e3a;line-height:1.7;">Estimado/a <strong>${escapeHtml(r.nombre)}</strong>, lamentablemente no nos es posible confirmar su solicitud para el <strong>${formatFecha(r.fecha)}</strong> a las <strong>${escapeHtml(r.hora)}h</strong> para ${r.comensales} persona${r.comensales !== 1 ? 's' : ''}.</p>

            ${motivo}

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ef;border-radius:8px;margin-bottom:32px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#a09070;">¿Desea intentarlo con otra fecha? Llámenos:</p>
                  <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;font-weight:600;color:#1a1208;">659 254 121</p>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:15px;color:#5a4e3a;font-style:italic;">Esperamos tener el placer de recibirle en otra ocasión.</p>

          </td>
        </tr>
${EMAIL_FOOTER}`,
  };
}
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
