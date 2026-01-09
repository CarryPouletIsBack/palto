import React, { useRef, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import type { StravaActivity } from '../services/stravaService';

interface StravaSplineChartProps {
  activities: StravaActivity[];
  className?: string;
}

const StravaSplineChart: React.FC<StravaSplineChartProps> = ({ activities, className = '' }) => {
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // Préparer les données initiales à partir des activités Strava
  const initialData = useMemo(() => {
    if (!activities || activities.length === 0) {
      return [];
    }

    // Trier les activités par date
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
    );

    // Créer les données initiales avec les distances des activités
    const data = sortedActivities.map((activity, index) => {
      const activityTime = new Date(activity.start_date_local).getTime();
      const distance = activity.distance / 1000; // en km
      return {
        x: activityTime,
        y: distance,
      };
    });

    return data;
  }, [activities]);

  // L'effet qui ajoutait continuellement des points a été supprimé
  // Le graphique s'arrête maintenant à la dernière activité

  if (initialData.length === 0) {
    return (
      <div className={`strava-spline-container ${className}`} style={{ 
        width: '100%', 
        height: '200px', 
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
      type: 'spline',
      height: 200,
      backgroundColor: 'transparent',
      animation: {
        duration: 750,
        easing: 'easeOutQuad',
      },
      marginRight: 10,
    },
    time: {
      useUTC: false,
    },
    title: {
      text: '',
    },
    xAxis: {
      type: 'datetime',
      tickPixelInterval: 150,
      dateTimeLabelFormats: {
        day: '%d/%m/%Y',
        week: '%d/%m/%Y',
        month: '%m/%Y',
        year: '%Y',
      },
      labels: {
        style: {
          color: '#71717a',
          fontSize: '11px',
        },
        format: '{value:%d/%m/%Y}',
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
          fontSize: '11px',
        },
      },
      gridLineColor: '#e5e5e5',
      plotLines: [{
        value: 0,
        width: 1,
        color: '#808080',
      }],
    },
    tooltip: {
      backgroundColor: '#fff',
      borderColor: '#b2aaaa',
      borderRadius: 8,
      style: {
        color: '#222',
      },
      headerFormat: '<b>{series.name}</b><br/>',
      pointFormat: '{point.x:%d/%m/%Y}<br/>{point.y:.2f} km',
    },
    legend: {
      enabled: false,
    },
    exporting: {
      enabled: false,
    },
    credits: {
      enabled: false,
    },
    series: [
      {
        name: 'Distance',
        type: 'spline',
        data: initialData,
        color: '#f1582a',
        lineWidth: 2,
        animation: {
          duration: 1000,
        },
        marker: {
          enabled: false,
          radius: 3,
        },
      },
    ],
  };

  return (
    <div className={`strava-spline-container ${className}`} style={{ width: '100%', height: '200px' }}>
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        ref={chartRef}
      />
    </div>
  );
};

export default StravaSplineChart;
