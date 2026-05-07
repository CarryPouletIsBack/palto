/** Données vue « chauffeur sur place » (démo) — hors récap « Mes courses ». */
export type ClientLiveMeetRideModel = {
  pickupLabel: string;
  route: string;
  departTime: string;
  driverName: string;
  vehicleLabel: string;
  vehicleColor: string;
  licensePlate: string;
  meetPickupCoords: { lng: number; lat: number };
  meetDriverCoordsInitial: { lng: number; lat: number };
};

export function getClientLiveMeetRideModel(): ClientLiveMeetRideModel | null {
  return null;
}
