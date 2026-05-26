'use client'

import Link from 'next/link'
import type { Recommendation } from '@/types/app'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
}

interface RecommendationListProps {
  recommendations: Recommendation[]
  limit?: number
}

export function RecommendationList({ recommendations, limit = 5 }: RecommendationListProps) {
  const items = recommendations.slice(0, limit)

  if (!items.length) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-green-700 font-semibold text-lg">¡Perfil al 100%!</p>
        <p className="text-green-600 text-sm mt-1">Tu perfil de Google Business está completamente optimizado.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map(rec => (
        <li key={rec.id} className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[rec.priority]}`}>
                {PRIORITY_LABELS[rec.priority]}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">+{rec.pointsGain} pts</span>
            </div>
            <p className="font-medium text-gray-900 text-sm">{rec.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{rec.description}</p>
          </div>
          <Link
            href={rec.actionPath}
            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {rec.actionLabel}
          </Link>
        </li>
      ))}
    </ul>
  )
}
