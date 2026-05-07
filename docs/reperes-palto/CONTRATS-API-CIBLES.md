# Contrats API cibles

## Objectif
Definir des contrats unifies pour connecter completement chauffeur, organisation, client `/go`, conformite et stats.

## 1) Tarifs chauffeur

### GET `/api/chauffeur/pricing-preferences`
Retourne les preferences tarifaires effectives.

```json
{
  "driverId": "drv_123",
  "baseFareEur": 2.2,
  "pricePerKmEur": 1.4,
  "nightSurchargePercent": 18,
  "pricingMultiplierPercent": 100,
  "maxPickupKm": 15,
  "petFriendly": true,
  "luggageAssistance": true,
  "insulatedBag": true,
  "updatedAt": "2026-05-06T19:00:00.000Z"
}
```

### PUT `/api/chauffeur/pricing-preferences`
Met a jour les preferences.

## 2) Organisation flotte

### GET `/api/organizations/current`
Retourne l'organisation courante et les membres.

```json
{
  "organization": {
    "id": "org_001",
    "name": "Palto Nord",
    "baseCity": "Le Port",
    "fleetCode": "PLT-9Q2X",
    "createdAt": "2026-05-01T09:00:00.000Z"
  },
  "membership": {
    "driverId": "drv_123",
    "role": "admin"
  },
  "members": [
    {
      "driverId": "drv_123",
      "email": "admin@palto.re",
      "role": "admin",
      "availability": "online",
      "zoneId": "north"
    }
  ]
}
```

### POST `/api/organizations/invites`
Envoie une invitation.

### PATCH `/api/organizations/members/:driverId`
Met a jour zone/disponibilite/vehicule.

## 3) Conformite chauffeur

### GET `/api/chauffeur/compliance-status`
Retourne le statut legal global + par document.

```json
{
  "driverId": "drv_123",
  "isRideAllowed": true,
  "documents": [
    { "type": "permis", "status": "valid", "expiresAt": "2027-09-18" },
    { "type": "rc_pro", "status": "expiring", "expiresAt": "2026-06-05" }
  ],
  "updatedAt": "2026-05-06T18:00:00.000Z"
}
```

### POST `/api/chauffeur/compliance-documents`
Upload + cree une demande de verification.

## 4) Compte client / mes courses

### GET `/api/client/rides?status=upcoming|completed|cancelled`
Retourne les courses du client connecte.

```json
{
  "items": [
    {
      "id": "ride_001",
      "status": "accepted",
      "pickupAddress": "Le Port",
      "dropoffAddress": "La Possession",
      "scheduledAt": "2026-05-06T18:30:00.000Z",
      "amountEur": 15.9,
      "driver": { "id": "drv_123", "name": "Karim L." }
    }
  ]
}
```

## 5) Stats reelles

### GET `/api/chauffeur/stats?range=7d|30d|365d`
Retourne KPI + heatmap + streaks.

```json
{
  "kpis": {
    "completed": 124,
    "revenueEur": 3620.5,
    "acceptanceRate": 84,
    "cancellationRate": 9
  },
  "heatmap": {
    "weeks": 52,
    "cells": [[0,1,0,2,1,0,0]]
  },
  "streaks": {
    "currentDays": 5,
    "longestDays": 11,
    "mostActiveMonth": "January",
    "mostActiveDay": "Friday"
  }
}
```

## Regles transverses de contrat
- Tous les endpoints renvoient `requestId` pour debug observabilite.
- Validation stricte zod en entree/sortie.
- Dates en ISO8601 UTC.
- Montants en `number` (EUR), affichage localise uniquement cote front.
- Compatibilite migration: support temporaire champs legacy (`driver_external_key`) jusqu'a cutover.
