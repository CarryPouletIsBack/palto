import { useMemo, type FC } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

export interface PositionnementMatrixPoint {
  name: string;
  description: string;
  x: number;
  y: number;
}

export interface PositionnementMatrixData {
  xAxisLabel: string;
  yAxisLabel: string;
  xMinLabel: string;
  xMaxLabel: string;
  yMinLabel: string;
  yMaxLabel: string;
  points: PositionnementMatrixPoint[];
}

interface PositionnementMatrixChartProps {
  data: PositionnementMatrixData;
  className?: string;
}

/** Style inspiré du demo Highcharts "Sonified function" : axes croisés à 0, grille, rendu épuré */
const PositionnementMatrixChart: FC<PositionnementMatrixChartProps> = ({ data, className = '' }) => {
  const { t } = useLanguage();
  const options = useMemo<Highcharts.Options>(() => ({
    chart: {
      type: 'scatter',
      backgroundColor: 'transparent',
      plotBackgroundColor: 'transparent',
      plotBorderWidth: 0,
      marginLeft: 56,
      marginRight: 56,
      marginBottom: 56,
      marginTop: 48,
    },
    title: { text: null },
    credits: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      min: -10,
      max: 10,
      gridLineWidth: 0,
      tickInterval: 2,
      crossing: 0,
      lineWidth: 1,
      tickLength: 0,
      labels: {
        formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
          const v = this.value as number;
          if (v === -10) return data.xMinLabel;
          if (v === 10) return data.xMaxLabel;
          return String(v);
        },
        style: { fontSize: '11px', color: '#666' },
      },
    },
    yAxis: {
      min: -10,
      max: 10,
      gridLineWidth: 0,
      tickInterval: 2,
      crossing: 0,
      lineWidth: 1,
      tickLength: 0,
      title: { text: null },
      labels: {
        formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
          const v = this.value as number;
          if (v === -10) return data.yMinLabel;
          if (v === 10) return data.yMaxLabel;
          return String(v);
        },
        style: { fontSize: '11px', color: '#666' },
      },
    },
    tooltip: {
      useHTML: true,
      formatter: function (this: Highcharts.TooltipFormatterContextObject) {
        const p = this.point as Highcharts.Point & { description?: string };
        return `<strong>${p.name}</strong><br/>${p.description ?? ''}`;
      },
    },
    plotOptions: {
      scatter: {
        marker: {
          radius: 6,
          symbol: 'circle',
          lineWidth: 1,
          lineColor: '#333',
          fillColor: '#fff',
          states: { hover: { radius: 8, lineWidth: 2 } },
        },
        dataLabels: {
          enabled: true,
          format: '{point.name}',
          style: {
            fontSize: '12px',
            fontWeight: '600',
            textOutline: 'none',
          },
          verticalAlign: 'middle',
          y: 0,
        },
      },
    },
    series: [{
      type: 'scatter',
      data: data.points.map((p) => ({
        x: p.x,
        y: p.y,
        name: p.name,
        description: p.description,
      })),
      color: '#333',
      marker: { fillColor: '#fff' },
    }],
  }), [data]);

  return (
    <div className={`positionnement-matrix ${className}`.trim()}>
      <div className="positionnement-matrix-chart-area">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
      <div className="positionnement-matrix-legend">
        <span className="positionnement-matrix-legend-x">
          {t('project.axisHorizontal')}: {data.xAxisLabel}
        </span>
        <span className="positionnement-matrix-legend-y">
          {t('project.axisVertical')}: {data.yAxisLabel}
        </span>
      </div>
    </div>
  );
};

export default PositionnementMatrixChart;
