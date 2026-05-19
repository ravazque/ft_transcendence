import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { resolveLocale } from '../../utils/locale'

// GET /api/me/purchases
//
// Lists the modules the authenticated user has access to via a
// purchase, together with a `summary` the front end uses to decide
// whether to show the "unlock everything" upsell.
//
// Cross-locale: a `Purchase` points to a specific `module.id` (in one
// locale), but the slug is stable across locales. So switching
// languages does not make purchases vanish from the view, we resolve
// every purchase to its equivalent in the current locale:
// purchase → module.slug → module (same slug, requested locale).
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const locale = resolveLocale(event)

  // 1. Every purchase of the user, in any locale.
  const purchases = await prisma.purchase.findMany({
    where: { userId: auth.sub },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      moduleLevel: true,
      createdAt: true,
      module: {
        select: { id: true, slug: true, isFullCourse: true },
      },
    },
  })

  // 2. For each purchased slug, look up the version in the current
  // locale (if it exists; otherwise skip — the module is not
  // translated yet).
  const slugs = Array.from(new Set(purchases.map((p) => p.module.slug)))
  const localised = slugs.length
    ? await prisma.module.findMany({
        where: { locale, slug: { in: slugs } },
        select: {
          slug: true,
          title: true,
          cover: true,
          isFullCourse: true,
          id: true,
        },
      })
    : []
  const bySlug = new Map(localised.map((m) => [m.slug, m]))

  // 3. Summary of what the user owns, locale-independent.
  // Deduplicated by slug (each slug = one logical purchase).
  const ownedSlugs = new Set(purchases.map((p) => p.module.slug))
  const ownsBundle = purchases.some((p) => p.module.isFullCourse)

  const regularTotalRow = await prisma.module.groupBy({
    by: ['slug'],
    where: { locale, published: true, isFullCourse: false },
  })
  const regularTotal = regularTotalRow.length
  const regularOwned = purchases.filter((p) => !p.module.isFullCourse).reduce((acc, p) => {
    acc.add(p.module.slug)
    return acc
  }, new Set<string>()).size
  const ownsEverything = ownsBundle || (regularTotal > 0 && regularOwned >= regularTotal)

  const items = purchases
    .map((p) => {
      const loc = bySlug.get(p.module.slug)
      if (!loc) return null
      return {
        id: p.id,
        moduleId: loc.id,
        slug: loc.slug,
        title: loc.title,
        cover: loc.cover,
        isFullCourse: loc.isFullCourse,
        moduleLevel: p.moduleLevel,
        purchasedAt: p.createdAt,
        viaBundle: false,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  // Profile display rule:
  //   - If the user does NOT own the bundle: the grid only shows the
  //     modules bought individually. We do not inject any virtual card
  //     for the "Full Access" bundle — buying everything one by one is
  //     not the same as owning the bundle.
  //   - If the user DOES own the bundle: the bundle card appears
  //     (from its Purchase row) plus every individual module (those
  //     bought directly as a Purchase, and those they did not buy but
  //     own via the bundle, marked with viaBundle=true so they are
  //     visually distinguishable).
  if (ownsBundle) {
    const regulars = await prisma.module.findMany({
      where: { locale, published: true, isFullCourse: false },
      select: { id: true, slug: true, title: true, cover: true, isFullCourse: true },
      orderBy: { id: 'asc' },
    })
    const alreadyIncluded = new Set(items.map((i) => i.slug))
    for (const m of regulars) {
      if (alreadyIncluded.has(m.slug)) continue
      items.push({
        id: -m.id,
        moduleId: m.id,
        slug: m.slug,
        title: m.title,
        cover: m.cover,
        isFullCourse: m.isFullCourse,
        moduleLevel: 1,
        purchasedAt: new Date(0),
        viaBundle: true,
      })
    }
  }

  // Bundle first, then the rest in their original order — the bundle
  // is the "index" entry and makes sense at the top of the grid.
  items.sort((a, b) => {
    if (a.isFullCourse && !b.isFullCourse) return -1
    if (!a.isFullCourse && b.isFullCourse) return 1
    return 0
  })

  return {
    items,
    summary: { ownsBundle, regularOwned, regularTotal, ownsEverything },
    ownedSlugs: Array.from(ownedSlugs),
  }
})
