import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const apiUrl = process.env.API_INTERNAL_URL;
  if (!apiUrl) {
    throw new Error('API_INTERNAL_URL não está definida.');
  }

  const { pathname, search } = request.nextUrl;
  const apiPath = pathname.replace(/^\/api/, '');
  return NextResponse.rewrite(new URL(`${apiPath}${search}`, apiUrl));
}

export const config = {
  matcher: '/api/:path*',
};
