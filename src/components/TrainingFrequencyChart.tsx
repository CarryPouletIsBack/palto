import { useMemo } from 'react';
import './TrainingFrequencyChart.css';
import type { StravaActivity } from '../services/stravaService';

interface TrainingFrequencyChartProps {
  activities: StravaActivity[];
}

const TrainingFrequencyChart: React.FC<TrainingFrequencyChartProps> = ({ activities }) => {
  const weeklyData = useMemo(() => {
    // Compter les activités par jour de la semaine (0 = Dimanche, 1 = Lundi, etc.)
    const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    activities.forEach((activity) => {
      const date = new Date(activity.start_date_local);
      const dayOfWeek = date.getDay(); // 0 (Dimanche) à 6 (Samedi)
      counts[dayOfWeek]++;
    });

    const maxCount = Math.max(...counts, 1); // Éviter la division par 0

    return daysOfWeek.map((day, index) => ({
      day,
      count: counts[index],
      percentage: (counts[index] / maxCount) * 100,
    }));
  }, [activities]);

  return (
    <div className="training-frequency-chart">
      <h3 className="chart-title">Fréquence d'entraînement</h3>
      <div className="chart-subtitle">Par jour de la semaine</div>
      <div className="chart-bars">
        {weeklyData.map((item, index) => (
          <div key={index} className="chart-bar-item">
            <div className="chart-bar-container">
              <div
                className="chart-bar-fill"
                style={{
                  height: `${item.percentage}%`,
                  backgroundColor: item.count > 0 ? '#fc5200' : '#e5e5e5',
                }}
              >
                {item.count > 0 && (
                  <span className="chart-bar-value">{item.count}</span>
                )}
              </div>
            </div>
            <div className="chart-bar-label">{item.day}</div>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#fc5200' }}></span>
          <span className="legend-text">Avec activité</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: '#e5e5e5' }}></span>
          <span className="legend-text">Aucune activité</span>
        </div>
      </div>
    </div>
  );
};

export default TrainingFrequencyChart;

