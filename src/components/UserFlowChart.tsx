import { useMemo, type FC } from 'react';
import Highcharts from 'highcharts/esm/highcharts';
import HighchartsReact from 'highcharts-react-official';
import 'highcharts/esm/modules/sankey';
import 'highcharts/esm/modules/organization';

export interface UserFlowLink {
  from: string;
  to: string;
}

export interface UserFlowNode {
  id: string;
  name?: string;
  title?: string;
}

export interface UserFlowData {
  title?: string;
  nodes: UserFlowNode[];
  links: UserFlowLink[];
}

interface UserFlowChartProps {
  data: UserFlowData;
  className?: string;
}

const UserFlowChart: FC<UserFlowChartProps> = ({ data, className = '' }) => {
  const options = useMemo<Highcharts.Options>(() => ({
    chart: {
      height: 600,
      inverted: true,
      backgroundColor: 'transparent',
    },
    title: { text: null },
    credits: { enabled: false },
    series: [{
      type: 'organization',
      name: data.title ?? 'User flow',
      keys: ['from', 'to'],
      data: data.links.map((l) => [l.from, l.to]),
      nodes: data.nodes,
      colorByPoint: false,
      color: '#eaeae6',
      borderColor: '#b2aaaa',
      dataLabels: { color: '#1f2937' },
      levels: [{
        level: 0,
        color: '#eaeae6',
        dataLabels: { color: '#1f2937' },
        height: 25,
      }, {
        level: 1,
        color: '#eaeae6',
        dataLabels: { color: '#1f2937' },
        height: 25,
      }, {
        level: 2,
        color: '#eaeae6',
        dataLabels: { color: '#1f2937' },
      }, {
        level: 3,
        color: '#eaeae6',
        dataLabels: { color: '#1f2937' },
      }],
      nodeWidth: 'auto',
    }],
    tooltip: { outside: true },
  }), [data]);

  return (
    <div className={`userflow-chart ${className}`.trim()}>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
};

export default UserFlowChart;
