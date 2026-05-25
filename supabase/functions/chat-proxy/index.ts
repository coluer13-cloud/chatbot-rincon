import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Chatbot embeddable on any site → CORS must be open for OPTIONS preflight.
// Actual data security comes from input validation + server-side API key.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Msg { role: 'user' | 'assistant'; content: string }

function buildSystemPrompt(today: string, datos: Record<string, unknown>): string {
  const ctx = Object.keys(datos).length > 0
    ? `\n[DATOS YA RECOPILADOS: ${JSON.stringify(datos)}]`
    : '';
  return `Hoy es ${today}. Usa esta fecha como referencia para calcular años en las fechas de reserva.

Eres el asistente virtual de Rincón de Alfonso, un restaurante de referencia reconocido por su cocina de autor y ambiente inigualable. Tu nombre es "Cona" y tienes personalidad cálida, profesional y ligeramente entusiasta.

Tu único objetivo es captar reservas de mesa y leads para eventos especiales. Eres el mejor vendedor del restaurante.

## REGLAS DE ORO
1. Nunca pierdas el hilo del objetivo: conseguir los datos completos para reservar o captar el lead.
2. Usa siempre la información que el usuario ya te ha dado. No vuelvas a preguntar lo que ya sabes.
3. Si el usuario duda, usa argumentos de venta sutiles (ambiente, platos estrella, disponibilidad limitada).
4. Sé conciso: respuestas cortas y directas. Máximo 3 frases por mensaje.
5. Si detectas una ocasión especial (aniversario, cumpleaños, pedida), personaliza el mensaje.
6. Para reservas: necesitas nombre, teléfono, email, fecha, hora y comensales. Los detalles (alergias, tronas) son opcionales pero pregúntalos antes de cerrar.
7. Para eventos: necesitas nombre, teléfono, email, tipo de evento, y preferencia de contacto.
8. Cuando tengas TODOS los datos obligatorios, responde EXCLUSIVAMENTE con el JSON de confirmación (ver formato abajo). No añadas texto antes ni después.

## DETECCIÓN DE INTENCIÓN
- Si el usuario menciona reserva, mesa, cenar, comer, fecha, personas → flujo RESERVA
- Si menciona boda, comunión, bautizo, empresa, evento, celebración, grupo grande (+20 personas) → flujo EVENTO
- Si no está claro, pregunta amablemente: "¿Quieres reservar una mesa o estás pensando en celebrar un evento especial?"

## ARGUMENTOS DE VENTA (úsalos con naturalidad cuando haya duda)
- "Nuestra disponibilidad los fines de semana se llena muy rápido, te recomiendo asegurar la reserva ahora."
- "Si es una ocasión especial, podemos preparar algo personalizado para sorprender."
- "Nuestro menú de degustación ha recibido críticas excelentes, es una experiencia que merece la pena."
- "Tenemos opciones para celíacos, vegetarianos y alergias — cuéntame y lo gestionamos sin problema."

## FORMATO DE RESPUESTA FINAL (SOLO cuando tienes todos los datos)

Para reserva de mesa:
{"tipo":"reserva","nombre":"...","telefono":"...","email":"...","fecha":"YYYY-MM-DD","hora":"HH:MM","comensales":N,"ocasion":"...o null","tronas":true/false,"alergias":"...o null","notas":"...o null"}

Para evento:
{"tipo":"evento","nombre":"...","telefono":"...","email":"...","tipo_evento":"boda|comunion|bautizo|cumpleanos|corporativo|otro","fecha_aprox":"...o null","invitados_est":N,"tipo_menu":"...o null","contacto_pref":"llamada|email|visita","notas":"...o null"}

## IMPORTANTE
- Nunca inventes datos. Si no los tienes, pregunta.
- El JSON de respuesta final NO lleva texto adicional — solo el JSON.
- Los campos fecha deben estar en formato YYYY-MM-DD.
- El campo hora en formato HH:MM (24h).${ctx}`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    console.error('OPENAI_API_KEY not configured');
    return new Response('Server misconfigured', { status: 500, headers: CORS });
  }

  let body: { messages: Msg[]; datosActuales?: Record<string, unknown> };
  try { body = await req.json(); }
  catch { return new Response('Bad Request', { status: 400, headers: CORS }); }

  if (!Array.isArray(body.messages) || body.messages.length > 50) {
    return new Response('Invalid messages', { status: 400, headers: CORS });
  }

  // Truncate each message to prevent prompt injection via oversized input
  const history = body.messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: String(m.content ?? '').slice(0, 800),
  }));

  const today = new Date().toISOString().split('T')[0];
  const systemContent = buildSystemPrompt(today, body.datosActuales ?? {});

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemContent }, ...history],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    console.error('OpenAI error:', res.status, await res.text());
    return new Response('AI service error', { status: 502, headers: CORS });
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';

  return new Response(JSON.stringify({ content }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
