export type EstadoReserva = 'pendiente' | 'confirmada' | 'rechazada';
export type EstadoLead = 'nuevo' | 'en_contacto' | 'presupuesto_enviado' | 'cerrado';
export type TipoEvento = 'boda' | 'comunion' | 'bautizo' | 'cumpleanos' | 'corporativo' | 'otro';
export type ContactoPref = 'llamada' | 'email' | 'visita';

export interface ReservaInsert {
  nombre: string;
  telefono: string;
  email: string;
  fecha: string;       // ISO date: "2026-10-15"
  hora: string;        // "21:00"
  comensales: number;
  detalles: {
    tronas?: boolean;
    alergias?: string;
    ocasion?: string;
    notas?: string;
  };
  conversacion?: { role: 'user' | 'assistant'; content: string }[];
  restaurant_id: string;
}

export interface LeadEventoInsert {
  nombre: string;
  telefono: string;
  email: string;
  tipo_evento: TipoEvento;
  fecha_aprox?: string;
  invitados_est?: number;
  tipo_menu?: string;
  contacto_pref: ContactoPref;
  notas?: string;
  conversacion?: { role: 'user' | 'assistant'; content: string }[];
  restaurant_id: string;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
}

export type ChatFlow = 'idle' | 'reserva' | 'evento' | 'completado' | 'error';

// Datos extraídos parcialmente durante la conversación
export interface DatosReservaParcial {
  nombre?: string;
  telefono?: string;
  email?: string;
  fecha?: string;
  hora?: string;
  comensales?: number;
  tronas?: boolean;
  alergias?: string;
  ocasion?: string;
  notas?: string;
}

export interface DatosEventoParcial {
  nombre?: string;
  telefono?: string;
  email?: string;
  tipo_evento?: TipoEvento;
  fecha_aprox?: string;
  invitados_est?: number;
  tipo_menu?: string;
  contacto_pref?: ContactoPref;
  notas?: string;
}
