'use client';
import WidgetCard from '../WidgetCard';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BusiestDaysHeatmap({ data }) {
  const heatmap = data?.dailyJobHeatmap || [];
  const maxCount = Math.max(...heatmap.map(h => h.count), 1);

  // Build grid: weeks 0-51, days 0-6
  const grid = {};
  for (const h of heatmap) {
    grid[`${h.day}-${h.week}`] = h.count;
  }

  // Determine weeks range from data
  const weeks = heatmap.length > 0 ? Math.max(...heatmap.map(h => h.week)) + 1 : 52;
  const displayWeeks = Math.min(weeks, 52);

  return (
    <WidgetCard title="Busiest Days Heatmap" subtitle="Jobs by day of week across the year">
      <div className="overflow-x-auto h-full">
        <div className="flex gap-[1px]" style={{ minWidth: displayWeeks * 12 }}>
          {/* Day labels */}
          <div className="flex flex-col gap-[1px] mr-1 flex-shrink-0">
            {DAY_LABELS.map(d => (
              <div key={d} className="h-[11px] flex items-center">
                <span className="text-[8px] text-v-text-secondary w-6">{d}</span>
              </div>
            ))}
          </div>
          {/* Weeks */}
          {Array.from({ length: displayWeeks }, (_, w) => (
            <div key={w} className="flex flex-col gap-[1px]">
              {Array.from({ length: 7 }, (_, d) => {
                const count = grid[`${d}-${w}`] || 0;
                const intensity = count > 0 ? Math.max(0.15, count / maxCount) : 0.03;
                return (
                  <div
                    key={d}
                    className="w-[10px] h-[10px] rounded-[1px] group relative"
                    style={{ backgroundColor: count > 0 ? `rgba(201, 168, 76, ${intensity})` : 'rgba(138, 155, 176, 0.05)' }}
                    title={`${DAY_LABELS[d]} W${w + 1}: ${count} jobs`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}
