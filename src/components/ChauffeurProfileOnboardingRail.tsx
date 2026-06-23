import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'
import type { Language } from '../contexts/LanguageContext'
import type {
  ChauffeurProfileOnboardingStep,
  ChauffeurProfileOnboardingStepId,
} from '../utils/chauffeurProfileOnboarding'
import {
  readProfileOnboardingRailMinimized,
  writeProfileOnboardingRailMinimized,
} from '../utils/chauffeurProfileOnboarding'
import './ChauffeurProfileOnboardingRail.css'

type Props = {
  language: Language
  completedCount: number
  totalCount: number
  steps: ChauffeurProfileOnboardingStep[]
  nextStepId: ChauffeurProfileOnboardingStepId | null
  sidebarCollapsed?: boolean
  expandNonce?: number
  onContinue: () => void
  onStepSelect: (stepId: ChauffeurProfileOnboardingStepId) => void
}

export default function ChauffeurProfileOnboardingRail({
  language,
  completedCount,
  totalCount,
  steps,
  nextStepId,
  sidebarCollapsed = false,
  expandNonce = 0,
  onContinue,
  onStepSelect,
}: Props) {
  const isEn = language === 'en'
  const [minimized, setMinimized] = useState(() => readProfileOnboardingRailMinimized())

  useEffect(() => {
    if (!expandNonce) return
    setMinimized(false)
    writeProfileOnboardingRailMinimized(false)
  }, [expandNonce])

  const toggleMinimized = useCallback(() => {
    setMinimized((prev) => {
      const next = !prev
      writeProfileOnboardingRailMinimized(next)
      return next
    })
  }, [])

  if (completedCount >= totalCount) return null

  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const nextStep = steps.find((s) => s.id === nextStepId) ?? null
  const isCompact = minimized || sidebarCollapsed
  const showDetails = !isCompact

  return (
    <div
      className={[
        'chauffeur-profile-onboarding-rail',
        minimized ? ' chauffeur-profile-onboarding-rail--minimized' : '',
        sidebarCollapsed ? ' chauffeur-profile-onboarding-rail--sidebar-collapsed' : '',
      ].join('')}
      aria-label={isEn ? 'Driver profile setup progress' : 'Progression du profil chauffeur'}
    >
      <div className="chauffeur-profile-onboarding-rail__head">
        <div className="chauffeur-profile-onboarding-rail__head-main">
          <span className="chauffeur-profile-onboarding-rail__title">
            {isEn ? 'Driver profile' : 'Profil chauffeur'}
          </span>
          <span className="chauffeur-profile-onboarding-rail__count" aria-hidden>
            {completedCount}/{totalCount}
          </span>
        </div>
        {!sidebarCollapsed ? (
          <button
            type="button"
            className="chauffeur-profile-onboarding-rail__toggle"
            onClick={toggleMinimized}
            aria-expanded={!minimized}
            aria-label={
              minimized
                ? isEn
                  ? 'Expand profile setup'
                  : 'Développer la configuration du profil'
                : isEn
                  ? 'Reduce profile setup'
                  : 'Réduire la configuration du profil'
            }
          >
            {minimized ? <ChevronDown size={16} strokeWidth={2.25} aria-hidden /> : <ChevronUp size={16} strokeWidth={2.25} aria-hidden />}
          </button>
        ) : null}
      </div>

      <div
        className="chauffeur-profile-onboarding-rail__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalCount}
        aria-valuenow={completedCount}
        aria-label={
          isEn
            ? `${completedCount} of ${totalCount} profile steps completed`
            : `${completedCount} sur ${totalCount} étapes du profil complétées`
        }
      >
        <span
          className="chauffeur-profile-onboarding-rail__fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {showDetails ? (
        <>
          <p className="chauffeur-profile-onboarding-rail__beta">
            {isEn
              ? 'Beta — complete your profile when you can; rides are not blocked.'
              : 'Bêta — complétez votre profil à votre rythme ; les courses ne sont pas bloquées.'}
          </p>

          {nextStep ? (
            <button type="button" className="chauffeur-profile-onboarding-rail__cta" onClick={onContinue}>
              <span>
                {isEn ? 'Next' : 'Étape suivante'} : {isEn ? nextStep.labelEn : nextStep.labelFr}
              </span>
              <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}

          <ol className="chauffeur-profile-onboarding-rail__steps">
            {steps.map((step, index) => (
              <li key={step.id}>
                <button
                  type="button"
                  className={`chauffeur-profile-onboarding-rail__step${
                    step.done ? ' chauffeur-profile-onboarding-rail__step--done' : ''
                  }`}
                  onClick={() => onStepSelect(step.id)}
                >
                  <span className="chauffeur-profile-onboarding-rail__step-index" aria-hidden>
                    {index + 1}
                  </span>
                  <span className="chauffeur-profile-onboarding-rail__step-label">
                    {isEn ? step.labelEn : step.labelFr}
                    {step.optional ? (
                      <span className="chauffeur-profile-onboarding-rail__step-optional">
                        {isEn ? ' (optional)' : ' (optionnel)'}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </div>
  )
}
