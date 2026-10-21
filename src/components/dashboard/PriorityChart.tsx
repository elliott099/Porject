import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { TaskPriority } from '../../types/index.ts';

interface PriorityDistributionItem {
  priority: TaskPriority;
  label: string;
  count: number;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  CRITICAL: '#E11D48', // Rose 600
  HIGH: '#F59E0B', // Amber 500
  MEDIUM: '#6366F1', // Indigo 500
  LOW: '#94A3B8', // Slate 400
};

export function PriorityChart({ data }: { data: PriorityDistributionItem[] }) {
  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  if (total === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
        No task priority data available
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            stroke="#94A3B8"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <YAxis
            stroke="#94A3B8"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E293B',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              color: '#F8FAFC',
            }}
            formatter={(value: unknown) => [`${value} tasks`, 'Count']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={`bar-${entry.priority}`}
                fill={PRIORITY_COLORS[entry.priority]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
