/** Pages qui affichent le bandeau bêta dans leur propre chrome (topbar), pas en fixed global. */
export function usesEmbeddedBetaBanner(page: string): boolean {
  return (
    page === 'accueil' ||
    page === 'accueil-chauffeur' ||
    page === 'project-Go' ||
    page === 'client-compte' ||
    page === 'client-meet-driver' ||
    page.startsWith('destination-')
  )
}
