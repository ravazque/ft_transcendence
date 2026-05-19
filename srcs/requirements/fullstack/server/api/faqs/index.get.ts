import { prisma } from '../../utils/prisma'
import { resolveLocale } from '../../utils/locale'

// GET /api/faqs
// FAQs editables desde Directus (tabla `faqs`, una fila por
// pregunta+locale). Devuelve la lista en el locale resuelto del
// request, ordenadas por id ascendente.
export default defineEventHandler(async (event) => {
  const locale = resolveLocale(event)
  const items = await prisma.faq.findMany({
    where: { locale },
    orderBy: { id: 'asc' },
    select: { id: true, question: true, answer: true },
  })
  return { items }
})
