export type ChauffeurDocumentKey = 'permis' | 'assurance' | 'carte-grise' | 'controle-technique';

export type ChauffeurDocumentStatus = 'missing' | 'pending' | 'soon' | 'ok';

export type ChauffeurDocument = {
  key: ChauffeurDocumentKey;
  label: string;
  expiry: string;
  status: ChauffeurDocumentStatus;
  uploadedFileName?: string;
};

type Props = {
  documents: ChauffeurDocument[];
  uploadDraft: Record<ChauffeurDocumentKey, string>;
  onFilePick: (docKey: ChauffeurDocumentKey, file: File | null) => void;
  onSubmitRenewal: (docKey: ChauffeurDocumentKey) => void;
  validationErrors?: Partial<Record<ChauffeurDocumentKey, string>>;
  submitting?: Partial<Record<ChauffeurDocumentKey, boolean>>;
  language: 'fr' | 'en';
};

function statusBadgeClass(status: ChauffeurDocumentStatus): string {
  switch (status) {
    case 'missing':
      return 'dashboard-doc-badge--missing';
    case 'pending':
      return 'dashboard-doc-badge--pending';
    case 'soon':
      return 'dashboard-doc-badge--soon';
    case 'ok':
      return 'dashboard-doc-badge--ok';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function statusLabel(status: ChauffeurDocumentStatus, isEn: boolean): string {
  switch (status) {
    case 'missing':
      return isEn ? 'Not provided' : 'À fournir';
    case 'pending':
      return isEn ? 'Verification in progress' : 'Vérification en cours';
    case 'soon':
      return isEn ? 'Renew soon' : 'À renouveler';
    case 'ok':
      return isEn ? 'Validated' : 'Validé';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function expiryLabel(doc: ChauffeurDocument, isEn: boolean): string | null {
  if (doc.status === 'missing') {
    return isEn ? 'Expiry date not set' : 'Date d’expiration non renseignée';
  }
  if (doc.status === 'pending' && !doc.expiry.trim()) {
    return isEn ? 'Awaiting verification' : 'En attente de vérification';
  }
  if (!doc.expiry.trim()) return null;
  return `${isEn ? 'Expiry' : 'Expiration'} : ${doc.expiry}`;
}

export default function ChauffeurDocumentsPanel({
  documents,
  uploadDraft,
  onFilePick,
  onSubmitRenewal,
  validationErrors = {},
  submitting = {},
  language,
}: Props) {
  const isEn = language === 'en';

  return (
    <article className="dashboard-user-card">
      <div className="dashboard-user-card-head">
        <div>
          <h4>{isEn ? 'Documents & compliance' : 'Documents & conformité'}</h4>
          <p className="dashboard-field-hint">
            {isEn
              ? 'Legal documents and verification status required to accept rides.'
              : 'Pièces légales et statut de vérification pour accepter des courses.'}
          </p>
        </div>
      </div>
      <div className="dashboard-doc-list">
        {documents.map((doc) => {
          const expiryText = expiryLabel(doc, isEn);
          const draftName = uploadDraft[doc.key]?.trim();
          const validationError = validationErrors[doc.key]?.trim();
          const isSubmitting = Boolean(submitting[doc.key]);
          return (
          <div key={doc.key} className="dashboard-doc-row">
            <div className="dashboard-doc-row__meta">
              <strong>{doc.label}</strong>
              {expiryText ? <p>{expiryText}</p> : null}
              {doc.uploadedFileName ? (
                <p className="dashboard-doc-row__file">
                  {isEn ? 'File on record' : 'Fichier enregistré'} : {doc.uploadedFileName}
                </p>
              ) : null}
              {draftName ? (
                <p className="dashboard-doc-row__file dashboard-doc-row__file--draft">
                  {isEn ? 'Selected' : 'Sélectionné'} : {draftName}
                </p>
              ) : null}
              {validationError ? (
                <p className="dashboard-doc-row__error" role="alert">
                  {validationError}
                </p>
              ) : null}
            </div>
            <div className="dashboard-doc-actions">
              <span className={`dashboard-doc-badge ${statusBadgeClass(doc.status)}`}>
                {statusLabel(doc.status, isEn)}
              </span>
              <label className="dashboard-doc-upload-btn">
                {isEn ? 'Browse' : 'Parcourir'}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  disabled={isSubmitting}
                  onChange={(e) => onFilePick(doc.key, e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="button"
                className="dashboard-doc-submit-btn"
                disabled={!draftName || doc.status === 'pending' || isSubmitting}
                onClick={() => onSubmitRenewal(doc.key)}
              >
                {isSubmitting
                  ? isEn
                    ? 'Checking…'
                    : 'Vérification…'
                  : isEn
                    ? 'Upload'
                    : 'Téléverser'}
              </button>
            </div>
          </div>
        );
        })}
      </div>
    </article>
  );
}
