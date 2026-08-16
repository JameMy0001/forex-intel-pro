import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/authHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('nexus_session');
  const isAuthenticated = verifySessionToken(sessionCookie?.value);

  return NextResponse.json({
    authenticated: isAuthenticated,
  });
}
