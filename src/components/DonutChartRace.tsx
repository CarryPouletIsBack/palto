import { useEffect, useState, useMemo, useRef, type FC } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface DonutChartRaceProps {
  value: number; // Valeur en pourcentage (0-100)
  color?: string;
  size?: number;
  animated?: boolean;
  delay?: number; // Délai avant le début de l'animation (pour l'effet "race")
}

const DonutChartRace: FC<DonutChartRaceProps> = ({ 
  value, 
  color = '#f1582a',
  size = 200,
  animated = true,
  delay = 0
}) => {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Animation de la valeur avec délai pour l'effet "race"
  useEffect(() => {
    if (!animated || hasAnimated) {
      setDisplayValue(value);
      return;
    }

    const startAnimation = () => {
      const duration = 1500; // Durée de l'animation en ms
      const startValue = 0;
      const endValue = value;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out cubic)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (endValue - startValue) * easeOut;
        
        setDisplayValue(currentValue);

        // Mettre à jour le chart
        if (chartRef.current?.chart) {
          const chart = chartRef.current.chart;
          if (chart.series && chart.series[0]) {
            chart.series[0].setData([
              { y: currentValue, color: color },
              { y: 100 - currentValue, color: '#d4d4d4' }
            ], true, false); // true = redraw, false = no animation (on gère l'animation manuellement)
          }
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setHasAnimated(true);
        }
      };

      requestAnimationFrame(animate);
    };

    const timeoutId = setTimeout(startAnimation, delay);
    return () => clearTimeout(timeoutId);
  }, [value, animated, delay, color, hasAnimated]);

  const chartOptions = useMemo<Highcharts.Options>(() => {
    const donutSize = size * 0.75; // Taille du donut (75% de la taille totale)
    
    return {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        height: size,
        width: size,
        animation: false,
        spacing: [0, 0, 0, 0],
        margin: [0, 0, 0, 0],
      },
      title: {
        text: null,
      },
      credits: {
        enabled: false,
      },
      tooltip: {
        enabled: false,
      },
      legend: {
        enabled: false,
      },
      plotOptions: {
        pie: {
          innerSize: '70%',
          size: donutSize,
          center: ['50%', '50%'],
          dataLabels: {
            enabled: false,
          },
          states: {
            hover: {
              enabled: false,
            },
            inactive: {
              opacity: 1,
            },
          },
          borderWidth: 0,
          slicedOffset: 0,
          animation: false,
        },
      },
      series: [
        {
          name: 'Value',
          type: 'pie',
          data: [
            {
              name: 'Progress',
              y: displayValue,
              color: color,
            },
            {
              name: 'Remaining',
              y: Math.max(0, 100 - displayValue),
              color: '#d4d4d4',
            },
          ],
          enableMouseTracking: false,
          animation: false,
        },
      ],
    };
  }, [displayValue, color, size]);

  return (
    <div className="donut-chart-race-container" style={{ position: 'relative', width: size, height: size }}>
      <HighchartsReact
        ref={chartRef}
        highcharts={Highcharts}
        options={chartOptions}
      />
      {/* Texte au centre du donut - uniquement le pourcentage */}
      <div className="donut-chart-center-label">
        <span className="donut-chart-percentage">{Math.round(displayValue)}%</span>
      </div>
    </div>
  );
};

export default DonutChartRace;