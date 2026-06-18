import { useEffect, useMemo, useState, type FC } from 'react'
import {
  MOBILE_DATETIME_SPLIT_MQ,
  mergeDateTimeLocal,
  splitDateTimeLocal,
} from '../utils/pickupDateTimeLocal'

export type PaltoScheduledDateTimeFieldsProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  minDateTimeLocal: string
  ariaLabel: string
  inputClassName?: string
  splitClassName?: string
  dateInputClassName?: string
  timeInputClassName?: string
}

const PaltoScheduledDateTimeFields: FC<PaltoScheduledDateTimeFieldsProps> = ({
  id,
  value,
  onChange,
  minDateTimeLocal,
  ariaLabel,
  inputClassName = '',
  splitClassName = '',
  dateInputClassName = '',
  timeInputClassName = '',
}) => {
  const [useSplitDateTime, setUseSplitDateTime] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_DATETIME_SPLIT_MQ).matches
  )

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_DATETIME_SPLIT_MQ)
    const sync = () => setUseSplitDateTime(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const minDate = minDateTimeLocal.slice(0, 10)
  const minTime = minDateTimeLocal.length >= 16 ? minDateTimeLocal.slice(11, 16) : ''
  const { date: dateValue, time: timeValue } = useMemo(() => splitDateTimeLocal(value), [value])

  const resolvedInputClass = inputClassName.trim()
  const resolvedDateClass = (dateInputClassName || inputClassName).trim()
  const resolvedTimeClass = (timeInputClassName || inputClassName).trim()
  const resolvedSplitClass = splitClassName.trim()

  if (useSplitDateTime) {
    return (
      <div
        className={resolvedSplitClass || undefined}
        role="group"
        aria-label={ariaLabel}
      >
        <input
          type="date"
          className={resolvedDateClass || undefined}
          min={minDate}
          value={dateValue}
          onChange={(e) => onChange(mergeDateTimeLocal(e.target.value, timeValue, minDateTimeLocal))}
          aria-label={`${ariaLabel} — date`}
        />
        <input
          type="time"
          className={resolvedTimeClass || undefined}
          min={dateValue === minDate ? minTime : undefined}
          value={timeValue}
          onChange={(e) => onChange(mergeDateTimeLocal(dateValue, e.target.value, minDateTimeLocal))}
          aria-label={`${ariaLabel} — heure`}
        />
      </div>
    )
  }

  return (
    <input
      id={id}
      type="datetime-local"
      className={resolvedInputClass || undefined}
      min={minDateTimeLocal}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
    />
  )
}

export default PaltoScheduledDateTimeFields
