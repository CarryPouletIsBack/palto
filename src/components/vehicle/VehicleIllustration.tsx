const BERLINE_PLACEHOLDER_SRC = '/images/placeholder-berline.png';

export function VehicleIllustration() {
  return (
    <div className="palto-ride-driver-item__vehicle" aria-hidden>
      <img
        className="palto-ride-driver-item__vehicle-img"
        src={BERLINE_PLACEHOLDER_SRC}
        alt=""
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
