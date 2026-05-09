import { useMemo, useState, useCallback, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  CHAUFFEUR_LEGAL_DOC_IDS,
  type ChauffeurLegalDocId,
  complianceFullySatisfied,
  loadComplianceSnapshot,
  setComplianceDoc,
  type ChauffeurComplianceSnapshot,
} from '../constants/chauffeurComplianceStorage';
import {
  complianceApiEnabled,
  fetchChauffeurComplianceSnapshotFromApi,
  setChauffeurComplianceDocOnApi,
} from '../services/chauffeurComplianceApi';

export type ChauffeurDocumentsChecklistProps = {
  emailNorm: string;
  onComplianceChange: () => void;
};

function docI18nKey(id: ChauffeurLegalDocId): string {
  return `chauffeurCompliance.doc_${id}`;
}

export default function ChauffeurDocumentsChecklist({
  emailNorm,
  onComplianceChange,
}: ChauffeurDocumentsChecklistProps) {
  const { t } = useLanguage();
  const [tick, setTick] = useState(0);
  const [apiSnapshot, setApiSnapshot] = useState<ChauffeurComplianceSnapshot | null>(null);
  const useComplianceApi = complianceApiEnabled();

  useEffect(() => {
    if (!useComplianceApi) return;
    let cancelled = false;
    void fetchChauffeurComplianceSnapshotFromApi(emailNorm)
      .then((snap) => {
        if (!cancelled) setApiSnapshot(snap);
      })
      .catch(() => {
        if (!cancelled) setApiSnapshot(null);
      });
    return () => {
      cancelled = true;
    };
  }, [emailNorm, useComplianceApi, tick]);

  const snapshot = useMemo(() => {
    void tick;
    if (useComplianceApi && apiSnapshot) return apiSnapshot;
    return loadComplianceSnapshot(emailNorm);
  }, [emailNorm, tick, useComplianceApi, apiSnapshot]);

  const toggle = useCallback(
    (id: ChauffeurLegalDocId) => {
      const nextValue = !snapshot[id];
      setComplianceDoc(emailNorm, id, nextValue);
      if (useComplianceApi) {
        void setChauffeurComplianceDocOnApi(emailNorm, id, nextValue)
          .then((next) => setApiSnapshot(next))
          .catch(() => {
            // Le fallback local reste source de secours.
          });
      }
      setTick((n) => n + 1);
      onComplianceChange();
    },
    [emailNorm, onComplianceChange, useComplianceApi, snapshot]
  );

  const allDone = complianceFullySatisfied(snapshot);

  return (
    <div className="chauffeur-compliance-checklist">
      <p className="chauffeur-compliance-checklist__lead">{t('chauffeurCompliance.checklistLead')}</p>
      <ul className="chauffeur-compliance-checklist__list" aria-label={t('chauffeurCompliance.checklistAria')}>
        {CHAUFFEUR_LEGAL_DOC_IDS.map((id) => (
          <li key={id} className="chauffeur-compliance-checklist__row">
            <label className="chauffeur-compliance-checklist__label">
              <input
                type="checkbox"
                checked={snapshot[id]}
                onChange={() => toggle(id)}
              />
              <span>{t(docI18nKey(id))}</span>
            </label>
          </li>
        ))}
      </ul>
      {allDone ? (
        <p className="chauffeur-compliance-checklist__success">{t('chauffeurCompliance.allProvided')}</p>
      ) : (
        <p className="chauffeur-compliance-checklist__hint">{t('chauffeurCompliance.complianceUploadHint')}</p>
      )}
    </div>
  );
}
