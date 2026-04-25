/**
 * Vercel Catch-All API Proxy — master branch
 * Forwards all /api/* from browser → Railway backend (server-to-server, no CORS needed)
 */
const RAILWAY = process.env.RAILWAY_API_URL || 'https://kinetic-app-production.up.railway.app'

export default async function handler(req, res) {
  const targetUrl = `${RAILWAY}${req.url}`

  try {
    const headers = { 'content-type': 'application/json' }
    if (req.headers['authorization']) headers['authorization'] = req.headers['authorization']

    const fetchOptions = { method: req.method, headers }
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    }

    const upstream = await fetch(targetUrl, fetchOptions)
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json')
    res.setHeader('cache-control', 'no-store')
    res.status(upstream.status).send(await upstream.text())
  } catch (err) {
    res.status(502).json({ error: 'proxy_error', message: err.message })
  }
}
