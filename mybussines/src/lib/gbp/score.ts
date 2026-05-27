import type {
  ScoreResult,
  ScoreCategory,
  ScoreCheck,
  Recommendation,
  BusinessProfileRow,
  GbpPhotoRow,
  GbpPostRow,
  GbpReviewRow,
  GbpQuestionRow,
  GbpServiceRow,
  GbpAttributeRow,
} from '@/types/app'

const STAR_MAP: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
}

function check(
  id: string,
  label: string,
  description: string,
  maxPoints: number,
  passed: boolean,
  priority: ScoreCheck['priority'],
  actionPath?: string,
  actionLabel?: string,
): ScoreCheck {
  return {
    id,
    label,
    description,
    maxPoints,
    earnedPoints: passed ? maxPoints : 0,
    passed,
    priority,
    actionPath,
    actionLabel,
  }
}

export function calculateScore(data: {
  profile: BusinessProfileRow | null
  photos: GbpPhotoRow[]
  posts: GbpPostRow[]
  reviews: GbpReviewRow[]
  questions: GbpQuestionRow[]
  services: GbpServiceRow[]
  attributes: GbpAttributeRow | null
}): ScoreResult {
  const { profile, photos, posts, reviews, questions, services, attributes } = data

  const categories: ScoreCategory[] = [
    {
      id: 'info',
      label: 'Información del negocio',
      emoji: '🏪',
      maxPoints: 25,
      earnedPoints: 0,
      checks: [
        check('name', 'Nombre del negocio', 'Añade el nombre oficial del negocio', 3, !!profile?.name, 'critical', '/dashboard/profile', 'Editar perfil'),
        check('category', 'Categoría principal', 'Selecciona la categoría que mejor describe tu negocio', 5, !!profile?.primary_category, 'critical', '/dashboard/profile', 'Editar perfil'),
        check('description', 'Descripción larga (>150 caracteres)', 'Escribe una descripción detallada de tu negocio con al menos 150 caracteres', 5, (profile?.description?.length ?? 0) > 150, 'high', '/dashboard/profile', 'Editar descripción'),
        check('website', 'Sitio web', 'Añade la URL de tu sitio web', 4, !!profile?.website_uri, 'high', '/dashboard/profile', 'Añadir web'),
        check('phone', 'Teléfono', 'Añade un número de teléfono principal', 3, !!(profile?.phone_numbers as Record<string, unknown>)?.primaryPhone, 'high', '/dashboard/profile', 'Añadir teléfono'),
        check('address', 'Dirección completa', 'Añade la dirección física completa', 3, !!((profile?.address as Record<string, unknown>)?.addressLines), 'critical', '/dashboard/profile', 'Añadir dirección'),
        check('short_desc', 'Descripción corta', 'Añade una descripción corta del negocio', 2, !!profile?.short_description, 'medium', '/dashboard/profile', 'Editar perfil'),
      ],
    },
    {
      id: 'hours',
      label: 'Horarios de apertura',
      emoji: '🕐',
      maxPoints: 10,
      earnedPoints: 0,
      checks: [
        check('regular_hours', 'Horario semanal configurado', 'Define los horarios de apertura para cada día de la semana', 7, (profile?.regular_hours as unknown[])?.length > 0, 'critical', '/dashboard/profile', 'Configurar horario'),
        check('special_hours', 'Horarios especiales/festivos', 'Añade horarios para días festivos y vacaciones', 3, (profile?.special_hours as unknown[])?.length > 0, 'medium', '/dashboard/profile', 'Añadir festivos'),
      ],
    },
    {
      id: 'photos',
      label: 'Fotos',
      emoji: '📸',
      maxPoints: 20,
      earnedPoints: 0,
      checks: [
        check('cover_photo', 'Foto de portada', 'Sube una foto de portada atractiva de tu negocio', 5, photos.some(p => p.category === 'COVER'), 'critical', '/dashboard/photos', 'Añadir portada'),
        check('logo', 'Logotipo', 'Sube el logotipo de tu negocio', 5, photos.some(p => p.category === 'LOGO' || p.category === 'PROFILE'), 'critical', '/dashboard/photos', 'Añadir logo'),
        check('interior_photos', 'Al menos 5 fotos de interior', 'Muestra el interior de tu negocio con al menos 5 fotos', 4, photos.filter(p => p.category === 'INTERIOR').length >= 5, 'high', '/dashboard/photos', 'Añadir interiores'),
        check('exterior_photos', 'Al menos 3 fotos de exterior', 'Añade fotos del exterior para que los clientes te encuentren fácilmente', 3, photos.filter(p => p.category === 'EXTERIOR').length >= 3, 'high', '/dashboard/photos', 'Añadir exteriores'),
        check('extra_photos', 'Fotos adicionales (equipo/producto)', 'Añade fotos del equipo, productos o servicios', 3, photos.some(p => ['TEAMS', 'PRODUCT', 'AT_WORK', 'FOOD_AND_DRINK'].includes(p.category)), 'medium', '/dashboard/photos', 'Añadir fotos'),
      ],
    },
    {
      id: 'posts',
      label: 'Google Posts',
      emoji: '📝',
      maxPoints: 15,
      earnedPoints: 0,
      checks: [
        check(
          'recent_post_7d',
          'Post en los últimos 7 días',
          'Publica una actualización esta semana para mostrar actividad reciente',
          8,
          posts.some(p => {
            const d = p.create_time ? new Date(p.create_time) : null
            return d ? Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000 : false
          }),
          'high',
          '/dashboard/posts/new',
          'Crear post',
        ),
        check(
          'recent_post_30d',
          'Post en los últimos 30 días',
          'Mantén tu perfil activo publicando actualizaciones regularmente',
          4,
          posts.some(p => {
            const d = p.create_time ? new Date(p.create_time) : null
            return d ? Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000 : false
          }),
          'high',
          '/dashboard/posts/new',
          'Crear post',
        ),
        check('offer_or_event', 'Ha usado tipo Oferta o Evento', 'Crea posts de tipo oferta o evento para atraer más clientes', 3, posts.some(p => p.topic_type === 'OFFER' || p.topic_type === 'EVENT'), 'medium', '/dashboard/posts/new', 'Crear oferta'),
      ],
    },
    {
      id: 'reviews',
      label: 'Reseñas',
      emoji: '⭐',
      maxPoints: 10,
      earnedPoints: 0,
      checks: [
        check('review_count', 'Al menos 10 reseñas', 'Solicita reseñas a tus clientes satisfechos para generar confianza', 3, reviews.length >= 10, 'high', '/dashboard/reviews', 'Ver reseñas'),
        check(
          'reply_rate',
          'Tasa de respuesta ≥ 90%',
          'Responde a todas las reseñas, especialmente las negativas, para mejorar tu reputación',
          5,
          reviews.length > 0
            ? reviews.filter(r => r.reply_comment).length / reviews.length >= 0.9
            : false,
          'critical',
          '/dashboard/reviews',
          'Responder reseñas',
        ),
        check(
          'avg_rating',
          'Valoración media ≥ 4.0',
          'Trabaja en mejorar la experiencia del cliente para subir la valoración media',
          2,
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + (STAR_MAP[r.star_rating] ?? 0), 0) / reviews.length >= 4.0
            : false,
          'medium',
          '/dashboard/reviews',
          'Ver reseñas',
        ),
      ],
    },
    {
      id: 'qa',
      label: 'Preguntas y respuestas',
      emoji: '❓',
      maxPoints: 5,
      earnedPoints: 0,
      checks: [
        check('has_answers', 'Al menos 1 pregunta respondida', 'Responde las preguntas de tus clientes para generar confianza', 3, questions.some(q => !!q.answer_text), 'medium', '/dashboard/attributes', 'Responder preguntas'),
        check('all_answered', 'Todas las preguntas respondidas', 'Asegúrate de responder todas las preguntas pendientes', 2, questions.length > 0 && questions.every(q => !!q.answer_text), 'medium', '/dashboard/attributes', 'Responder preguntas'),
      ],
    },
    {
      id: 'services',
      label: 'Productos y servicios',
      emoji: '🛍️',
      maxPoints: 10,
      earnedPoints: 0,
      checks: [
        check('service_count', 'Al menos 3 servicios listados', 'Añade tus principales productos o servicios para que los clientes sepan qué ofreces', 5, services.length >= 3, 'high', '/dashboard/profile', 'Añadir servicios'),
        check('service_descriptions', 'Servicios con descripción', 'Añade descripciones a todos tus servicios para mejorar el posicionamiento', 5, services.length > 0 && services.every(s => !!s.description), 'medium', '/dashboard/profile', 'Editar servicios'),
      ],
    },
    {
      id: 'attributes',
      label: 'Atributos del negocio',
      emoji: '🏷️',
      maxPoints: 5,
      earnedPoints: 0,
      checks: [
        check('attr_count', 'Al menos 5 atributos configurados', 'Completa los atributos del negocio: accesibilidad, pagos, servicios, etc.', 3, (attributes?.attributes as unknown[])?.length >= 5, 'medium', '/dashboard/attributes', 'Configurar atributos'),
        check('payment_methods', 'Métodos de pago configurados', 'Indica qué métodos de pago aceptas en tu negocio', 2, (attributes?.attributes as Record<string, unknown>[])?.some(a => String(a.name ?? '').toLowerCase().includes('pay')), 'medium', '/dashboard/attributes', 'Configurar atributos'),
      ],
    },
  ]

  for (const cat of categories) {
    cat.earnedPoints = cat.checks.reduce((s, c) => s + c.earnedPoints, 0)
  }

  const totalScore = categories.reduce((s, c) => s + c.earnedPoints, 0)

  const recommendations: Recommendation[] = categories
    .flatMap(cat =>
      cat.checks
        .filter(c => !c.passed)
        .map(c => ({
          id: c.id,
          title: c.label,
          description: c.description,
          pointsGain: c.maxPoints,
          priority: c.priority,
          actionPath: c.actionPath ?? '/dashboard',
          actionLabel: c.actionLabel ?? 'Ir',
        })),
    )
    .sort((a, b) => {
      const pMap: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
      const pDiff = (pMap[b.priority] ?? 0) - (pMap[a.priority] ?? 0)
      return pDiff !== 0 ? pDiff : b.pointsGain - a.pointsGain
    })

  return {
    totalScore,
    maxScore: 100,
    percentage: totalScore,
    categories,
    recommendations,
  }
}
