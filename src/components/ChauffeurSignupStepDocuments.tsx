import { useLanguage } from '../contexts/LanguageContext'
import ChauffeurDocumentsChecklist from './ChauffeurDocumentsChecklist'

type Props = {
  emailNorm: string
  onComplianceChange: () => void
}

export default function ChauffeurSignupStepDocuments({ emailNorm, onComplianceChange }: Props) {
  const { t } = useLanguage()

  return (
    <div className="auth-signup-step auth-signup-step--documents">
      <h2 className="auth-signup-step__title">{t('chauffeurAuth.stepDocumentsTitle')}</h2>
      <p className="auth-page-field-hint">{t('chauffeurAuth.stepDocumentsLead')}</p>
      <ChauffeurDocumentsChecklist emailNorm={emailNorm} onComplianceChange={onComplianceChange} />
    </div>
  )
}
