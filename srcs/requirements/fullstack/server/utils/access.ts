import { prisma } from './prisma'

// Checks whether a user has access to a module.
//
// Returns true if:
//   - The user is admin or editor.
//   - There is a purchase on any translation of the same module
//     (resolved cross-locale by SLUG — a "fundamentos-del-yoga"
//     module has a different id per language but shares the slug,
//     so a purchase in EN should also unlock ES and FR).
//   - There is a purchase on any module marked isFullCourse=true
//     (the "Full Access" bundle), also cross-locale.
export async function userHasModuleAccess(
  userId: string | null | undefined,
  moduleId: number,
): Promise<boolean> {
  if (!userId) return false

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (!user) return false
  if (user.role === 'admin' || user.role === 'editor') return true

  // Resolve the slug of the requested module so we can find every
  // translation (same slug, different id per locale).
  const target = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { slug: true },
  })
  if (!target) return false

  const sameSlug = await prisma.module.findMany({
    where: { slug: target.slug },
    select: { id: true },
  })
  const slugIds = sameSlug.map((m) => m.id)

  const direct = await prisma.purchase.findFirst({
    where: { userId, moduleId: { in: slugIds } },
    select: { id: true },
  })
  if (direct) return true

  // Bundle: any purchase of an isFullCourse module unlocks everything.
  const bundle = await prisma.purchase.findFirst({
    where: { userId, module: { isFullCourse: true } },
    select: { id: true },
  })
  return Boolean(bundle)
}
