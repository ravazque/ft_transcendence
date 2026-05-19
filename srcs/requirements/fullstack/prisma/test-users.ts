// Test users — inserts QA accounts on top of the seeded catalogue.
//
// Kept out of the main seed so that `make seed` only writes editorial
// content (modules, classes, tagged_info, faqs, milestones) while
// `make test` adds the demo + tester accounts used for evaluation.
//
// Idempotent: re-running upserts users, orders and purchases without
// duplicating rows. Assumes `make seed` has already run — modules are
// looked up by slug and skipped with a warning if missing.
//
// Run with:
//   make test
//   npm run test:users               (inside the fullstack container)

import { PrismaClient, Locale, OrderStatus } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const

const DEMO_USER = {
  username: 'demo',
  email: 'demo@yoga.local',
  password: 'Demo1234!',
  fullName: 'Demo User',
}

const DEMO_ORDER_MARKER = 'seed-demo-order-001'

// Same slug in every locale — Purchase.moduleId still resolves the
// correct content when the UI switches language because the lookup
// is done by (locale, slug).
const DEMO_PURCHASED_SLUGS = [
  'fundamentos-del-yoga',
  'posturas-y-alineacion',
]

// QA accounts that exercise the "already owns N modules" UI states.
// Same password across testers to keep the manual QA cheap.
const TESTER_USERS = [
  {
    username: 'tester_full',
    email: 'tester_full@yoga.local',
    password: 'YogaTest123!',
    fullName: 'Tester Full',
    orderMarker: 'seed-tester-full-order',
    purchasedSlugs: [
      'fundamentos-del-yoga',
      'posturas-y-alineacion',
      'pranayama-y-respiracion',
      'meditacion-y-mindfulness',
      'yoga-terapeutico',
    ],
  },
  {
    username: 'tester_bundle',
    email: 'tester_bundle@yoga.local',
    password: 'YogaTest123!',
    fullName: 'Tester Bundle',
    orderMarker: 'seed-tester-bundle-order',
    purchasedSlugs: ['acceso-total'],
  },
  {
    // Bought 2 individual modules and then the bundle — used to
    // verify the profile shows the bundle as the main entry plus
    // the 5 individual modules (the 2 direct ones + 3 via bundle).
    username: 'tester_mixed',
    email: 'tester_mixed@yoga.local',
    password: 'YogaTest123!',
    fullName: 'Tester Mixed',
    orderMarker: 'seed-tester-mixed-order',
    purchasedSlugs: [
      'fundamentos-del-yoga',
      'posturas-y-alineacion',
      'acceso-total',
    ],
  },
] as const

async function upsertUserWithPurchases(opts: {
  username: string
  email: string
  password: string
  fullName: string
  orderMarker: string
  purchasedSlugs: readonly string[]
}) {
  const passwordHash = await argon2.hash(opts.password, ARGON2_OPTIONS)
  const user = await prisma.user.upsert({
    where: { email: opts.email },
    update: {
      password: passwordHash,
      fullName: opts.fullName,
      emailVerified: true,
    },
    create: {
      username: opts.username,
      email: opts.email,
      password: passwordHash,
      fullName: opts.fullName,
      emailVerified: true,
    },
  })

  const order = await prisma.order.upsert({
    where: { stripeCheckoutSessionId: opts.orderMarker },
    update: { userId: user.id },
    create: {
      userId: user.id,
      status: OrderStatus.paid,
      currency: 'EUR',
      subtotalCents: 0,
      vatCents: 0,
      totalCents: 0,
      stripeCheckoutSessionId: opts.orderMarker,
      paidAt: new Date(),
    },
  })

  let inserted = 0
  for (const slug of opts.purchasedSlugs) {
    const mod = await prisma.module.findUnique({
      where: { locale_slug: { locale: Locale.en_en, slug } },
    })
    if (!mod) {
      console.warn(`    ⚠ module "${slug}" not found — purchase skipped`)
      continue
    }
    if (mod.isFullCourse && opts.username === 'demo') {
      // Demo user must not own the bundle to keep the upsell visible.
      console.warn(`    ⚠ "${slug}" is the bundle — skipped for demo by policy`)
      continue
    }
    await prisma.purchase.upsert({
      where: { userId_moduleId: { userId: user.id, moduleId: mod.id } },
      update: { orderId: order.id, moduleLevel: 1 },
      create: {
        orderId: order.id,
        userId: user.id,
        moduleId: mod.id,
        moduleLevel: 1,
      },
    })
    inserted++
  }

  console.log(
    `  ✓ ${opts.username} with ${inserted} module(s) ` +
      `(login: ${opts.email} / ${opts.password})`,
  )
}

async function main() {
  console.log('🧪 Inserting QA test users…')

  // Catalogue presence sanity check — fail fast with a clear message
  // if the user forgot to run `make seed` first.
  const moduleCount = await prisma.module.count()
  if (moduleCount === 0) {
    console.error(
      '❌ Catalogue is empty. Run `make seed` first so the test users have ' +
        'modules to purchase.',
    )
    process.exit(1)
  }

  await upsertUserWithPurchases({ ...DEMO_USER, orderMarker: DEMO_ORDER_MARKER, purchasedSlugs: DEMO_PURCHASED_SLUGS })

  for (const tester of TESTER_USERS) {
    await upsertUserWithPurchases(tester)
  }

  console.log('✅ Test users ready.')
}

main()
  .catch((err) => {
    console.error('❌ Test-users script failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
