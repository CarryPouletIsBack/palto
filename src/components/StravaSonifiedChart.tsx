import { useMemo, useEffect, type FC } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import type { StravaActivity } from '../services/stravaService';

interface StravaSonifiedChartProps {
  activities: StravaActivity[];
  className?: string;
}

const StravaSonifiedChart: FC<StravaSonifiedChartProps> = ({ activities, className = '' }) => {
  // Initialiser le module de sonification de manière dynamique
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('highcharts/modules/sonification')
        .then((sonification) => {
          sonification.default(Highcharts);
        })
        .catch(() => {
          // Module de sonification non disponible
        });
    }
  }, []);
  const chartData = useMemo(() => {
    if (!activities || activities.length === 0) {
      return null;
    }

    // Trier les activités par date
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
    );

    // Préparer les données pour le graphique
    const categories = sortedActivities.map(activity => {
      const date = new Date(activity.start_date_local);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const distances = sortedActivities.map(activity => activity.distance / 1000); // en km
    const durations = sortedActivities.map(activity => activity.moving_time / 60); // en minutes

    return { categories, distances, durations };
  }, [activities]);

  if (!chartData) {
    return (
      <div className={`strava-sonified-container ${className}`} style={{ 
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
    chart: {
      type: 'line',
      height: 250,
      backgroundColor: 'transparent',
    },
    title: {
      text: '',
    },
    xAxis: {
      categories: chartData.categories,
      labels: {
        style: {
          color: '#71717a',
          fontSize: '12px',
        },
      },
      lineColor: '#b2aaaa',
      tickColor: '#b2aaaa',
    },
    yAxis: {
      title: {
        text: '',
      },
      labels: {
        style: {
          color: '#71717a',
          fontSize: '12px',
        },
      },
      gridLineColor: '#e5e5e5',
    },
    series: [
      {
        name: 'Distance (km)',
        type: 'line',
        data: chartData.distances,
        color: '#f1582a',
        lineWidth: 2,
        marker: {
          radius: 4,
          fillColor: '#f1582a',
        },
      },
    ],
    legend: {
      enabled: false,
    },
    tooltip: {
      backgroundColor: '#fff',
      borderColor: '#b2aaaa',
      borderRadius: 8,
      style: {
        color: '#222',
      },
      formatter: function() {
        return `<b>${this.x}</b><br/>Distance: ${this.y?.toFixed(2)} km`;
      },
    },
    plotOptions: {
      line: {
        enableMouseTracking: true,
      },
    },
    // Configuration de la sonification
    sonification: {
      enabled: true,
      duration: 2000,
      afterEnd: 500,
      defaultInstrumentOptions: {
        instrument: 'sine',
        mapping: {
          pitch: {
            mapTo: 'y',
            min: 'dataMin',
            max: 'dataMax',
            within: 'series',
          },
          time: {
            mapTo: 'x',
            min: 0,
            max: 'seriesLength',
          },
        },
      },
      events: {
        onPlay: () => {},
        onEnd: () => {},
      },
    },
    credits: {
      enabled: false,
    },
  };

  return (
    <div className={`strava-sonified-container ${className}`} style={{ width: '100%', height: '250px' }}>
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
      />
    </div>
  );
};

export default StravaSonifiedChart;
