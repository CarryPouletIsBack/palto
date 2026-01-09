import React, { useMemo } from 'react';
import { RadarChart } from '@mui/x-charts/RadarChart';
import type { StravaActivity } from '../services/stravaService';

interface StravaRadarChartProps {
  activities: StravaActivity[];
  className?: string;
}

const StravaRadarChart: React.FC<StravaRadarChartProps> = ({ activities, className = '' }) => {
  const radarData = useMemo(() => {
    if (!activities || activities.length === 0) {
      return null;
    }

    // Calculer les métriques basées sur les activités
    const totalDistance = activities.reduce((sum, activity) => sum + activity.distance, 0) / 1000; // en km
    const totalTime = activities.reduce((sum, activity) => sum + activity.moving_time, 0) / 3600; // en heures
    const totalElevation = activities.reduce((sum, activity) => sum + (activity.total_elevation_gain || 0), 0); // en mètres
    const avgSpeed = activities.length > 0 
      ? (totalDistance / totalTime) || 0 
      : 0; // km/h
    const activityCount = activities.length;
    
    // Trouver les valeurs maximales pour normalisation (sur les 30 derniers jours ou moyenne)
    // Pour simplifier, on utilise des valeurs maximales typiques
    const maxDistance = 100; // 100 km
    const maxTime = 10; // 10 heures
    const maxElevation = 2000; // 2000 m
    const maxSpeed = 30; // 30 km/h
    const maxCount = 10; // 10 activités

    // Normaliser les valeurs entre 0 et 100
    const normalizedDistance = Math.min((totalDistance / maxDistance) * 100, 100);
    const normalizedTime = Math.min((totalTime / maxTime) * 100, 100);
    const normalizedElevation = Math.min((totalElevation / maxElevation) * 100, 100);
    const normalizedSpeed = Math.min((avgSpeed / maxSpeed) * 100, 100);
    const normalizedCount = Math.min((activityCount / maxCount) * 100, 100);

    return {
      data: [
        normalizedDistance,
        normalizedTime,
        normalizedElevation,
        normalizedSpeed,
        normalizedCount
      ],
      metrics: [
        'Distance',
        'Temps',
        'Dénivelé',
        'Vitesse',
        'Activités'
      ]
    };
  }, [activities]);

  if (!radarData) {
    return (
      <div className={`strava-radar-container ${className}`} style={{ 
        width: '100%', 
        height: '250px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#71717a',
        fontSize: '14px'
      }}>
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <div className={`strava-radar-container ${className}`} style={{ width: '100%', height: '250px' }}>
      <RadarChart
        height={250}
        series={[
          {
            label: 'Performance',
            data: radarData.data,
            fillArea: true,
          }
        ]}
        shape="circular"
        divisions={2}
        stripeColor={null}
        radar={{
          startAngle: 0,
          metrics: radarData.metrics,
        }}
        slotProps={{
          legend: {
            hidden: true,
          },
          tooltip: {
            trigger: 'axis',
          },
        }}
      />
    </div>
  );
};

export default StravaRadarChart;

