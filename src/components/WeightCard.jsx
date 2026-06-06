import { useState } from 'react';
import { saveWeight } from '../utils/storage';

export default function WeightCard({ dateKey, initialWeight, onSaved, weekly }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(initialWeight ? String(initialWeight) : '');
  const [saved, setSaved]     = useState(false);

  function handleSave() {
    const kg = parseFloat(value);
    if (!value || isNaN(kg) || kg <= 0) return;
    saveWeight(dateKey, kg);
    setSaved(true);
    setEditing(false);
    onSaved?.(kg);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleClear() {
    saveWeight(dateKey, null);
    setValue('');
    setEditing(false);
    onSaved?.(null);
  }

  return (
    <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#1e1e1e] px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center text-xl flex-shrink-0">
        ⚖️
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{weekly ? '本週體重' : '今日體重'}</p>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="number" min="20" max="300" step="0.1"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
              autoFocus
              placeholder="kg"
              className="w-24 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <span className="text-sm text-gray-400">kg</span>
            <button onClick={handleSave}
              className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold rounded-xl transition-colors">
              儲存
            </button>
            <button onClick={() => setEditing(false)}
              className="text-gray-300 hover:text-gray-500 text-lg leading-none">×</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {initialWeight ? (
              <>
                <span className="text-xl font-bold text-violet-600">
                  {saved ? '✓' : initialWeight}
                  {!saved && <span className="text-sm font-normal text-gray-400 ml-1">kg</span>}
                </span>
                <button onClick={() => setEditing(true)}
                  className="text-xs text-gray-400 hover:text-violet-500 transition-colors">編輯</button>
                <button onClick={handleClear}
                  className="text-xs text-gray-300 hover:text-red-400 transition-colors">清除</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)}
                className="text-sm text-violet-500 hover:text-violet-600 font-medium transition-colors">
                + 記錄{weekly ? '本週' : '今日'}體重
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
