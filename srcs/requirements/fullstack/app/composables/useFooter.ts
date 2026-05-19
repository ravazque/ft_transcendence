// Footer structure derived from the editable content in `tagged_info`.
//
// Kept as a composable (not as static consts) so titles and URLs
// respond live to changes made from Directus. Each value falls back
// to its original literal during the migration, so as long as
// `make seed` has not been run the footer keeps showing the previous
// copy instead of jumping to empty strings.

export function useFooterLinks() {
  const { t } = useTags()
  const route = useRoute()

  // When the user is off the home page, anchors need the "/" prefix
  // so Vue Router first navigates to the landing page and then scrolls
  // to the section. On the home page itself a bare hash is enough.
  const isHome = computed(() => route.path === '/')
  const hash = (anchor: string) => (isHome.value ? `#${anchor}` : `/#${anchor}`)

  const footerLinks = computed(() => [
    {
      label: t('FOOTER_DOCS_TITLE', 'Documentos'),
      children: [
        {
          label: t('FOOTER_PRIVACY_TITLE', 'Privacidad y términos'),
          to: '/privacy',
        },
      ],
    },
    {
      label: t('FOOTER_TXT_1', 'Home'),
      children: [
        { label: t('HEADER_TXT_1', 'Método'), to: hash('metodo') },
        { label: t('HEADER_TXT_2', 'Marco'), to: hash('Marco') },
        { label: t('HEADER_TXT_3', 'Reseñas'), to: hash('resenas') },
        { label: t('HEADER_TXT_4', 'Clases en directo'), to: hash('directo') },
      ],
    },
  ])

  const socialLinks = computed(() => [
    {
      icon: 'i-lucide-mail',
      to: t('FOOTER_URL_EMAIL', 'mailto:hola@transcendyoga.com'),
      label: 'Email',
    },
    {
      icon: 'i-lucide-instagram',
      to: t('FOOTER_URL_INSTAGRAM', 'https://instagram.com/transcendyoga'),
      target: '_blank',
      label: 'Instagram',
    },
  ])

  return { footerLinks, socialLinks }
}
