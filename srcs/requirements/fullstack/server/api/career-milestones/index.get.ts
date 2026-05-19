import { prisma } from '../../utils/prisma'
import { resolveLocale } from '../../utils/locale'

// GET /api/career-milestones
// Milestones editable from Directus (table `career_milestones`, one
// row per (milestone_date, locale)). Sorted by date ascending to feed
// the "Who is Marco" timeline on the home page.
export default defineEventHandler(async (event) => {
  const locale = resolveLocale(event)
  const items = await prisma.careerMilestone.findMany({
    where: { locale },
    orderBy: { milestoneDate: 'asc' },
    select: { id: true, milestoneDate: true, title: true, description: true },
  })
  return { items }
})
