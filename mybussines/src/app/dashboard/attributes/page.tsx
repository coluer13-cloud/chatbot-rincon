import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { createServerClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import type { GbpQuestionRow, GbpAttributeRow } from '@/types/app'

export const revalidate = 0

export default async function AttributesPage() {
  const session = await getServerSession(authOptions)
  const userId = session!.user!.email!
  const supabase = createServerClient()

  const [{ data: attributes }, { data: questions }] = await Promise.all([
    supabase.from('gbp_attributes').select('*').eq('user_id', userId).single(),
    supabase.from('gbp_questions').select('*').eq('user_id', userId).order('upvote_count', { ascending: false }),
  ])

  const attrList = (attributes?.attributes ?? []) as Record<string, unknown>[]
  const questionList = (questions ?? []) as GbpQuestionRow[]
  const unanswered = questionList.filter(q => !q.answer_text).length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Atributos y Preguntas</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gestiona atributos del negocio y responde preguntas de clientes</p>
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Atributos del negocio</h2>
          <span className="text-xs text-gray-400">{attrList.length} configurados</span>
        </div>
        {!attrList.length ? (
          <p className="text-sm text-gray-400">Sin atributos configurados. Sincroniza primero.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {attrList.slice(0, 20).map((attr, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <span className="truncate">{String(attr.name ?? '').replace(/^attributes\//, '')}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4">
          Para editar atributos, hazlo directamente en Google Business Profile y luego sincroniza.
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Preguntas de clientes (Q&A)</h2>
          {unanswered > 0 && (
            <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
              {unanswered} sin responder
            </span>
          )}
        </div>

        {!questionList.length ? (
          <p className="text-sm text-gray-400">Sin preguntas todavía. Sincroniza para cargar las preguntas.</p>
        ) : (
          <div className="space-y-4">
            {questionList.map(q => (
              <div key={q.question_id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{q.question_text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(q.create_time)} · {q.upvote_count} votos
                    </p>
                    {q.answer_text ? (
                      <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-700 mb-1">Tu respuesta</p>
                        <p className="text-sm text-blue-900">{q.answer_text}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-orange-600 mt-2 font-medium">Sin respuesta</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4">
          Para responder preguntas, hazlo directamente en Google Business Profile y luego sincroniza.
        </p>
      </div>
    </div>
  )
}
