import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { defineConfig, type Connect, type Plugin } from 'vite'

const CATALOG_PATH = '/catalog/v1/items/suggest'
const CATALOG_ORIGIN = 'https://tablearchive.dev'
const MAX_QUERY = 80
const MAX_BODY = 256 * 1024

function catalogSuggest(
  req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction,
) {
  const requestUrl = req.url ?? ''
  const incoming = new URL(requestUrl, 'http://localhost')
  if (incoming.pathname !== CATALOG_PATH) {
    next()
    return
  }
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET')
    res.end()
    return
  }

  const query = (incoming.searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY)
  const requested = Number(incoming.searchParams.get('limit'))
  const limit = Math.min(20, Math.max(1, Number.isFinite(requested) ? requested : 8))
  const target = new URL('/v1/items/suggest', CATALOG_ORIGIN)
  target.searchParams.set('q', query)
  target.searchParams.set('limit', String(Math.trunc(limit)))

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  void fetch(target, { signal: controller.signal, redirect: 'manual' })
    .then(async (response) => {
      const text = response.status === 200 ? await response.text() : ''
      res.statusCode = response.status === 200 && text.length <= MAX_BODY ? 200 : 502
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(res.statusCode === 200 ? text : JSON.stringify({ items: [] }))
    })
    .catch(() => {
      if (res.writableEnded) return
      res.statusCode = 502
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ items: [] }))
    })
    .finally(() => clearTimeout(timer))
}

function catalogPlugin(): Plugin {
  return {
    name: 'catalog-suggest',
    configureServer(server) {
      server.middlewares.use(catalogSuggest)
    },
    configurePreviewServer(server) {
      server.middlewares.use(catalogSuggest)
    },
  }
}

export default defineConfig({
  plugins: [react(), catalogPlugin()],
})
