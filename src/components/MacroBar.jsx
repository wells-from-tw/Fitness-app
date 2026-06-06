const MACROS = [
  { key: 'carbs',   label: '碳水化合物', unit: 'g', color: 'bg-amber-400', track: 'bg-amber-100' },
  { key: 'protein', label: '蛋白質',     unit: 'g', color: 'bg-blue-500',  track: 'bg-blue-100'  },
  { key: 'fat',     label: '脂肪',       unit: 'g', color: 'bg-rose-400',  track: 'bg-rose-100'  },
];

export default function MacroBar({ totals, goals }) {
  return (
    <div className="flex flex-col gap-3">
      {MACROS.map(({ key, label, unit, color, track }) => {
        const val  = Math.round(totals[key] || 0);
        const goal = goals?.[key] ?? 0;
        const pct  = goal > 0 ? Math.min((val / goal) * 100, 100) : 0;
        return (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 font-medium">{label}</span>
              <span className="text-gray-400">{val} / {goal}{unit}</span>
            </div>
            <div className={`w-full h-2 rounded-full ${track}`}>
              <div
                className={`h-2 rounded-full ${color} transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
