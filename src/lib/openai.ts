import OpenAI from 'openai';
import type { ChatMessage, DatosReservaParcial, DatosEventoParcial } from '@/src/types';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'placeholder-key',
  dangerouslyAllowBrowser: true,
});

// ─── System prompt principal ──────────────────────────────────────────────────
function buildSystemPrompt(): string {
  const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `Hoy es ${hoy}. Usa esta fecha como referencia para calcular años en las fechas de reserva.

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
- El campo hora en formato HH:MM (24h).`;}

const SYSTEM_PROMPT = buildSystemPrompt;

// ─── Detectar si la respuesta es el JSON final ────────────────────────────────
export function extractJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // Intento con regex por si hay texto residual
    const match = trimmed.match(/\{[\s\S]+\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
}

// ─── Llamada al modelo ────────────────────────────────────────────────────────
export async function sendMessage(
  history: ChatMessage[],
  userMessage: string,
  datosActuales: DatosReservaParcial | DatosEventoParcial,
): Promise<string> {
  const contextNote = Object.keys(datosActuales).length > 0
    ? `\n[DATOS YA RECOPILADOS: ${JSON.stringify(datosActuales)}]`
    : '';

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT() + contextNote },
    ...history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.7,
    max_tokens: 300,
  });

  return response.choices[0]?.message?.content ?? '';
}
