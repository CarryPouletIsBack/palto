// Mock data pour le développement local
// Ce fichier n'est utilisé que si VITE_USE_STRAVA_MOCK=true dans .env.local

import type { StravaActivity, StravaAthlete } from './stravaService'

// Mock des données de l'athlète
export const mockAthlete: StravaAthlete = {
  id: 123456,
  username: 'anthony_merault',
  resource_state: 2,
  firstname: 'Anthony',
  lastname: 'Merault',
  bio: 'Product designer UX/UI & Art director',
  city: 'Paris',
  state: 'Île-de-France',
  country: 'France',
  sex: 'M',
  premium: false,
  summit: false,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
  badge_type_id: 0,
  weight: 75,
  profile_medium: 'https://via.placeholder.com/56',
  profile: 'https://via.placeholder.com/124',
  friend: null,
  follower: null,
}

// Mock des activités (5 dernières)
export const mockActivities: StravaActivity[] = [
  {
    id: 1,
    name: 'Morning Run',
    distance: 5000, // 5 km
    moving_time: 1800, // 30 min
    elapsed_time: 1900,
    total_elevation_gain: 50,
    type: 'Run',
    start_date: '2025-01-15T07:00:00Z',
    start_date_local: '2025-01-15T08:00:00+01:00',
    timezone: '(GMT+01:00) Europe/Paris',
    utc_offset: 3600,
    location_city: 'Paris',
    location_state: 'Île-de-France',
    location_country: 'France',
    achievement_count: 0,
    kudos_count: 5,
    comment_count: 2,
    athlete_count: 1,
    photo_count: 1,
    map: {
      id: 'a1',
      summary_polyline: 'mock_polyline_1',
      resource_state: 2,
    },
    trainer: false,
    commute: false,
    manual: false,
    private: false,
    visibility: 'everyone',
    flagged: false,
    gear_id: null,
    start_latlng: [48.8566, 2.3522],
    end_latlng: [48.8606, 2.3622],
    average_speed: 2.78, // ~10 km/h
    max_speed: 3.5,
    average_cadence: 170,
    average_temp: 12,
    has_heartrate: true,
    average_heartrate: 145,
    max_heartrate: 165,
    elev_high: 100,
    elev_low: 50,
    pr_count: 1,
    total_photo_count: 1,
    has_kudoed: false,
    primary_photo: {
      id: 1,
      unique_id: 'photo_1',
      urls: {
        '100': 'https://via.placeholder.com/100',
        '600': 'https://via.placeholder.com/600',
      },
      source: 1,
    },
  },
  {
    id: 2,
    name: 'Cycling Training',
    distance: 25000, // 25 km
    moving_time: 3600, // 1h
    elapsed_time: 3800,
    total_elevation_gain: 200,
    type: 'Ride',
    start_date: '2025-01-14T18:00:00Z',
    start_date_local: '2025-01-14T19:00:00+01:00',
    timezone: '(GMT+01:00) Europe/Paris',
    utc_offset: 3600,
    location_city: 'Paris',
    location_state: 'Île-de-France',
    location_country: 'France',
    achievement_count: 1,
    kudos_count: 8,
    comment_count: 3,
    athlete_count: 1,
    photo_count: 0,
    map: {
      id: 'a2',
      summary_polyline: 'mock_polyline_2',
      resource_state: 2,
    },
    trainer: false,
    commute: false,
    manual: false,
    private: false,
    visibility: 'everyone',
    flagged: false,
    gear_id: 'b123',
    start_latlng: [48.8566, 2.3522],
    end_latlng: [48.8566, 2.3522],
    average_speed: 6.94, // ~25 km/h
    max_speed: 12.5,
    average_cadence: 85,
    average_temp: 10,
    has_heartrate: true,
    average_heartrate: 135,
    max_heartrate: 155,
    elev_high: 150,
    elev_low: 50,
    pr_count: 0,
    total_photo_count: 0,
    has_kudoed: false,
  },
  {
    id: 3,
    name: 'Evening Walk',
    distance: 3000, // 3 km
    moving_time: 2400, // 40 min
    elapsed_time: 2500,
    total_elevation_gain: 20,
    type: 'Walk',
    start_date: '2025-01-13T19:00:00Z',
    start_date_local: '2025-01-13T20:00:00+01:00',
    timezone: '(GMT+01:00) Europe/Paris',
    utc_offset: 3600,
    location_city: 'Paris',
    location_state: 'Île-de-France',
    location_country: 'France',
    achievement_count: 0,
    kudos_count: 3,
    comment_count: 1,
    athlete_count: 1,
    photo_count: 1,
    map: {
      id: 'a3',
      summary_polyline: 'mock_polyline_3',
      resource_state: 2,
    },
    trainer: false,
    commute: false,
    manual: false,
    private: false,
    visibility: 'everyone',
    flagged: false,
    gear_id: null,
    start_latlng: [48.8566, 2.3522],
    end_latlng: [48.8506, 2.3422],
    average_speed: 1.25, // ~4.5 km/h
    max_speed: 1.5,
    average_cadence: null,
    average_temp: 8,
    has_heartrate: false,
    average_heartrate: null,
    max_heartrate: null,
    elev_high: 80,
    elev_low: 60,
    pr_count: 0,
    total_photo_count: 1,
    has_kudoed: false,
    primary_photo: {
      id: 3,
      unique_id: 'photo_3',
      urls: {
        '100': 'https://via.placeholder.com/100',
        '600': 'https://via.placeholder.com/600',
      },
      source: 1,
    },
  },
  {
    id: 4,
    name: 'Long Run',
    distance: 10000, // 10 km
    moving_time: 3600, // 1h
    elapsed_time: 3700,
    total_elevation_gain: 100,
    type: 'Run',
    start_date: '2025-01-12T08:00:00Z',
    start_date_local: '2025-01-12T09:00:00+01:00',
    timezone: '(GMT+01:00) Europe/Paris',
    utc_offset: 3600,
    location_city: 'Paris',
    location_state: 'Île-de-France',
    location_country: 'France',
    achievement_count: 2,
    kudos_count: 12,
    comment_count: 5,
    athlete_count: 1,
    photo_count: 2,
    map: {
      id: 'a4',
      summary_polyline: 'mock_polyline_4',
      resource_state: 2,
    },
    trainer: false,
    commute: false,
    manual: false,
    private: false,
    visibility: 'everyone',
    flagged: false,
    gear_id: null,
    start_latlng: [48.8566, 2.3522],
    end_latlng: [48.8566, 2.3522],
    average_speed: 2.78, // ~10 km/h
    max_speed: 3.8,
    average_cadence: 175,
    average_temp: 5,
    has_heartrate: true,
    average_heartrate: 150,
    max_heartrate: 170,
    elev_high: 120,
    elev_low: 50,
    pr_count: 2,
    total_photo_count: 2,
    has_kudoed: false,
    primary_photo: {
      id: 4,
      unique_id: 'photo_4',
      urls: {
        '100': 'https://via.placeholder.com/100',
        '600': 'https://via.placeholder.com/600',
      },
      source: 1,
    },
  },
  {
    id: 5,
    name: 'Swimming Session',
    distance: 1500, // 1.5 km
    moving_time: 1800, // 30 min
    elapsed_time: 2000,
    total_elevation_gain: 0,
    type: 'Swim',
    start_date: '2025-01-11T12:00:00Z',
    start_date_local: '2025-01-11T13:00:00+01:00',
    timezone: '(GMT+01:00) Europe/Paris',
    utc_offset: 3600,
    location_city: 'Paris',
    location_state: 'Île-de-France',
    location_country: 'France',
    achievement_count: 1,
    kudos_count: 6,
    comment_count: 2,
    athlete_count: 1,
    photo_count: 0,
    map: {
      id: 'a5',
      summary_polyline: 'mock_polyline_5',
      resource_state: 2,
    },
    trainer: false,
    commute: false,
    manual: false,
    private: false,
    visibility: 'everyone',
    flagged: false,
    gear_id: null,
    start_latlng: null,
    end_latlng: null,
    average_speed: 0.83, // ~3 km/h (natation)
    max_speed: 1.2,
    average_cadence: null,
    average_temp: 25,
    has_heartrate: true,
    average_heartrate: 130,
    max_heartrate: 145,
    elev_high: null,
    elev_low: null,
    pr_count: 1,
    total_photo_count: 0,
    has_kudoed: false,
  },
]

