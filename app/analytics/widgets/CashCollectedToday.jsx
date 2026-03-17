'use client';
import WidgetCard from '../WidgetCard';

function Arrow({ up }) {
  return (
    <span className={`text-xs ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      {up ? '\u25B2' : '\u25BC'}
    </span>
  );
}

export default function CashCollectedToday({ data }) {
  const cash = data?.cashCollectedToday || {};
  const today = cash.today || 0;
  const yesterday = cash.yesterday || 0;
  const avg = cash.sevenDayAvg || 0;

  const vsYesterday = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : 0;
  const vsAvg = avg > 0 ? Math.round(((today - avg) / avg) * 100) : 0;

  return (
    <WidgetCard title="Cash Collected Today">
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-v-gold text-5xl font-light tracking-tight">${today.toLocaleString()}</p>
        <div className="flex gap-6 mt-4">
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Arrow up={vsYesterday >= 0} />
              <span className={`text-sm ${vsYesterday >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Math.abs(vsYesterday)}%</span>
            </div>
            <p className="text-[10px] text-v-text-secondary mt-0.5">vs yesterday</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Arrow up={vsAvg >= 0} />
              <span className={`text-sm ${vsAvg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Math.abs(vsAvg)}%</span>
            </div>
            <p className="text-[10px] text-v-text-secondary mt-0.5">vs 7-day avg</p>
          </div>
        </div>
        <p className="text-[10px] text-v-text-secondary/50 mt-3">Yesterday: ${yesterday.toLocaleString()} &middot; Avg: ${avg.toLocaleString()}</p>
      </div>
    </WidgetCard>
  );
}
