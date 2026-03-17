'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import WidgetCard from '../WidgetCard';
import { CHART_THEME } from '../widgetRegistry';

export default function MRRTrend({ data }) {
  const trend = data?.revenueTrend || [];

  const chartData = trend.map((m, i) => ({
    month: m.month,
    revenue: m.revenue,
    growth: i > 0 && trend[i - 1].revenue > 0
      ? Math.round(((m.revenue - trend[i - 1].revenue) / trend[i - 1].revenue) * 100)
      : 0,
  }));

  return (
    <WidgetCard title="Monthly Revenue Trend">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridColor} />
          <XAxis dataKey="month" tick={{ fill: CHART_THEME.textSecondary, fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: CHART_THEME.textSecondary, fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: CHART_THEME.tooltipBg, border: `1px solid ${CHART_THEME.tooltipBorder}`, borderRadius: '0.5rem', color: CHART_THEME.textPrimary, fontSize: 12 }}
            formatter={(val, name) => [name === 'revenue' ? `$${val.toLocaleString()}` : `${val}%`, name === 'revenue' ? 'Revenue' : 'Growth']}
          />
          <Line type="monotone" dataKey="revenue" stroke={CHART_THEME.gold} strokeWidth={2} dot={{ r: 3, fill: CHART_THEME.gold }} activeDot={{ r: 5, fill: CHART_THEME.gold }} />
        </LineChart>
      </ResponsiveContainer>
    </WidgetCard>
  );
}
