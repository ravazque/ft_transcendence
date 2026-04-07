// Health endpoint — used by Docker healthcheck
export default defineEventHandler(() => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})
