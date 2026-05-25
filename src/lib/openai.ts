import type { ChatMessage, DatosReservaParcial, DatosEventoParcial } from '@/src/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[chat] Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

// ─── Detectar si la respuesta es el JSON final ────────────────────────────────
export function extractJson(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]+\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// ─── Llamada al proxy server-side (Edge Function) ────────────────────────────
export async function sendMessage(
  history: ChatMessage[],
  userMessage: string,
  datosActuales: DatosReservaParcial | DatosEventoParcial,
): Promise<string> {
  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  const url = `${SUPABASE_URL}/functions/v1/chat-proxy`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ messages, datosActuales }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[chat-proxy] Error ${res.status}:`, body);
    throw new Error(`chat-proxy error: ${res.status}`);
  }

  const data = await res.json();
  return data.content ?? '';
}
