import { useMemo, useEffect, useState, type FC } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import type { StravaActivity } from '../services/stravaService';

// Charger le module highcharts-more de manière synchrone
let highchartsMoreLoaded = false;
if (typeof window !== 'undefined') {
  import('highcharts/highcharts-more')
    .then((highchartsMore) => {
      const initHighchartsMore = (highchartsMore as any).default || highchartsMore;
      if (typeof initHighchartsMore === 'function') {
        initHighchartsMore(Highcharts);
      }
      highchartsMoreLoaded = true;
    })
    .catch(() => {
      highchartsMoreLoaded = true; // Continuer même si le module ne charge pas
    });
}

interface StravaRadialBarChartProps {
  activities: StravaActivity[];
  className?: string;
}

const StravaRadialBarChart: FC<StravaRadialBarChartProps> = ({ activities, className = '' }) => {
  const [moduleLoaded, setModuleLoaded] = useState(highchartsMoreLoaded);

  useEffect(() => {
    // Vérifier périodiquement si le module est chargé
    if (!moduleLoaded) {
      const checkInterval = setInterval(() => {
        if (highchartsMoreLoaded) {
          setModuleLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);

      // Timeout après 2 secondes
      setTimeout(() => {
        clearInterval(checkInterval);
        setModuleLoaded(true);
      }, 2000);

      return () => clearInterval(checkInterval);
    }
  }, [moduleLoaded]);

  const chartData = useMemo(() => {
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
    
    // Trouver les valeurs maximales pour normalisation
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
      categories: [
        'Distance',
        'Temps',
        'Dénivelé',
        'Vitesse',
        'Activités'
      ],
      data: [
        normalizedDistance,
        normalizedTime,
        normalizedElevation,
        normalizedSpeed,
        normalizedCount
      ]
    };
  }, [activities]);

  if (!chartData) {
    return (
      <div className={`strava-radial-bar-container ${className}`} style={{ 
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

  const options: Highcharts.Options = {
    colors: ['#509ED8'],
    chart: {
      type: 'column',
      inverted: true,
      polar: true,
      height: 250,
      backgroundColor: 'transparent',
      plotBackgroundColor: 'transparent',
    },
    title: {
      text: '',
    },
    subtitle: {
      text: '',
    },
    tooltip: {
      outside: true,
      backgroundColor: '#fff',
      borderColor: '#b2aaaa',
      borderRadius: 8,
      style: {
        color: '#222',
      },
      pointFormat: '<b>{point.category}</b><br/>{point.y:.1f}%',
    },
    pane: {
      size: '85%',
      innerSize: '20%',
      endAngle: 270,
    },
    xAxis: {
      tickInterval: 1,
      labels: {
        align: 'right',
        allowOverlap: true,
        step: 1,
        y: 3,
        style: {
          color: '#71717a',
          fontSize: '13px',
        },
      },
      lineWidth: 0,
      gridLineWidth: 0,
      categories: chartData.categories,
    },
    yAxis: {
      min: 0,
      max: 100,
      lineWidth: 0,
      tickInterval: 25,
      reversedStacks: false,
      endOnTick: true,
      showLastLabel: true,
      gridLineWidth: 0,
      labels: {
        style: {
          color: '#71717a',
          fontSize: '11px',
        },
      },
    },
    plotOptions: {
      column: {
        borderWidth: 0,
        pointPadding: 0,
        groupPadding: 0.15,
        borderRadius: {
          radius: '50%',
          where: 'all',
        },
      },
    },
    series: [
      {
        name: 'Performance',
        type: 'column',
        data: chartData.data,
      },
    ],
    legend: {
      enabled: false,
    },
    credits: {
      enabled: false,
    },
  };

  if (!moduleLoaded) {
    return (
      <div className={`strava-radial-bar-container ${className}`} style={{ 
        width: '100%', 
        height: '250px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#71717a',
        fontSize: '14px'
      }}>
        Chargement...
      </div>
    );
  }

  return (
    <div className={`strava-radial-bar-container ${className}`} style={{ 
      width: '100%', 
      height: '250px',
      backgroundColor: 'transparent',
    }}>
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
      />
    </div>
  );
};

export default StravaRadialBarChart;
