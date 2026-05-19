import { useCallback, useState, type FC } from 'react';
import { ChevronDown } from 'lucide-react';

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

  const primaryLabel = timing === 'now' ? labelNow : labelLater;
  const secondaryLabel = timing === 'now' ? labelLater : labelNow;
  const secondaryValue: 'now' | 'later' = timing === 'now' ? 'later' : 'now';
  const showScheduleField = showScheduledInput && timing === 'later';

  const selectTiming = useCallback(
    (next: 'now' | 'later') => {
      onTimingChange(next);
      setExpanded(false);
    },
    [onTimingChange]
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
              <input
                type="datetime-local"
                className="palto-ride-input palto-ride-input--datetime-local palto-ride-timing-expand__datetime"
                min={minDateTimeLocal}
                value={pickupDateTime}
                onChange={(e) => onPickupDateTimeChange(e.target.value)}
                aria-label={scheduleInputAriaLabel}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PaltoGoPickupTimingSelect;
