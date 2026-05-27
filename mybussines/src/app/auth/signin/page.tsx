import { signIn } from 'next-auth/react'
import SignInButton from './SignInButton'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">MyBussines</h1>
        <p className="text-gray-500 text-sm mb-8">
          Gestiona y optimiza tu perfil de<br />Google Business al 100%
        </p>
        <SignInButton />
        <p className="text-xs text-gray-400 mt-6">
          Solo para uso interno. Necesitas acceso a<br />Google Business Profile.
        </p>
      </div>
    </div>
  )
}
