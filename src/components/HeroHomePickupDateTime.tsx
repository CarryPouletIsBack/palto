import { useEffect, useMemo, useState, type FC } from 'react'
import {
  mergeDateTimeLocal,
  prefersSplitDateTimeFields,
  splitDateTimeLocal,
} from '../utils/pickupDateTimeLocal'

export type HeroHomePickupDateTimeProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  minDateTimeLocal: string
  ariaLabel: string
}

const HeroHomePickupDateTime: FC<HeroHomePickupDateTimeProps> = ({
  id,
  value,
  onChange,
  minDateTimeLocal,
  ariaLabel,
}) => {
  const [isNativeSplit, setIsNativeSplit] = useState(() => prefersSplitDateTimeFields())

  useEffect(() => {
    setIsNativeSplit(prefersSplitDateTimeFields())
  }, [])

  const minDate = minDateTimeLocal.slice(0, 10)
  const minTime = minDateTimeLocal.length >= 16 ? minDateTimeLocal.slice(11, 16) : ''
  const { date: dateValue, time: timeValue } = useMemo(() => splitDateTimeLocal(value), [value])

  if (isNativeSplit) {
    return (
      <div className="hero-home-datetime-split" role="group" aria-label={ariaLabel}>
        <input
          type="date"
          className="hero-home-datetime-field hero-home-datetime-field--date"
          min={minDate}
          value={dateValue}
          onChange={(e) => onChange(mergeDateTimeLocal(e.target.value, timeValue, minDateTimeLocal))}
          aria-label={`${ariaLabel} — date`}
        />
        <input
          type="time"
          className="hero-home-datetime-field hero-home-datetime-field--time"
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
      className="hero-home-datetime-field hero-home-datetime-field--single"
      min={minDateTimeLocal}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
    />
  )
}

export default HeroHomePickupDateTime
