import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, Loader2, CalendarCheck, PartyPopper, ChevronDown, MessageCircle } from 'lucide-react';
import type {
  ChatMessage, ChatFlow,
  DatosReservaParcial, DatosEventoParcial,
  ReservaInsert, LeadEventoInsert,
  TipoEvento, ContactoPref,
} from '@/src/types';
import { sendMessage, extractJson } from '@/src/lib/openai';
import { insertReserva, insertLeadEvento } from '@/src/lib/supabase';

const RESTAURANT_ID = import.meta.env.VITE_RESTAURANT_ID as string;
const PRIVACY_URL = 'https://rincondealfonso.com/politica-de-privacidad/';

const BUBBLES = [
  '¡Haz tu reserva! 🍽️',
  'Celebra con nosotros 🎉',
  '¿Mesa para esta noche? 🌙',
  '¿Evento especial? ✨',
  'Reserva en segundos ⚡',
  '¡Te esperamos! 👋',
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Soy Cona, tu asistente en Rincón de Alfonso 👋 ¿En qué puedo ayudarte?',
  timestamp: new Date(),
};

const QUICK_REPLIES = [
  { label: 'Reservar una mesa', icon: CalendarCheck, flow: 'reserva' as ChatFlow, text: 'Quiero reservar una mesa' },
  { label: 'Celebrar un evento', icon: PartyPopper, flow: 'evento' as ChatFlow, text: 'Quiero organizar un evento especial' },
];

