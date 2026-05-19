import type { RouterConfig } from '@nuxt/schema'

// Centralised scroll handling so behaviour matches user expectation
// across Chrome and Firefox and stays predictable on every navigation:
//
//   · Browser back/forward, or our "Volver" button via router.back():
//     restore the EXACT scroll position the user had on the
//     destination. Vue Router gives us `savedPosition` for this.
//   · Same path, only query/hash changed (e.g. clicking a diamond in
//     module_detail that flips ?level=…): keep current scroll, the
//     view is logically the same.
//   · Hash anchor (e.g. `/#metodo` from the footer): smooth-scroll to
//     the anchor with the header offset baked into scroll-padding-top.
//   · Anything else (a fresh navigateTo to a different path): scroll
//     to the top of the new page instantly.
//
// Why everything is `behavior: 'instant'`: the html element used to
// have `scroll-behavior: smooth`, which animated every programmatic
// scroll over ~300 ms ON TOP of the page cross-fade. The user saw
// "stays where I was → suddenly scrolls to top" because the smooth
// animation arrived after they perceived the new page. Smooth has
// been removed from the global stylesheet; here we are explicit so
// future style changes do not bring it back implicitly.
//
// Initial app mount (Vue Router emits a synthetic from with
// `name === undefined`) is the only case where we hand off to the
// browser. Coming back from Stripe Checkout / OAuth via the browser
// back button hits this path — BFCache (or the browser's native
// scroll restoration) handles it correctly and our scrolling would
// only fight it.

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    const isInitialLoad = !from || from.name == null
    if (isInitialLoad) {
      if (savedPosition) return savedPosition
      if (to.hash) return { el: to.hash, top: 80 }
      return false
    }

    if (savedPosition) {
      return { ...savedPosition, behavior: 'instant' as ScrollBehavior }
    }
    if (to.hash) {
      return { el: to.hash, top: 80, behavior: 'smooth' }
    }
    if (to.path === from.path) {
      return false
    }
    return { top: 0, left: 0, behavior: 'instant' as ScrollBehavior }
  },
}
