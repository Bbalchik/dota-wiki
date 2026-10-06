import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, COOKIE_NAME, ACTIVE_ACCOUNT_COOKIE } from '@/lib/session';

export async function GET(request: NextRequest) {
  // If request is a Next.js prefetch or browser prefetch, DO NOT log out!
  const isPrefetch =
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('sec-purpose') === 'prefetch' ||
    request.headers.get('x-purpose') === 'prefetch' ||
    request.headers.has('next-router-prefetch');

  if (isPrefetch) {
    return new NextResponse(null, { status: 204 });
  }

  await deleteSession();
  const res = NextResponse.redirect(new URL('/', request.url));
  res.cookies.delete(COOKIE_NAME);
  res.cookies.delete(ACTIVE_ACCOUNT_COOKIE);
  return res;
}

export async function POST(request: NextRequest) {
  await deleteSession();
  const res = NextResponse.redirect(new URL('/', request.url));
  res.cookies.delete(COOKIE_NAME);
  res.cookies.delete(ACTIVE_ACCOUNT_COOKIE);
  return res;
}
