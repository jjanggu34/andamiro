/* Vercel serverless — Anthropic Messages API proxy
   Vercel > Settings > Environment Variables 등록 필요:
     ANTHROPIC_API_KEY, SUPABASE_JWT_SECRET, ALLOWED_ORIGIN */
const jwt = require('jsonwebtoken')

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 512

const ALLOWED_ORIGINS = [
  process.env.ALLOWED_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
].filter(Boolean)

module.exports = async (req, res) => {
  const origin = req.headers.origin ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin ?? '')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method Not Allowed' }); return }

  // 1. JWT 로컬 검증 — Supabase 네트워크 왕복 없이 즉시 인증
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim()
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }

  try {
    jwt.verify(token, process.env.SUPABASE_JWT_SECRET)
  } catch {
    res.status(401).json({ error: 'Unauthorized' }); return
  }

  // 2. 요청 파싱
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(500).json({ error: 'Server API key not configured' }); return }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' }); return
  }

  const { system, messages } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Invalid messages' }); return
  }

  // 3. Anthropic 호출 — model·max_tokens는 클라이언트 값 무시하고 서버에서 고정
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system, messages }),
    })
    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', message: err.message })
  }
}
