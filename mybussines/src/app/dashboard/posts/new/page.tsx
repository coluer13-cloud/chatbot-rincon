'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type TopicType = 'STANDARD' | 'EVENT' | 'OFFER'

export default function NewPostPage() {
  const [topicType, setTopicType] = useState<TopicType>('STANDARD')
  const [summary, setSummary] = useState('')
  const [callToActionType, setCallToActionType] = useState('LEARN_MORE')
  const [callToActionUrl, setCallToActionUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { topicType, summary, languageCode: 'es' }
      if (callToActionUrl) {
        body.callToAction = { actionType: callToActionType, url: callToActionUrl }
      }
      const res = await fetch('/api/gbp/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        router.push('/dashboard/posts')
        router.refresh()
      } else {
        const { error } = await res.json()
        alert(`Error: ${error}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Crear nuevo post</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de post</label>
          <div className="flex gap-3">
            {(['STANDARD', 'EVENT', 'OFFER'] as TopicType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTopicType(t)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  topicType === t
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t === 'STANDARD' ? 'Actualización' : t === 'EVENT' ? 'Evento' : 'Oferta'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contenido del post</label>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            required
            rows={5}
            maxLength={1500}
            placeholder="Escribe el contenido de tu post..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">{summary.length}/1500 caracteres</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Botón de acción (opcional)</label>
          <div className="flex gap-2">
            <select
              value={callToActionType}
              onChange={e => setCallToActionType(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LEARN_MORE">Más información</option>
              <option value="BOOK">Reservar</option>
              <option value="ORDER">Pedir</option>
              <option value="SHOP">Comprar</option>
              <option value="SIGN_UP">Registrarse</option>
              <option value="CALL">Llamar</option>
            </select>
            <input
              type="url"
              value={callToActionUrl}
              onChange={e => setCallToActionUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !summary.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? 'Publicando…' : 'Publicar post'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
