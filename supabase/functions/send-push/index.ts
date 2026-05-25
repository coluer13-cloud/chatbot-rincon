import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function base64urlToBytes(b64: string): Uint8Array {
  const base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  return Uint8Array.from(atob(base64 + pad), c => c.charCodeAt(0));
}

function bytesToBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function importVapidPrivateKey(privateB64: string, publicB64: string): Promise<CryptoKey> {
  // Extract x and y from the uncompressed public key (04 || x32 || y32)
  const pub = base64urlToBytes(publicB64);
  const x = bytesToBase64url(pub.slice(1, 33).buffer);
  const y = bytesToBase64url(pub.slice(33, 65).buffer);
  return crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: privateB64, x, y, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign'],
  );
}

async function buildVapidJwt(audience: string, vapidPrivate: string, vapidPublic: string): Promise<string> {
  const enc = (obj: unknown) => bytesToBase64url(new TextEncoder().encode(JSON.stringify(obj)));
  const header  = enc({ typ: 'JWT', alg: 'ES256' });
  const payload = enc({ aud: audience, exp: Math.floor(Date.now() / 1000) + 43200, sub: 'mailto:reservas@rincondealfonso.com' });
  const key = await importVapidPrivateKey(vapidPrivate, vapidPublic);
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${bytesToBase64url(sig)}`;
}

async function sendWebPush(
  sub: { endpoint: string },
  vapidPublic: string,
  vapidPrivate: string,
): Promise<Response> {

  const { protocol, host } = new URL(sub.endpoint);
  const jwt = await buildVapidJwt(`${protocol}//${host}`, vapidPrivate, vapidPublic);
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${vapidPublic}`,
      'TTL': '86400',
    },
  });
}

serve(async (req: Request) => {
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (secret && req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: { record: Record<string, unknown> };
  try { payload = await req.json(); }
  catch { return new Response('Bad Request', { status: 400 }); }

  const restaurantId = payload.record.restaurant_id as string;
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const vapidPublic  = Deno.env.get('VAPID_PUBLIC_KEY')!;
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!;

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('restaurant_id', restaurantId);

  if (!subs?.length) return new Response('No subscriptions', { status: 200 });

  const results = await Promise.allSettled(
    subs.map(s => sendWebPush(s, vapidPublic, vapidPrivate))
  );

  const details: string[] = [];
  let ok = 0;
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const res = r.value;
      const body = await res.text().catch(() => '');
      if (res.ok || res.status === 201) {
        ok++;
        details.push(`OK ${res.status}`);
      } else {
        details.push(`FAIL ${res.status}: ${body}`);
      }
    } else {
      details.push(`ERROR: ${r.reason}`);
    }
  }
  return new Response(`${ok}/${subs.length} | ${details.join(' | ')}`, { status: 200 });
});
