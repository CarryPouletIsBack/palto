/** Diaporama fondu — fonds des pages connexion client / chauffeur. */
export function AuthPagePhotoBackground() {
  return (
    <div className="auth-page-shell__bg" aria-hidden>
      <div className="auth-page-shell__bg-slide auth-page-shell__bg-slide--a" />
      <div className="auth-page-shell__bg-slide auth-page-shell__bg-slide--b" />
      <div className="auth-page-shell__bg-slide auth-page-shell__bg-slide--c" />
      <div className="auth-page-shell__bg-slide auth-page-shell__bg-slide--d" />
      <div className="auth-page-shell__bg-scrim" />
    </div>
  )
}
