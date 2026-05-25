import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Web Push (VAPID) ─────────────────────────────────────────────────────────
// Implementación manual del protocolo Web Push con VAPID usando WebCrypto API de Deno

async function importVapidPrivateKey(base64url: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64url.replace(/-/g,'+').replace(/_/,'/')), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw', raw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, ['deriveKey', 'deriveBits']
  );
}

function base64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function buildVapidJwt(audience: string, subject: string, privateKeyB64: string): Promise<string> {
  const header = base64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = base64urlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  })));

  const raw = Uint8Array.from(atob(privateKeyB64.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'raw', raw,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(`${header}.${payload}`)
  );

  return `${header}.${payload}.${base64urlEncode(sig)}`;
}

async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: string, vapidPublic: string, vapidPrivate: string): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await buildVapidJwt(audience, 'mailto:info@rincon-de-alfonso.com', vapidPrivate);

  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${vapidPublic}`,
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
    },
    body: new TextEncoder().encode(payload),
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (secret && authHeader !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: { record: Record<string, unknown> };
  try { payload = await req.json(); }
  catch { return new Response('Bad Request', { status: 400 }); }

  const reserva = payload.record;
  const restaurantId = reserva.restaurant_id as string;

  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const vapidPublic    = Deno.env.get('VAPID_PUBLIC_KEY')!;
  const vapidPrivate   = Deno.env.get('VAPID_PRIVATE_KEY')!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('restaurant_id', restaurantId);

  if (!subs || subs.length === 0) {
    return new Response('No subscriptions', { status: 200 });
  }

  const notifPayload = JSON.stringify({
    title: '🔔 Nueva solicitud de reserva',
    body:  `${reserva.nombre} — ${reserva.comensales} pax · ${reserva.fecha} ${reserva.hora}`,
    url:   '/',
  });

  const results = await Promise.allSettled(
    subs.map(sub => sendWebPush(sub, notifPayload, vapidPublic, vapidPrivate))
  );

  const ok = results.filter(r => r.status === 'fulfilled').length;
  console.log(`Push enviado: ${ok}/${subs.length} suscripciones`);
  return new Response(`OK: ${ok}/${subs.length}`, { status: 200 });
});
