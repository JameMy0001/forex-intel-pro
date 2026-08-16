import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_SECRET_SALT = 'nexus_secure_auth_token_salt_2026';

function isSessionValid(token: string | undefined | null): boolean {
  if (!token) return false;
  try {
    // In Edge middleware, atob is available in standard Web API
    const decoded = atob(token);
    const [timestampStr, salt] = decoded.split(':');
    if (salt !== SESSION_SECRET_SALT) return false;

    const timestamp = Number(timestampStr);
    if (isNaN(timestamp)) return false;

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - timestamp < thirtyDaysMs;
  } catch (err) {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('nexus_session')?.value;
  const isAuthenticated = isSessionValid(sessionCookie);

  // If user is already authenticated and visits /login, redirect to /dashboard
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Allow public API and webhook routes
  if (
    pathname.startsWith('/api/telegram') ||
    pathname.startsWith('/api/ingestion') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Protect all UI routes
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