export default function ChatWidget() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [flow, setFlow]         = useState<ChatFlow>('idle');
  const [datos, setDatos]       = useState<DatosReservaParcial | DatosEventoParcial>({});
  const [bubbleIdx, setBubbleIdx]     = useState(0);
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [bubblesActive, setBubblesActive] = useState(true);
  const isEmbedded = window.self !== window.top;
  const openRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ciclo de bocadillos: cada 5s cambia, para a los 30s
  useEffect(() => {
    if (isEmbedded) {
      window.parent.postMessage({ type: 'chatbot-bubble', active: true, text: BUBBLES[0] }, '*');
    }
    const stop = setTimeout(() => {
      setBubblesActive(false);
      if (isEmbedded) window.parent.postMessage({ type: 'chatbot-bubble', active: false }, '*');
    }, 30000);
    let idx = 0;
    const cycle = setInterval(() => {
      setBubbleVisible(false);
      setTimeout(() => {
        idx = (idx + 1) % BUBBLES.length;
        setBubbleIdx(idx);
        setBubbleVisible(true);
        if (isEmbedded && !openRef.current) window.parent.postMessage({ type: 'chatbot-bubble', active: true, text: BUBBLES[idx] }, '*');
      }, 400);
    }, 5000);
    return () => { clearTimeout(stop); clearInterval(cycle); };
  }, []);

  // Escuchar orden de abrir desde el padre (cuando se clica el bocadillo externo)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'chatbot-open') setOpen(true);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    openRef.current = open;
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
    if (isEmbedded) {
      window.parent.postMessage({ type: 'chatbot-resize', open }, '*');
    }
  }, [open]);

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendMessage(
        messages.filter(m => m.id !== 'welcome'),
        text,
        datos,
      );

      const parsed = extractJson(reply);
      if (parsed) { await handleSubmit(parsed); return; }

      if (flow === 'idle') {
        const lower = reply.toLowerCase() + text.toLowerCase();
        if (/reserva|mesa|cenar|comer/.test(lower)) setFlow('reserva');
        else if (/evento|boda|comuni[oó]n|celebra/.test(lower)) setFlow('evento');
      }

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Lo siento, ha habido un problema de conexión. Por favor, inténtalo de nuevo.',
        timestamp: new Date(),
      }]);
      setFlow('error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(parsed: Record<string, unknown>) {
    try {
      if (parsed.tipo === 'reserva') {
        const reserva: ReservaInsert = {
          nombre:      parsed.nombre as string,
          telefono:    parsed.telefono as string,
          email:       parsed.email as string,
          fecha:       parsed.fecha as string,
          hora:        parsed.hora as string,
          comensales:  parsed.comensales as number,
          detalles: {
            tronas:   parsed.tronas as boolean | undefined,
            alergias: parsed.alergias as string | undefined,
            ocasion:  parsed.ocasion as string | undefined,
            notas:    parsed.notas as string | undefined,
          },
          restaurant_id: RESTAURANT_ID,
        };
        await insertReserva(reserva);
        setFlow('completado');
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `¡Perfecto, ${reserva.nombre}! Tu solicitud para el ${formatFecha(reserva.fecha)} a las ${reserva.hora} para ${reserva.comensales} personas ha sido registrada. Te confirmaremos por email en breve. ¡Hasta pronto! 🍽️`,
          timestamp: new Date(),
        }]);
      } else if (parsed.tipo === 'evento') {
        const lead: LeadEventoInsert = {
          nombre:       parsed.nombre as string,
          telefono:     parsed.telefono as string,
          email:        parsed.email as string,
          tipo_evento:  parsed.tipo_evento as TipoEvento,
          fecha_aprox:  parsed.fecha_aprox as string | undefined,
          invitados_est: parsed.invitados_est as number | undefined,
          tipo_menu:    parsed.tipo_menu as string | undefined,
          contacto_pref: parsed.contacto_pref as ContactoPref,
          notas:        parsed.notas as string | undefined,
          restaurant_id: RESTAURANT_ID,
        };
        await insertLeadEvento(lead);
        setFlow('completado');
        const contacto = lead.contacto_pref === 'llamada' ? 'llamarte' : lead.contacto_pref === 'visita' ? 'agendar una visita' : 'enviarte un presupuesto por email';
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `¡Genial, ${lead.nombre}! Hemos registrado tu interés para tu ${lead.tipo_evento}. Nos pondremos en contacto pronto para ${contacto}. ¡Va a ser una celebración increíble! 🎉`,
          timestamp: new Date(),
        }]);
      }
    } catch (err) {
      console.error('[ChatWidget] Error en handleSubmit:', JSON.stringify(err));
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Ha habido un error al guardar tu solicitud. Por favor, inténtalo de nuevo o llámanos directamente.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  function formatFecha(iso: string) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const showQuickReplies = flow === 'idle' && messages.length === 1 && !loading;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3">

      {/* Panel de chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-[calc(100vw-32px)] max-w-[370px] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            style={{ maxHeight: 'calc(100dvh - 100px)' }}
          >
            {/* Header */}
            <div className="bg-primary px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-inner text-xl">
                  🤖
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm leading-tight">Cona</p>
                  <p className="text-[11px] text-slate-700 leading-tight">Rincón de Alfonso</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-colors"
              >
                <ChevronDown size={18} className="text-slate-900" />
              </button>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-slate-50 min-h-0">
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-slate-900 rounded-br-sm'
                        : 'bg-white text-slate-800 shadow-sm rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {/* Botones rápidos */}
              <AnimatePresence>
                {showQuickReplies && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-2 pt-1"
                  >
                    {QUICK_REPLIES.map(qr => (
                      <button
                        key={qr.flow}
                        onClick={() => { setFlow(qr.flow); handleSend(qr.text); }}
                        className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-primary/30 hover:border-primary hover:bg-primary/5 rounded-2xl text-sm font-semibold text-slate-700 transition-all text-left"
                      >
                        <qr.icon size={18} className="text-primary shrink-0" />
                        {qr.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                    <Loader2 size={16} className="animate-spin text-slate-400" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-100 shrink-0">
              {flow === 'completado' ? (
                <p className="text-center text-xs text-slate-500 py-2">
                  ✅ Solicitud enviada — ¡hasta pronto!
                </p>
              ) : (
                <>
                <p className="text-center text-[10px] text-slate-400 pb-1.5">
                  Al enviar aceptas nuestra{' '}
                  <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
                    Política de privacidad
                  </a>
                </p>
                <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe aquí..."
                    disabled={loading}
                    className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none min-w-0"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading}
                    className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center disabled:opacity-40 hover:bg-primary-dark transition-colors shrink-0"
                  >
                    <Send size={14} className="text-slate-900" />
                  </button>
                </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón flotante con bocadillos */}
      <div className="flex flex-col items-end gap-2">
        <AnimatePresence>
          {!open && bubblesActive && !isEmbedded && (
            <motion.div
              key={bubbleIdx}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: bubbleVisible ? 1 : 0, y: bubbleVisible ? 0 : 8, scale: bubbleVisible ? 1 : 0.9 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="relative bg-white rounded-2xl rounded-br-sm px-4 py-2.5 shadow-lg border border-slate-100 max-w-[200px] cursor-pointer"
              onClick={() => setOpen(true)}
            >
              <p className="text-sm font-semibold text-slate-700 whitespace-nowrap">{BUBBLES[bubbleIdx]}</p>
              {/* Cola del bocadillo */}
              <div className="absolute -bottom-2 right-4 w-3 h-3 bg-white border-r border-b border-slate-100 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setOpen(o => !o)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center hover:bg-primary-dark transition-colors font-black text-slate-900 text-xl"
        >
          <AnimatePresence mode="wait">
            {open
              ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X size={22} className="text-slate-900" />
                </motion.div>
              : <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <MessageCircle size={22} className="text-slate-900" />
                </motion.div>
            }
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
