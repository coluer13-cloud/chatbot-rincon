import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

async function refreshAccessToken(token: Record<string, unknown>) {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token as string,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw data
    return {
      ...token,
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      refresh_token: data.refresh_token ?? token.refresh_token,
    }
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/business.manage',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
        }
      }
      if (Date.now() < (token.expires_at as number) * 1000) return token
      return refreshAccessToken(token as Record<string, unknown>)
    },
    async session({ session, token }) {
      return {
        ...session,
        access_token: token.access_token as string,
        error: token.error as string | undefined,
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}
