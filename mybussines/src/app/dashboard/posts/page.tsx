import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { GbpPostRow } from '@/types/app'

export const revalidate = 0

const TOPIC_LABELS: Record<string, string> = {
  STANDARD: 'Actualización',
  EVENT: 'Evento',
  OFFER: 'Oferta',
  ALERT: 'Aviso',
}

const TOPIC_COLORS: Record<string, string> = {
  STANDARD: 'bg-blue-100 text-blue-700',
  EVENT: 'bg-purple-100 text-purple-700',
  OFFER: 'bg-green-100 text-green-700',
  ALERT: 'bg-red-100 text-red-700',
}

export default async function PostsPage() {
  const session = await getServerSession(authOptions)
  const userId = session!.user!.email!
  const supabase = createServerClient()

  const { data: posts } = await supabase
    .from('gbp_posts')
    .select('*')
    .eq('user_id', userId)
    .order('create_time', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Google Posts</h1>
          <p className="text-sm text-gray-400 mt-0.5">{posts?.length ?? 0} posts</p>
        </div>
        <Link
          href="/dashboard/posts/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo post
        </Link>
      </div>

      {!posts?.length && (
        <div className="text-center py-16 text-gray-400">
          <p>No hay posts todavía.</p>
          <Link href="/dashboard/posts/new" className="text-sm text-blue-600 hover:underline mt-2 block">
            Crear primer post
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {(posts ?? []).map((post: GbpPostRow) => (
          <div key={post.post_id} className="rounded-xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TOPIC_COLORS[post.topic_type]}`}>
                    {TOPIC_LABELS[post.topic_type]}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(post.create_time)}</span>
                </div>
                <p className="text-sm text-gray-800 line-clamp-3">{post.summary}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
