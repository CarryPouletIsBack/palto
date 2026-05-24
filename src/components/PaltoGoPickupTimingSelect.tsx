import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { ChevronDown } from 'lucide-react';

const MOBILE_GO_MAX_WIDTH = '(max-width: 768px)';

export type PaltoGoPickupTimingSelectProps = {
  timing: 'now' | 'later';
  onTimingChange: (timing: 'now' | 'later') => void;
  pickupDateTime: string;
  onPickupDateTimeChange: (value: string) => void;
  minDateTimeLocal: string;
  labelNow: string;
  labelLater: string;
  scheduleInputAriaLabel?: string;
  className?: string;
  /** false : le parent affiche le datetime-local ailleurs. */
  showScheduledInput?: boolean;
};

function splitDateTimeLocal(value: string): { date: string; time: string } {
  if (!value || value.length < 10) return { date: '', time: '' };
  const date = value.slice(0, 10);
  const time = value.length >= 16 ? value.slice(11, 16) : '';
  return { date, time };
}

function mergeDateTimeLocal(date: string, time: string, fallbackMin: string): string {
  const minParts = splitDateTimeLocal(fallbackMin);
  const resolvedDate = date || minParts.date;
  const resolvedTime = time || '12:00';
  if (!resolvedDate) return '';
  return `${resolvedDate}T${resolvedTime}`;
}

const PaltoGoPickupTimingSelect: FC<PaltoGoPickupTimingSelectProps> = ({
  timing,
  onTimingChange,
  pickupDateTime,
  onPickupDateTimeChange,
  minDateTimeLocal,
  labelNow,
  labelLater,
  scheduleInputAriaLabel = 'Heure de prise en charge',
  className = '',
  showScheduledInput = true,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [useSplitDateTime, setUseSplitDateTime] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_GO_MAX_WIDTH).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_GO_MAX_WIDTH);
    const sync = () => setUseSplitDateTime(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const primaryLabel = timing === 'now' ? labelNow : labelLater;
  const secondaryLabel = timing === 'now' ? labelLater : labelNow;
  const secondaryValue: 'now' | 'later' = timing === 'now' ? 'later' : 'now';
  const showScheduleField = showScheduledInput && timing === 'later';

  const minDate = minDateTimeLocal.slice(0, 10);
  const minTime = minDateTimeLocal.length >= 16 ? minDateTimeLocal.slice(11, 16) : '';
  const { date: dateValue, time: timeValue } = useMemo(
    () => splitDateTimeLocal(pickupDateTime),
    [pickupDateTime]
  );

  const selectTiming = useCallback(
    (next: 'now' | 'later') => {
      onTimingChange(next);
      setExpanded(false);
    },
    [onTimingChange]
  );

  const scheduleFieldClass =
    'palto-ride-input palto-ride-input--datetime-local palto-ride-timing-expand__datetime';

  const scheduleInputs = useSplitDateTime ? (
    <div className="palto-ride-datetime-split" role="group" aria-label={scheduleInputAriaLabel}>
      <input
        type="date"
        className={`${scheduleFieldClass} palto-ride-timing-expand__datetime--date`}
        min={minDate}
        value={dateValue}
        onChange={(e) =>
          onPickupDateTimeChange(mergeDateTimeLocal(e.target.value, timeValue, minDateTimeLocal))
        }
        aria-label={`${scheduleInputAriaLabel} — date`}
      />
      <input
        type="time"
        className={`${scheduleFieldClass} palto-ride-timing-expand__datetime--time`}
        min={dateValue === minDate ? minTime : undefined}
        value={timeValue}
        onChange={(e) =>
          onPickupDateTimeChange(mergeDateTimeLocal(dateValue, e.target.value, minDateTimeLocal))
        }
        aria-label={`${scheduleInputAriaLabel} — heure`}
      />
    </div>
  ) : (
    <input
      type="datetime-local"
      className={scheduleFieldClass}
      min={minDateTimeLocal}
      value={pickupDateTime}
      onChange={(e) => onPickupDateTimeChange(e.target.value)}
      aria-label={scheduleInputAriaLabel}
    />
  );

  return (
    <div className={`palto-ride-field palto-ride-field--timing${className ? ` ${className}` : ''}`}>
      <div
        className={
          'palto-ride-timing-expand' +
          (expanded ? ' palto-ride-timing-expand--open' : '') +
          (showScheduleField ? ' palto-ride-timing-expand--scheduled' : '')
        }
      >
        <button
          type="button"
          className="palto-ride-timing-expand__trigger"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls="palto-ride-timing-expand-panel"
        >
          <span className="palto-ride-timing-expand__trigger-text">{primaryLabel}</span>
          <ChevronDown className="palto-ride-timing-expand__chevron" size={16} strokeWidth={2.25} aria-hidden />
        </button>
        <div
          id="palto-ride-timing-expand-panel"
          className="palto-ride-timing-expand__panel palto-ride-timing-expand__panel--choices"
          aria-hidden={!expanded}
        >
          <div className="palto-ride-timing-expand__panel-inner">
            <button
              type="button"
              className="palto-ride-timing-expand__option"
              onClick={() => selectTiming(secondaryValue)}
            >
              {secondaryLabel}
            </button>
          </div>
        </div>
        {showScheduleField ? (
          <div className="palto-ride-timing-expand__panel palto-ride-timing-expand__panel--schedule">
            <div className="palto-ride-timing-expand__panel-inner palto-ride-timing-expand__schedule-inner palto-ride-datetime-local-wrap">
              {scheduleInputs}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PaltoGoPickupTimingSelect;