// Générer des activités pour 2025 (plus nombreuses pour les graphiques)
export function generateMockActivities2025(): StravaActivity[] {
  const activities: StravaActivity[] = []
  const types = ['Run', 'Ride', 'Walk', 'Swim']
  const baseDate = new Date('2025-01-01')
  
  // Générer ~30 activités pour 2025
  for (let i = 0; i < 30; i++) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() + i * 2) // Une activité tous les 2 jours environ
    
    const type = types[i % types.length]
    const distance = type === 'Run' ? 5000 + Math.random() * 5000 :
                     type === 'Ride' ? 20000 + Math.random() * 30000 :
                     type === 'Walk' ? 2000 + Math.random() * 3000 :
                     1000 + Math.random() * 2000
    
    const movingTime = Math.floor(distance / (type === 'Run' ? 3 : type === 'Ride' ? 7 : type === 'Walk' ? 1.2 : 0.8))
    
    activities.push({
      id: 100 + i,
      name: `${type} ${i + 1}`,
      distance: Math.floor(distance),
      moving_time: movingTime,
      elapsed_time: movingTime + 100,
      total_elevation_gain: type === 'Swim' ? 0 : Math.floor(Math.random() * 200),
      type,
      start_date: date.toISOString(),
      start_date_local: new Date(date.getTime() + 3600000).toISOString(),
      timezone: '(GMT+01:00) Europe/Paris',
      utc_offset: 3600,
      location_city: 'Paris',
      location_state: 'Île-de-France',
      location_country: 'France',
      achievement_count: Math.floor(Math.random() * 3),
      kudos_count: Math.floor(Math.random() * 15),
      comment_count: Math.floor(Math.random() * 5),
      athlete_count: 1,
      photo_count: Math.random() > 0.5 ? 1 : 0,
      map: {
        id: `a${100 + i}`,
        summary_polyline: `mock_polyline_${100 + i}`,
        resource_state: 2,
      },
      trainer: false,
      commute: false,
      manual: false,
      private: false,
      visibility: 'everyone',
      flagged: false,
      gear_id: type === 'Ride' ? 'b123' : null,
      start_latlng: [48.8566 + (Math.random() - 0.5) * 0.1, 2.3522 + (Math.random() - 0.5) * 0.1],
      end_latlng: [48.8566 + (Math.random() - 0.5) * 0.1, 2.3522 + (Math.random() - 0.5) * 0.1],
      average_speed: distance / movingTime,
      max_speed: (distance / movingTime) * 1.5,
      average_cadence: type === 'Run' ? 170 + Math.floor(Math.random() * 20) : type === 'Ride' ? 80 + Math.floor(Math.random() * 20) : null,
      average_temp: 5 + Math.random() * 15,
      has_heartrate: type !== 'Swim',
      average_heartrate: type !== 'Swim' ? 120 + Math.floor(Math.random() * 50) : null,
      max_heartrate: type !== 'Swim' ? 150 + Math.floor(Math.random() * 40) : null,
      elev_high: type === 'Swim' ? null : 50 + Math.floor(Math.random() * 100),
      elev_low: type === 'Swim' ? null : 30 + Math.floor(Math.random() * 50),
      pr_count: Math.floor(Math.random() * 3),
      total_photo_count: Math.random() > 0.5 ? 1 : 0,
      has_kudoed: false,
      primary_photo: Math.random() > 0.5 ? {
        id: 100 + i,
        unique_id: `photo_${100 + i}`,
        urls: {
          '100': 'https://via.placeholder.com/100',
          '600': 'https://via.placeholder.com/600',
        },
        source: 1,
      } : undefined,
    })
  }
  
  return activities
}

