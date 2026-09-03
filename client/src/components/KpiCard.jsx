import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KpiCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'brand',
  trend,
  badge
}) {
  const colorStyles = {
    brand: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800/40',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      text: 'text-emerald-600 dark:text-emerald-400'
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      border: 'border-rose-200 dark:border-rose-800/40',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      text: 'text-rose-600 dark:text-rose-400'
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800/40',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      text: 'text-blue-600 dark:text-blue-400'
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      border: 'border-indigo-200 dark:border-indigo-800/40',
      iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      text: 'text-indigo-600 dark:text-indigo-400'
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800/40',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      text: 'text-amber-600 dark:text-amber-400'
    },
    slate: {
      bg: 'bg-slate-50 dark:bg-slate-900/50',
      border: 'border-slate-200 dark:border-slate-800',
      iconBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
      text: 'text-slate-600 dark:text-slate-400'
    }
  };

  const style = colorStyles[color] || colorStyles.brand;

  // Adaptar el tamaño del texto dinámicamente según la longitud del valor numérico
  const getValueSizeClass = (val) => {
    const str = String(val || '');
    if (str.length >= 14) {
      return 'text-base sm:text-lg xl:text-lg 2xl:text-xl';
    }
    if (str.length >= 11) {
      return 'text-lg sm:text-xl xl:text-xl 2xl:text-2xl';
    }
    return 'text-xl sm:text-2xl xl:text-2xl 2xl:text-3xl';
  };

  return (
    <div className={`relative p-3 sm:p-3.5 2xl:p-4 rounded-2xl border ${style.border} ${style.bg} backdrop-blur-sm shadow-xs transition-all hover:shadow-md flex flex-col justify-between min-w-0`}>
      <div className="flex items-start justify-between gap-1.5 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
            {title}
          </p>
          <p className="mt-1 font-black text-slate-900 dark:text-white tracking-tight leading-none whitespace-nowrap text-sm sm:text-base lg:text-sm xl:text-base 2xl:text-lg">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={`p-1.5 sm:p-2 rounded-xl ${style.iconBg} shrink-0 self-start`}>
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        )}
      </div>

      {(subtitle || trend !== undefined || badge) && (
        <div className="mt-2.5 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/50 dark:border-slate-800/50 min-w-0 gap-1">
          <span className="truncate">{subtitle}</span>
          {badge && (
            <span className="px-1.5 py-0.5 font-bold rounded-md bg-white/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0 text-[9px]">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
