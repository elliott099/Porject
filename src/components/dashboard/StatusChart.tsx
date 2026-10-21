import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { TaskStatus } from '../../types/index.ts';

interface StatusDistributionItem {
  status: TaskStatus;
  label: string;
  count: number;
}

const COLORS: Record<TaskStatus, string> = {
  PENDING: '#F59E0B', // Amber
  IN_PROGRESS: '#4F46E5', // Indigo
  COMPLETED: '#10B981', // Emerald
};

export function StatusChart({ data }: { data: StatusDistributionItem[] }) {
  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  if (total === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
        No task status data available
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
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
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="count"
          >
            {data.map((entry) => (
              <Cell key={`cell-${entry.status}`} fill={COLORS[entry.status]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-1 text-xs">
        {data.map((item) => (
          <div key={item.status} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: COLORS[item.status] }}
            />
            <span className="text-slate-600 font-medium">{item.label}</span>
            <span className="text-slate-400 font-mono tabular-nums">({item.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
