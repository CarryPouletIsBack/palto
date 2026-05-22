import {
  chauffeurVehicleTypeLabel,
  isChauffeurVehicleType,
} from '../constants/chauffeurVehicleType';
import type { ClientLiveMeetRideModel } from '../constants/clientLiveMeetRide';
import type { ClientRideItem } from '../services/clientRidesApi';

/** Infos chauffeur prêtes pour l’UI (carte rencontre / suivi carte). */
export type ClientDriverDisplay = {
  driverName: string;
  driverPhone?: string;
  driverProfilePhotoUrl?: string;
  licensePlate?: string;
  vehicleColor?: string;
  vehicleTypeLabel: string;
  vehicleModel?: string;
  /** Ligne principale sous le nom (ex. « Berline · Peugeot 308 »). */
  vehicleLine: string;
};

type DriverFields = {
  driverName?: string | null;
  driverPhone?: string | null;
  driverProfilePhotoUrl?: string | null;
  vehicleLabel?: string | null;
  vehicleType?: string | null;
  vehicleModel?: string | null;
  licensePlate?: string | null;
  vehicleColor?: string | null;
};

function buildVehicleLine(fields: DriverFields): {
  vehicleLine: string;
  vehicleTypeLabel: string;
  vehicleModel?: string;
} {
  const typeSlug = (fields.vehicleType ?? '').trim().toLowerCase();
  const typeLabel =
    chauffeurVehicleTypeLabel(typeSlug) ||
    chauffeurVehicleTypeLabel(fields.vehicleLabel) ||
    '';
  const model = fields.vehicleModel?.trim() || undefined;

  if (typeLabel && model) {
    return { vehicleLine: `${typeLabel} · ${model}`, vehicleTypeLabel: typeLabel, vehicleModel: model };
  }
  if (typeLabel) return { vehicleLine: typeLabel, vehicleTypeLabel: typeLabel, vehicleModel: model };
  if (model) return { vehicleLine: model, vehicleTypeLabel: '', vehicleModel: model };

  const raw = fields.vehicleLabel?.trim() || '';
  if (!raw) return { vehicleLine: '', vehicleTypeLabel: '', vehicleModel: undefined };
  if (isChauffeurVehicleType(raw.toLowerCase())) {
    const tl = chauffeurVehicleTypeLabel(raw) ?? raw;
    return { vehicleLine: tl, vehicleTypeLabel: tl, vehicleModel: undefined };
  }
  return { vehicleLine: raw, vehicleTypeLabel: '', vehicleModel: undefined };
}

export function clientDriverDisplayFromFields(fields: DriverFields): ClientDriverDisplay {
  const { vehicleLine, vehicleTypeLabel, vehicleModel } = buildVehicleLine(fields);
  return {
    driverName: fields.driverName?.trim() || 'Chauffeur Palto',
    driverPhone: fields.driverPhone?.trim() || undefined,
    driverProfilePhotoUrl: fields.driverProfilePhotoUrl?.trim() || undefined,
    licensePlate: fields.licensePlate?.trim() || undefined,
    vehicleColor: fields.vehicleColor?.trim() || undefined,
    vehicleTypeLabel,
    vehicleModel,
    vehicleLine,
  };
}

export function clientDriverDisplayFromRideItem(item: ClientRideItem): ClientDriverDisplay {
  return clientDriverDisplayFromFields(item);
}

export function clientDriverDisplayFromMeetModel(model: ClientLiveMeetRideModel): ClientDriverDisplay {
  return clientDriverDisplayFromFields(model);
}
