import { useMemo } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import { Box, useTheme } from '@mui/material';
import { type StravaActivity, formatDistance } from '../services/stravaService';

interface TrainingJournalChartProps {
  activities: StravaActivity[];
}

const TrainingJournalChart: React.FC<TrainingJournalChartProps> = ({ activities }) => {
  const theme = useTheme();

  // Grouper les activités par semaine et calculer la distance totale par semaine
  const weeklyData = useMemo(() => {
    if (!activities || activities.length === 0) {
      return { dates: [], distances: [] };
    }

    // Trier les activités par date
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
    );

    // Grouper par semaine
    const weekMap = new Map<string, number>();

    sortedActivities.forEach(activity => {
      const date = new Date(activity.start_date_local);
      // Obtenir le lundi de la semaine (début de semaine)
      const dayOfWeek = date.getDay(); // 0 = dimanche, 1 = lundi, etc.
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Nombre de jours à soustraire pour obtenir le lundi
      const monday = new Date(date);
      monday.setDate(date.getDate() - daysToMonday);
      monday.setHours(0, 0, 0, 0);
      
      const weekKey = monday.toISOString().split('T')[0];
      const distanceInKm = activity.distance / 1000;
      
      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + distanceInKm);
    });

    // Convertir en tableaux triés
    const weeks = Array.from(weekMap.keys()).sort();
    const dates = weeks.map(week => new Date(week));
    const distances = weeks.map(week => Math.round(weekMap.get(week)! * 10) / 10); // Arrondir à 1 décimale

    return { dates, distances };
  }, [activities]);

  if (!activities || activities.length === 0) {
    return (
      <Box sx={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.4)', fontSize: '14px' }}>
        Aucune donnée d'activité pour le journal d'entraînement.
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 200 }}>
      <LineChart
        xAxis={[
          {
            data: weeklyData.dates,
            scaleType: 'time',
            valueFormatter: (date) => {
              const d = new Date(date);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            },
          },
        ]}
        series={[
          {
            data: weeklyData.distances,
            label: 'Distance (km)',
            color: theme.palette.primary.main,
            curve: 'monotoneX',
          },
        ]}
        height={200}
        margin={{ top: 10, bottom: 30, left: 40, right: 20 }}
        grid={{ vertical: true, horizontal: true }}
        sx={{
          '& .MuiChartsAxis-root': {
            fontSize: '12px',
            fill: theme.palette.text.secondary,
          },
          '& .MuiChartsGrid-root': {
            stroke: theme.palette.divider,
            strokeDasharray: '2 2',
          },
        }}
      />
    </Box>
  );
};

export default TrainingJournalChart;

