'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import WidgetCard from '../WidgetCard';
import { CHART_THEME } from '../widgetRegistry';

export default function RevenueVelocity({ data }) {
  const daily = data?.dailyRevenue?.current || [];
  const prevTotal = data?.dailyRevenue?.previousPeriodTotal || 0;
  const dailyAvg = prevTotal / 30;

  const chartData = daily.map(d => ({
    date: d.date.slice(5),
    revenue: d.revenue,
    above: d.revenue >= dailyAvg,
  }));

  const currentTotal = daily.reduce((s, d) => s + d.revenue, 0);
  const diff = prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0;

  return (
    <WidgetCard title="Revenue Velocity" subtitle={`Last 30 days ${diff >= 0 ? '+' : ''}${diff}% vs prior period`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
          <XAxis dataKey="date" tick={{ fill: CHART_THEME.textSecondary, fontSize: 9 }} tickLine={false} axisLine={false} interval={4} />
          <YAxis tick={{ fill: CHART_THEME.textSecondary, fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
          <Tooltip
            contentStyle={{ backgroundColor: CHART_THEME.tooltipBg, border: `1px solid ${CHART_THEME.tooltipBorder}`, borderRadius: '0.5rem', color: CHART_THEME.textPrimary, fontSize: 12 }}
            cursor={{ fill: 'rgba(201,168,76,0.05)' }}
            formatter={(val) => [`$${val.toLocaleString()}`, 'Revenue']}
          />
          <ReferenceLine y={dailyAvg} stroke={CHART_THEME.textSecondary} strokeDasharray="3 3" label={false} />
          <Bar dataKey="revenue" radius={[2, 2, 0, 0]} fill={CHART_THEME.gold} />
        </BarChart>
      </ResponsiveContainer>
    </WidgetCard>
  );
}
