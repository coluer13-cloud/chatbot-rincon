import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @deno-types="npm:@types/web-push"
import webPush from 'npm:web-push';

serve(async (req: Request) => {
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret) {
    console.error('WEBHOOK_SECRET not configured — rejecting request');
    return new Response('Server misconfigured', { status: 500 });
  }
  if (req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: { record: Record<string, unknown> };
  try { payload = await req.json(); }
  catch { return new Response('Bad Request', { status: 400 }); }

  const restaurantId = payload.record.restaurant_id as string;
  const reserva      = payload.record;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const vapidPublic  = Deno.env.get('VAPID_PUBLIC_KEY')!;
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!;

  webPush.setVapidDetails(
    'mailto:reservas@rincondealfonso.com',
    vapidPublic,
    vapidPrivate,
  );

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('restaurant_id', restaurantId);

  if (!subs?.length) return new Response('No subscriptions', { status: 200 });

  const isLead = !!reserva.tipo_evento;
  const notifPayload = JSON.stringify(isLead ? {
    title: '🎉 Nuevo lead de evento',
    body:  `${reserva.nombre} — ${reserva.tipo_evento} · ${reserva.invitados_est ?? '?'} invitados`,
    url:   '/',
  } : {
    title: '🔔 Nueva reserva',
    body:  `${reserva.nombre} — ${reserva.comensales} pax · ${reserva.fecha} ${reserva.hora}`,
    url:   '/',
  });

  const results = await Promise.allSettled(
    subs.map(s =>
      webPush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        notifPayload,
      )
    )
  );

  const expiredEndpoints: string[] = [];
  const details = results.map((r, i) => {
    if (r.status === 'fulfilled') return `OK ${(r.value as { statusCode: number }).statusCode}`;
    const err = r.reason as { statusCode?: number; body?: string; message?: string };
    const code = err?.statusCode ?? 'no-code';
    const body = err?.body ?? err?.message ?? String(r.reason);
    if (code === 410 || code === 404) expiredEndpoints.push(subs[i].endpoint);
    console.error(`FAIL sub[${i}] code=${code} body=${body}`);
    return `FAIL ${code}`;
  });

  if (expiredEndpoints.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
    console.log(`Deleted ${expiredEndpoints.length} expired subscriptions`);
  }

  const ok = results.filter(r => r.status === 'fulfilled').length;
  console.log(`Push: ${ok}/${subs.length} | ${details.join(' | ')}`);
  return new Response(`${ok}/${subs.length} | ${details.join(' | ')}`, { status: 200 });
});
