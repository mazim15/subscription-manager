import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Allow all requests to pass through
  return NextResponse.next();
}

export const config = {
  // Keep this to define where middleware runs
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 