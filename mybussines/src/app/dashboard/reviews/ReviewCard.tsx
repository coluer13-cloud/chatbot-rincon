'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import type { GbpReviewRow } from '@/types/app'
import { formatDate, starRatingToNumber } from '@/lib/utils'

const STAR_MAP: Record<string, string> = {
  ONE: '★', TWO: '★★', THREE: '★★★', FOUR: '★★★★', FIVE: '★★★★★',
}

export function ReviewCard({ review }: { review: GbpReviewRow }) {
  const [reply, setReply] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  const reviewer = review.reviewer as Record<string, string>
  const stars = starRatingToNumber(review.star_rating)
  const reviewId = review.review_id.split('/').pop()

  async function handleReply() {
    if (!reply.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/gbp/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: reply }),
      })
      if (res.ok) {
        router.refresh()
        setShowForm(false)
        setReply('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0 flex items-center justify-center text-sm font-bold text-gray-500">
          {reviewer.displayName?.[0] ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm">
              {reviewer.isAnonymous ? 'Usuario anónimo' : reviewer.displayName}
            </span>
            <span className="text-yellow-400 text-xs">{STAR_MAP[review.star_rating]}</span>
          </div>
          <p className="text-xs text-gray-400">{formatDate(review.create_time)}</p>
          {review.comment && (
            <p className="text-sm text-gray-700 mt-2">{review.comment}</p>
          )}

          {review.reply_comment ? (
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">Tu respuesta</p>
              <p className="text-sm text-blue-900">{review.reply_comment}</p>
            </div>
          ) : (
            <div className="mt-3">
              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Responder reseña
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Escribe tu respuesta..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReply}
                      disabled={submitting || !reply.trim()}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {submitting ? 'Enviando…' : 'Enviar respuesta'}
                    </button>
                    <button
                      onClick={() => { setShowForm(false); setReply('') }}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
