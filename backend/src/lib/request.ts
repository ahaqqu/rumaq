/**
 * Determine the public-facing origin of a request, honouring proxy headers.
 *
 * Cloudflare Workers receive the real scheme/host via `request.url`. When running
 * behind a reverse proxy locally, the Worker sees the proxy's internal URL, so
 * we reconstruct the original origin from standard X-Forwarded-* headers.
 *
 * Security note: this helper is only used for auth redirect URI construction.
 * In production, Cloudflare does not allow clients to set X-Forwarded-Host, so
 * the fallback to `request.url` always wins. The local Docker test stack
 * controls these headers via its reverse proxy.
 */
export function getRequestOrigin(c: {
  req: { url: string; header: (name: string) => string | undefined }
}): string {
  const url = new URL(c.req.url)

  const forwardedProto = c.req.header('X-Forwarded-Proto')
  const forwardedHost = c.req.header('X-Forwarded-Host')
  const forwardedPort = c.req.header('X-Forwarded-Port')

  if (forwardedHost) {
    const proto = forwardedProto || url.protocol.replace(':', '')
    const port = forwardedPort || (forwardedHost.includes(':') ? '' : url.port)
    const hostPort = port ? `${forwardedHost}:${port}` : forwardedHost
    return `${proto}://${hostPort}`
  }

  return url.origin
}