// Fonction pour simuler un délai réseau
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Fonctions mockées qui simulent les appels API
export async function mockGetStravaActivities(perPage: number = 10, page: number = 1): Promise<StravaActivity[]> {
  await delay(500) // Simuler un délai réseau
  console.log('🎭 [MOCK] getStravaActivities appelé', { perPage, page })
  return mockActivities.slice(0, perPage)
}

export async function mockGetStravaActivitiesByYear(year: number = 2025): Promise<StravaActivity[]> {
  await delay(500)
  console.log('🎭 [MOCK] getStravaActivitiesByYear appelé', { year })
  return generateMockActivities2025()
}

export async function mockGetStravaAthlete(): Promise<StravaAthlete> {
  await delay(300)
  console.log('🎭 [MOCK] getStravaAthlete appelé')
  return mockAthlete
}

export async function mockGetStravaActivityDetails(activityId: number): Promise<StravaActivity> {
  await delay(300)
  console.log('🎭 [MOCK] getStravaActivityDetails appelé', { activityId })
  
  // Chercher dans les activités mockées
  const activity = mockActivities.find(a => a.id === activityId) || 
                   generateMockActivities2025().find(a => a.id === activityId)
  
  if (!activity) {
    throw new Error(`Activité ${activityId} non trouvée`)
  }
  
  return activity
}
