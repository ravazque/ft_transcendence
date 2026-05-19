// GET /api/v1/docs
//
// Minimal OpenAPI 3.1 description of the public API. Served as JSON
// so it can be piped into tools like Swagger UI or redoc-cli. The
// schema is hand-maintained — keep it in sync with the handlers
// under server/api/v1/.
export default defineEventHandler(() => {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Yoga Platform Public API',
      version: '1.0.0',
      description:
        'Read-only access to the public catalogue and curated reviews. ' +
        'Write operations require an X-API-Key header. All endpoints ' +
        'are rate-limited per IP.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
      schemas: {
        Locale: { type: 'string', enum: ['en_en', 'es_es', 'fr_fr'] },
        ModuleSummary: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            slug: { type: 'string' },
            title: { type: 'string' },
            shortDescription: { type: 'string' },
            cover: { type: 'string', nullable: true },
            price: { type: 'string', description: 'Decimal as string (cents/100)' },
            isFullCourse: { type: 'boolean' },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            locale: { $ref: '#/components/schemas/Locale' },
            name: { type: 'string' },
            title: { type: 'string' },
            imageUrl: { type: 'string', format: 'uri' },
            description: { type: 'string' },
          },
        },
        ReviewInput: {
          type: 'object',
          required: ['locale', 'name', 'title', 'imageUrl', 'description'],
          properties: {
            locale: { $ref: '#/components/schemas/Locale' },
            name: { type: 'string', maxLength: 255 },
            title: { type: 'string', maxLength: 255 },
            imageUrl: { type: 'string', format: 'uri', maxLength: 255 },
            description: { type: 'string', maxLength: 255 },
          },
        },
      },
    },
    paths: {
      '/modules': {
        get: {
          summary: 'List catalogue modules for a locale',
          parameters: [
            { in: 'query', name: 'locale', schema: { $ref: '#/components/schemas/Locale' } },
            { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
            { in: 'query', name: 'offset', schema: { type: 'integer', minimum: 0, default: 0 } },
          ],
          responses: {
            '200': { description: 'Paginated list of modules' },
            '429': { description: 'Too many requests' },
          },
        },
      },
      '/modules/{id}': {
        get: {
          summary: 'Get module detail including ordered classes',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Module detail' },
            '404': { description: 'Module not found' },
          },
        },
      },
      '/faqs': {
        get: {
          summary: 'List localised FAQs',
          responses: { '200': { description: 'FAQ list' } },
        },
      },
      '/reviews': {
        get: {
          summary: 'List curated homepage reviews',
          responses: { '200': { description: 'Review list' } },
        },
        post: {
          summary: 'Create a curated homepage review',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ReviewInput' } } },
          },
          responses: {
            '201': { description: 'Created' },
            '401': { description: 'Invalid or missing API key' },
            '503': { description: 'Public API not configured on the server' },
          },
        },
      },
      '/reviews/{id}': {
        put: {
          summary: 'Update a curated homepage review',
          security: [{ ApiKeyAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Updated review' },
            '404': { description: 'Review not found' },
          },
        },
        delete: {
          summary: 'Delete a curated homepage review',
          security: [{ ApiKeyAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: {
            '204': { description: 'Deleted' },
            '404': { description: 'Review not found' },
          },
        },
      },
    },
  }
})
