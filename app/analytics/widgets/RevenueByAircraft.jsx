'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import WidgetCard from '../WidgetCard';
import { CHART_THEME } from '../widgetRegistry';

export default function RevenueByAircraft({ data }) {
  const items = data?.revenueByAircraftType || [];

  return (
    <WidgetCard title="Revenue per Aircraft Type">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 5 }}>
          <XAxis type="number" tick={{ fill: CHART_THEME.textSecondary, fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
          <YAxis type="category" dataKey="type" tick={{ fill: CHART_THEME.textPrimary, fontSize: 10 }} tickLine={false} axisLine={false} width={100} />
          <Tooltip
            contentStyle={{ backgroundColor: CHART_THEME.tooltipBg, border: `1px solid ${CHART_THEME.tooltipBorder}`, borderRadius: '0.5rem', color: CHART_THEME.textPrimary, fontSize: 12 }}
            formatter={(val) => [`$${val.toLocaleString()}`, 'Revenue']}
          />
          <Bar dataKey="revenue" fill={CHART_THEME.gold} radius={[0, 3, 3, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </WidgetCard>
  );
}
