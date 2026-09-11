import type { NextRequest } from 'next/server';
import { getBackendUrl } from '@/lib/backend-url';

// Same-origin API proxy: the browser calls /api/… on this Next server and this
// handler forwards it to the backend. Replaces the old next.config.ts
// `rewrites()` — rewrites are evaluated at BUILD time, so a published image had
// `http://localhost:4300` baked in and every /api call 500'd in production (the
// backend never saw the request). A route handler reads BACKEND_URL at runtime,
// which is the mokara/jejak-athlete design: one image serves any host.
//
// Why the browser never calls the backend directly:
//   - the rb_session cookie is host-only, but pointing the browser at a second
//     origin reintroduces cross-origin cookie headaches for no benefit;
//   - the API origin would have to be a NEXT_PUBLIC_* value, i.e. baked into
//     the bundle at build time;
//   - CORS config becomes someone's problem for no benefit.
//
// nodejs runtime, and force-dynamic: a proxy result is per-request by
// definition, and caching an authenticated response would leak it between users.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Hop-by-hop and per-hop headers that must not be forwarded in either
// direction. `content-length` in particular: on a proxied request whose body
// Next has already buffered, the value upstream computes will not match what we
// send, and `content-encoding` on the way back would be re-declared after we
// already decompressed it.
const REQUEST_HEADERS_TO_REMOVE = [
  'accept-encoding',
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
];

const RESPONSE_HEADERS_TO_REMOVE = [
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
];

/**
 * `Set-Cookie` is handled apart from the rest. Headers.get() collapses multiple
 * values into one comma-joined string, which the browser reads as a single
 * (broken) cookie — and login sets exactly one rb_session cookie (plus a
 * cleared variant on logout). getSetCookie() keeps them separate and append()
 * re-emits each.
 */
function copyResponseHeaders(upstream: Response): Headers {
  const headers = new Headers(upstream.headers);
  const setCookies = upstream.headers.getSetCookie();

  for (const name of RESPONSE_HEADERS_TO_REMOVE) headers.delete(name);
  headers.delete('set-cookie');
  for (const cookie of setCookies) headers.append('set-cookie', cookie);

  return headers;
}

async function proxy(request: NextRequest): Promise<Response> {
  let backendUrl: string;
  try {
    backendUrl = getBackendUrl();
  } catch {
    // Misconfiguration, not an outage: answer 503 and keep the detail in the
    // server log rather than shipping a stack trace to the browser.
    console.error('[proxy] BACKEND_URL is not configured');
    return Response.json(
      { error: 'api_misconfigured', message: 'API proxy is not configured' },
      { status: 503 },
    );
  }

  // Path is forwarded unchanged: the backend mounts its routes under /api too,
  // so /api/auth/login → ${BACKEND_URL}/api/auth/login.
  const target = new URL(`${backendUrl}${request.nextUrl.pathname}${request.nextUrl.search}`);
  const headers = new Headers(request.headers);
  for (const name of REQUEST_HEADERS_TO_REMOVE) headers.delete(name);

  const body = request.body ? await request.arrayBuffer() : undefined;

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      // Manual, or a 3xx from the backend would be followed here and the browser
      // would never see the redirect it was actually told about.
      redirect: 'manual',
      cache: 'no-store',
      // Client disconnects mid-request must cancel the upstream call too.
      signal: request.signal,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: copyResponseHeaders(upstream),
    });
  } catch (err) {
    // The browser needs a JSON error shaped like every other failure (the API's
    // own envelope contract), not an HTML 502 page.
    console.error(`[proxy] ${request.method} ${target.pathname} → backend unreachable:`, err);
    return Response.json(
      { error: 'network_error', message: 'Backend unavailable' },
      { status: 502 },
    );
  }
}

// Every method forwards through the same handler. OPTIONS matters because the
// backend's CORS middleware answers preflight with a bare 204 — harmless to
// proxy, and skipping it would make the browser's preflight hit a 405 here.
export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
