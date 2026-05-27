'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BusinessProfileRow } from '@/types/app'

export function ProfileForm({ profile }: { profile: BusinessProfileRow }) {
  const [name, setName] = useState(profile.name ?? '')
  const [description, setDescription] = useState(profile.description ?? '')
  const [website, setWebsite] = useState(profile.website_uri ?? '')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const descColor = description.length >= 150 ? 'text-green-600' : 'text-gray-400'

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/gbp/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, websiteUri: website }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        const { error } = await res.json()
        alert(`Error: ${error}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const address = profile.address as Record<string, unknown>
  const phone = profile.phone_numbers as Record<string, unknown>

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-700">Información básica</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del negocio</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción del negocio
            <span className={`ml-2 text-xs font-normal ${descColor}`}>
              {description.length}/1000 {description.length >= 150 ? '✓' : '(mínimo 150 para el score)'}
            </span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={5}
            maxLength={1000}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sitio web</label>
          <input
            type="url"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            placeholder="https://"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Datos de contacto y ubicación</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Teléfono principal</p>
            <p className="text-gray-800">{(phone?.primaryPhone as string) ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Categoría principal</p>
            <p className="text-gray-800">{profile.primary_category ?? '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-medium text-gray-500 mb-1">Dirección</p>
            <p className="text-gray-800">
              {(address?.addressLines as string[])?.join(', ') ?? '—'}
              {address?.locality ? `, ${address.locality}` : ''}
              {address?.postalCode ? ` ${address.postalCode}` : ''}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Para modificar teléfono, dirección y categoría, hazlo directamente en Google Business Profile
          y luego sincroniza.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
