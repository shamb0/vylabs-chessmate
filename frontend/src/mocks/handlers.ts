// src/mocks/handlers.ts - Common fixes for TypeError

import { http, HttpResponse } from 'msw'

export const handlers = [
  // ✅ Correct MSW v2 syntax
  http.get('/api/backend/health', () => {
    return HttpResponse.json({ status: 'ok' })
  }),
  
  // ✅ Correct: Always return HttpResponse
  http.post('/api/data', () => {
    return HttpResponse.json({ success: true })
  }),
  
  // ✅ Correct: Properly handle request body
  http.post('/api/submit', async ({ request }) => {
    const body = await request.json() // Await the promise
    return HttpResponse.json({ received: body })
  }),
  
  // ✅ Correct: Return error response
  http.get('/api/error', () => {
    return new HttpResponse(null, { status: 500 })
  }),
]
