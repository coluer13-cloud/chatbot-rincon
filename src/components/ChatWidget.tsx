import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import type {
  ChatMessage, ChatFlow,
  DatosReservaParcial, DatosEventoParcial,
  ReservaInsert, LeadEventoInsert,
  TipoEvento, ContactoPref,
} from '@/src/types';
import { sendMessage, extractJson } from '@/src/lib/openai';
import { insertReserva, insertLeadEvento } from '@/src/lib/supabase';

const RESTAURANT_ID = import.meta.env.VITE_RESTAURANT_ID as string;

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Soy Rincón, el asistente de Rincón de Alfonso 👋 ¿En qué puedo ayudarte hoy? Puedo gestionar tu reserva de mesa o ayudarte a organizar un evento especial.',
  timestamp: new Date(),
};

export default function ChatWidget() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [flow, setFlow]       = useState<ChatFlow>('idle');
  const [datos, setDatos]     = useState<DatosReservaParcial | DatosEventoParcial>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
    if (window.self !== window.top) {
      window.parent.postMessage({ type: 'chatbot-resize', open }, '*');
    }
  }, [open]);

  async function handleSend() {
    const text = input.trim();
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

      if (parsed) {
        await handleSubmit(parsed);
        return;
      }

      // Actualizar flujo según respuesta
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
          content: `¡Perfecto, ${reserva.nombre}! Tu solicitud de reserva para el ${formatFecha(reserva.fecha)} a las ${reserva.hora} para ${reserva.comensales} personas ha sido registrada. Recibirás la confirmación por email en breve. ¡Nos vemos pronto! 🍽️`,
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
        const contacto = lead.contacto_pref === 'llamada'
          ? 'llamarte'
          : lead.contacto_pref === 'visita'
          ? 'agendar una visita contigo'
          : 'enviarte un presupuesto por email';
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `¡Genial, ${lead.nombre}! Hemos registrado tu interés para organizar tu ${lead.tipo_evento}. Nuestro equipo se pondrá en contacto contigo pronto para ${contacto}. ¡Va a ser una celebración increíble! 🎉`,
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

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Panel de chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-[360px] max-h-[560px] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            {/* Header */}
            <div className="bg-primary px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
                  🍽️
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Rincón de Alfonso</p>
                  <p className="text-xs text-slate-700">Reservas y Eventos</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-colors"
              >
                <X size={16} className="text-slate-900" />
              </button>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-slate-50">
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-slate-900 rounded-br-sm'
                        : 'bg-white text-slate-800 shadow-sm rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

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
            <div className="p-3 bg-white border-t border-slate-100">
              {flow === 'completado' ? (
                <p className="text-center text-xs text-slate-500 py-2">
                  ✅ Solicitud enviada — ¡hasta pronto!
                </p>
              ) : (
                <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe aquí..."
                    disabled={loading}
                    className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center disabled:opacity-40 hover:bg-primary-dark transition-colors"
                  >
                    <Send size={14} className="text-slate-900" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón flotante */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center hover:bg-primary-dark transition-colors"
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
  );
}
