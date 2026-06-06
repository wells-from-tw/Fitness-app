import { useState } from 'react';
import { saveWater } from '../utils/storage';

export default function WaterCard({ dateKey, initialCups, goal = 8 }) {
  const [cups, setCups]       = useState(initialCups ?? 0);
  const [lastAdded, setLastAdded] = useState(null);
  const maxCups = Math.max(goal + 4, 12);

  function update(next) {
    const c = Math.max(0, Math.min(next, maxCups));
    if (c > cups) setLastAdded(c - 1); // index of newly filled cup
    setCups(c);
    saveWater(dateKey, c);
  }

  const done = cups >= goal;
  const pct  = Math.min(cups / goal, 1);

  return (
    <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#1e1e1e] px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-0.5">今日飲水</p>
          <p className={`text-xl font-bold tracking-tight ${done ? 'text-cyan-500' : 'text-gray-900 dark:text-white'}`}>
            {cups}<span className="text-sm font-normal text-gray-400 ml-1">/ {goal} 杯</span>
            {done && <span className="ml-2 text-xs font-medium text-cyan-400">達標</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => update(cups - 1)}
            disabled={cups === 0}
            className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 disabled:opacity-25 text-gray-500 text-xl flex items-center justify-center transition-colors hover:bg-gray-50 active:scale-95"
          >−</button>
          <button
            onClick={() => update(cups + 1)}
            disabled={cups >= maxCups}
            className="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-25 text-white text-xl font-bold flex items-center justify-center transition-colors active:scale-95"
          >+</button>
        </div>
      </div>

      {/* Progress track */}
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all duration-500"
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      {/* Cup dots */}
      <div className="flex gap-1.5">
        {Array.from({ length: goal }).map((_, i) => (
          <button
            key={i}
            onClick={() => update(i < cups ? i : i + 1)}
            className="flex-1 h-1.5 rounded-full transition-all duration-300 active:scale-95"
            style={{
              background: i < cups
                ? undefined
                : undefined,
            }}
          >
            <div
              className={`w-full h-full rounded-full transition-all duration-300 ${
                i < cups ? 'bg-cyan-400' : 'bg-gray-100 dark:bg-gray-800'
              }`}
            />
          </button>
        ))}
      </div>

      <div className="flex justify-between text-[11px] text-gray-400 mt-2.5">
        <span>{cups * 250} ml</span>
        <span>目標 {goal * 250} ml</span>
      </div>
    </div>
  );
}
