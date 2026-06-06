import { useState } from 'react';
import { loadExerciseLog, saveExerciseLog } from '../utils/storage';

const QUICK_EXERCISES = [
  { name: '步行',     kcalPerMin: 4  },
  { name: '慢跑',     kcalPerMin: 9  },
  { name: '騎腳踏車', kcalPerMin: 7  },
  { name: '游泳',     kcalPerMin: 10 },
  { name: '重量訓練', kcalPerMin: 6  },
  { name: '瑜珈',     kcalPerMin: 3  },
  { name: 'HIIT',     kcalPerMin: 12 },
  { name: '跳繩',     kcalPerMin: 11 },
];

const EMPTY_FORM = { name: '', duration: '', calories: '' };

export default function ExerciseCard({ dateKey, onBurnedChange }) {
  const [list, setList]       = useState(() => loadExerciseLog(dateKey));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);

  function save(newList) {
    setList(newList);
    saveExerciseLog(dateKey, newList);
    onBurnedChange(newList.reduce((s, e) => s + e.calories, 0));
  }

  function handleQuick(ex) {
    setForm(f => ({
      name:     ex.name,
      duration: f.duration || '30',
      calories: String(Math.round(ex.kcalPerMin * (Number(f.duration) || 30))),
    }));
    setShowForm(true);
  }

  function handleDurationChange(val) {
    const mins = Number(val) || 0;
    const matched = QUICK_EXERCISES.find(e => e.name === form.name);
    setForm(f => ({
      ...f,
      duration: val,
      calories: matched ? String(Math.round(matched.kcalPerMin * mins)) : f.calories,
    }));
  }

  function handleAdd() {
    if (!form.name || !form.calories) return;
    const entry = {
      id:       Date.now(),
      name:     form.name,
      duration: Number(form.duration) || 0,
      calories: Math.round(Number(form.calories)) || 0,
    };
    save([...list, entry]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  function handleRemove(id) {
    save(list.filter(e => e.id !== id));
  }

  const totalBurned = list.reduce((s, e) => s + e.calories, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏃</span>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">今日運動</h2>
          {totalBurned > 0 && (
            <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
              -{totalBurned} kcal
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 text-blue-500 font-bold text-lg leading-none flex items-center justify-center transition-colors"
        >
          {showForm ? '−' : '+'}
        </button>
      </div>

      {list.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {list.map(e => (
            <div key={e.id} className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl px-4 py-2.5">
              <span className="text-sm font-semibold text-gray-700 flex-1">{e.name}</span>
              {e.duration > 0 && (
                <span className="text-xs text-gray-400">{e.duration} 分鐘</span>
              )}
              <span className="text-sm font-bold text-orange-500">-{e.calories} kcal</span>
              <button
                onClick={() => handleRemove(e.id)}
                className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none ml-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {list.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 text-center py-2">點 + 記錄今日運動，消耗的熱量將從環形圖扣除</p>
      )}

      {showForm && (
        <div className="border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex flex-col gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-2">快速選擇</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_EXERCISES.map(ex => (
                <button
                  key={ex.name}
                  onClick={() => handleQuick(ex)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    form.name === ex.name
                      ? 'bg-orange-400 text-white'
                      : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                  }`}
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">名稱</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="運動名稱"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">時間 (分)</label>
              <input
                type="number" min="0" value={form.duration}
                onChange={e => handleDurationChange(e.target.value)}
                placeholder="30"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">消耗 (kcal)</label>
              <input
                type="number" min="0" value={form.calories}
                onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
                placeholder="200"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!form.name || !form.calories}
              className="flex-1 bg-orange-400 hover:bg-orange-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-2xl py-2.5 text-sm transition-colors"
            >
              新增運動
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl text-sm transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
