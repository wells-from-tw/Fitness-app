import { useEffect, useMemo, useState, useRef } from 'react';
import { loadAllDays, loadGoals, loadWeightLog, loadDayData, saveDayData, loadAllExercise, getTodayKey } from '../utils/storage';
import { getWeeklySummary } from '../utils/ai';
import AddFoodModal from '../components/AddFoodModal';

function localDateKey(d) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekDays(offset) {
  const days = [];
  const end  = new Date();
  end.setDate(end.getDate() + offset * 7);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    days.push(localDateKey(d));
  }
  return days;
}

function calcLogStreak(allDays) {
  const d = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const key   = localDateKey(d);
    const day   = allDays[key];
    const foods = day ? Object.values(day.meals).flat() : [];
    if (foods.length > 0) streak++;
    else break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

function shortDate(key) {
  const d = new Date(key + 'T12:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function weekDay(key) {
  const d = new Date(key + 'T12:00:00');
  return `週${WEEK_DAYS[d.getDay()]}`;
}

export default function History() {
  const [weekOffset,   setWeekOffset]   = useState(0);
  const [weekSummary,  setWeekSummary]  = useState(null);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const goals     = useMemo(() => loadGoals(), []);
  const allDays   = useMemo(() => loadAllDays(), []);
  const weightLog = useMemo(() => loadWeightLog(), []);
  const days      = getWeekDays(weekOffset);

  useEffect(() => { setWeekSummary(null); }, [weekOffset]);

  const stats = days.map(key => {
    const day   = allDays[key];
    const foods = day ? Object.values(day.meals).flat() : [];
    return {
      key,
      calories: foods.reduce((s, f) => s + (f.calories || 0), 0),
      carbs:    foods.reduce((s, f) => s + (f.carbs    || 0), 0),
      protein:  foods.reduce((s, f) => s + (f.protein  || 0), 0),
      fat:      foods.reduce((s, f) => s + (f.fat      || 0), 0),
      count:    foods.length,
    };
  });

  const maxCal    = Math.max(...stats.map(s => s.calories), goals.calories);
  const todayKey  = localDateKey(new Date());
  const recorded  = stats.filter(s => s.count > 0);
  const avgCal    = recorded.length > 0
    ? Math.round(recorded.reduce((s, d) => s + d.calories, 0) / recorded.length)
    : 0;
  const goalDays  = recorded.filter(s =>
    s.calories >= goals.calories * 0.85 && s.calories <= goals.calories * 1.15
  ).length;
  const logStreak = useMemo(() => calcLogStreak(allDays), [allDays]);

  // Monthly stats (always current month)
  const now         = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthCals   = Object.entries(allDays)
    .filter(([key]) => key.startsWith(monthPrefix))
    .map(([, day]) => Object.values(day.meals).flat().reduce((s, f) => s + (f.calories || 0), 0))
    .filter(c => c > 0);
  const monthRecorded = monthCals.length;
  const monthAvg  = monthRecorded > 0 ? Math.round(monthCals.reduce((a, b) => a + b, 0) / monthRecorded) : 0;
  const monthMax  = monthCals.length > 0 ? Math.max(...monthCals) : 0;
  const monthMin  = monthCals.length > 0 ? Math.min(...monthCals) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50 dark:from-gray-900 dark:to-gray-950">
      <header className="bg-white/80 dark:bg-gray-900/90 backdrop-blur-md sticky top-0 z-30 border-b border-blue-50 dark:border-gray-800 shadow-sm">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">歷史記錄</h1>
          <button
            onClick={() => setSearchOpen(true)}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="搜尋食物"
          >🔍</button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 pb-28 flex flex-col gap-4">

        {/* Week navigation */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl shadow-sm px-5 py-3">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xl leading-none"
          >‹</button>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {shortDate(days[0])} – {shortDate(days[6])}
            </p>
            <p className="text-xs text-blue-500 mt-0.5">
              {weekOffset === 0 ? '本週' : `${-weekOffset} 週前`}
            </p>
          </div>
          <button
            onClick={() => setWeekOffset(w => Math.min(w + 1, 0))}
            disabled={weekOffset >= 0}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 disabled:opacity-30 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xl leading-none"
          >›</button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '本期平均',  value: `${avgCal}`,                     unit: 'kcal', color: 'text-blue-500'   },
            { label: '連續記錄',  value: `${logStreak}`,                   unit: '天',   color: 'text-orange-500' },
            { label: '達標天數',  value: `${goalDays}/${recorded.length}`, unit: '天',   color: 'text-green-500'  },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}<span className="text-xs font-normal text-gray-400 ml-1">{unit}</span></p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Weekly AI summary button */}
        <button
          onClick={async () => {
            if (weekSummary === 'loading') return;
            setWeekSummary('loading');
            try {
              const text = await getWeeklySummary(stats, goals);
              setWeekSummary(text);
            } catch (err) {
              setWeekSummary(
                err.message === 'NO_KEY'      ? '請先在設定頁輸入 Anthropic API Key' :
                err.message === 'INVALID_KEY' ? 'API Key 無效，請重新設定' :
                `分析失敗：${err.message}`
              );
            }
          }}
          disabled={recorded.length === 0}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-60 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {weekSummary === 'loading'
            ? <><span className="inline-block animate-spin">◌</span>&nbsp;AI 分析中…</>
            : <>✨ {weekOffset === 0 ? '本週' : `${-weekOffset} 週前`}飲食週報</>}
        </button>

        {/* Calorie bar chart */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">卡路里趨勢</h2>
          <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
            {stats.map(({ key, calories }) => {
              const isToday  = key === todayKey;
              const pct      = maxCal > 0 ? (calories / maxCal) * 100 : 0;
              const atGoal   = calories >= goals.calories * 0.9 && calories <= goals.calories * 1.1;
              const over     = calories > goals.calories * 1.1;
              const barColor = over ? 'bg-rose-400' : atGoal ? 'bg-green-400' : calories > 0 ? 'bg-blue-400' : 'bg-gray-100 dark:bg-gray-700';
              return (
                <div key={key} className="flex-1 flex flex-col items-center gap-1">
                  {calories > 0 && <span className="text-xs text-gray-400">{calories}</span>}
                  <div className="w-full flex items-end" style={{ height: 80 }}>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-700 ${barColor} ${isToday ? 'ring-2 ring-blue-300 ring-offset-1' : ''}`}
                      style={{ height: `${Math.max(pct, calories > 0 ? 8 : 4)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{shortDate(key)}</span>
                  <span className={`text-xs ${isToday ? 'text-blue-500 font-semibold' : 'text-gray-300 dark:text-gray-600'}`}>{weekDay(key)}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-2 text-right">目標 {goals.calories} kcal</p>
        </div>

        {/* Weight chart */}
        <WeightChart days={days} weightLog={weightLog} />

        {/* Monthly calendar heatmap */}
        <CalendarHeatmap allDays={allDays} goals={goals} />

        {/* Monthly stats */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            {now.getMonth() + 1} 月統計
          </h2>
          {monthRecorded === 0 ? (
            <p className="text-center text-gray-300 dark:text-gray-600 text-sm py-3">本月尚無記錄</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '記錄天數',  value: monthRecorded, unit: '天',   color: 'text-blue-500',               bg: 'bg-blue-50 dark:bg-blue-900/20'   },
                { label: '日均熱量',  value: monthAvg,      unit: 'kcal', color: 'text-gray-700 dark:text-gray-200', bg: 'bg-gray-50 dark:bg-gray-700'  },
                { label: '最低單日',  value: monthMin,      unit: 'kcal', color: 'text-green-600',               bg: 'bg-green-50 dark:bg-green-900/20' },
                { label: '最高單日',  value: monthMax,      unit: 'kcal', color: 'text-rose-500',                bg: 'bg-rose-50 dark:bg-rose-900/20'   },
              ].map(({ label, value, unit, color, bg }) => (
                <div key={label} className={`${bg} rounded-2xl p-3 text-center`}>
                  <p className={`text-2xl font-bold ${color}`}>{value}
                    <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily log list (editable) */}
        <DailyList key={days[0]} stats={stats} allDays={allDays} goals={goals} todayKey={todayKey} />
      </main>

      {searchOpen && (
        <FoodSearchModal allDays={allDays} onClose={() => setSearchOpen(false)} />
      )}

      {weekSummary && weekSummary !== 'loading' && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setWeekSummary(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg p-6 pb-12"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">✨</span>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                {weekOffset === 0 ? '本週' : `${-weekOffset} 週前`}飲食週報
              </h3>
              <button
                onClick={() => setWeekSummary(null)}
                className="ml-auto text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >×</button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{weekSummary}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── DailyList ─── */

const MEAL_META = {
  breakfast: { label: '早餐', emoji: '🌅' },
  lunch:     { label: '午餐', emoji: '☀️'  },
  dinner:    { label: '晚餐', emoji: '🌙' },
  snack:     { label: '點心', emoji: '🍎' },
};

function DailyList({ stats, allDays, goals, todayKey }) {
  const [localDays,   setLocalDays]   = useState(() => ({ ...allDays }));
  const [allExercise] = useState(() => loadAllExercise());
  const [expanded,    setExpanded]    = useState(null);
  const [editModal,   setEditModal]   = useState(null);
  const [copyToast,   setCopyToast]   = useState(null);

  const liveStats = stats.map(({ key }) => {
    const day   = localDays[key];
    const foods = day ? Object.values(day.meals).flat() : [];
    return {
      key,
      calories: foods.reduce((s, f) => s + (f.calories || 0), 0),
      carbs:    foods.reduce((s, f) => s + (f.carbs    || 0), 0),
      protein:  foods.reduce((s, f) => s + (f.protein  || 0), 0),
      fat:      foods.reduce((s, f) => s + (f.fat      || 0), 0),
      count:    foods.length,
    };
  });

  function removeFood(dateKey, mealType, idx) {
    const day     = localDays[dateKey] || loadDayData(dateKey);
    const updated = {
      ...day,
      meals: { ...day.meals, [mealType]: (day.meals[mealType] || []).filter((_, i) => i !== idx) },
    };
    saveDayData(dateKey, updated);
    setLocalDays(p => ({ ...p, [dateKey]: updated }));
  }

  function copyToToday(sourceKey) {
    const sourceDay = localDays[sourceKey] || loadDayData(sourceKey);
    const todayData = localDays[todayKey]  || loadDayData(todayKey);
    const merged = {
      ...todayData,
      meals: Object.fromEntries(
        Object.keys(MEAL_META).map(type => [
          type,
          [
            ...(todayData.meals?.[type]  || []),
            ...(sourceDay.meals?.[type]  || []).map(f => ({ ...f, id: Date.now() + Math.random() })),
          ],
        ])
      ),
    };
    saveDayData(todayKey, merged);
    setLocalDays(p => ({ ...p, [todayKey]: merged }));
    setCopyToast(sourceKey);
    setTimeout(() => setCopyToast(null), 2000);
  }

  function addFood(mealType, food) {
    const { dateKey } = editModal;
    const day     = localDays[dateKey] || loadDayData(dateKey);
    const updated = {
      ...day,
      meals: { ...day.meals, [mealType]: [...(day.meals[mealType] || []), { ...food, id: Date.now() }] },
    };
    saveDayData(dateKey, updated);
    setLocalDays(p => ({ ...p, [dateKey]: updated }));
    setEditModal(null);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">每日明細</h2>
        <p className="text-xs text-gray-400 mt-0.5">點擊任一天可展開並補登／刪除食物</p>
      </div>

      {[...liveStats].reverse().map(({ key, calories, carbs, protein, fat, count }) => {
        const isToday  = key === todayKey;
        const isOpen   = expanded === key;
        const pct      = goals.calories > 0 ? Math.min((calories / goals.calories) * 100, 100) : 0;
        const dayMeals = (localDays[key]?.meals) ?? { breakfast: [], lunch: [], dinner: [], snack: [] };

        return (
          <div key={key} className="border-b border-gray-50 dark:border-gray-700 last:border-0">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : key)}
              className="w-full px-5 py-3.5 text-left hover:bg-gray-50/80 dark:hover:bg-gray-700/50 active:bg-gray-100 transition-colors"
            >
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{shortDate(key)}</span>
                  <span className={`text-xs ${isToday ? 'text-blue-500 font-semibold' : 'text-gray-400'}`}>
                    {weekDay(key)}{isToday ? ' · 今天' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {count > 0
                    ? <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{calories} <span className="text-xs font-normal text-gray-400">kcal</span></span>
                    : <span className="text-xs text-gray-300 dark:text-gray-600">未記錄 · 點擊補登</span>}
                  <span className={`text-gray-300 dark:text-gray-600 text-sm transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </div>
              {count > 0 && (
                <>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 mb-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${calories > goals.calories * 1.1 ? 'bg-rose-400' : 'bg-blue-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    碳 {Math.round(carbs)}g · 蛋 {Math.round(protein)}g · 脂 {Math.round(fat)}g · {count} 項食物
                  </p>
                </>
              )}
            </button>

            {isOpen && (
              <div className="px-5 pb-4 bg-gray-50/60 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700">
                {Object.entries(MEAL_META).map(([type, meta]) => {
                  const items   = dayMeals[type] || [];
                  const mealCal = items.reduce((s, f) => s + (f.calories || 0), 0);
                  return (
                    <div key={type} className="mt-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-sm">{meta.emoji}</span>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{meta.label}</span>
                        {mealCal > 0 && <span className="text-xs text-gray-400 ml-auto">{mealCal} kcal</span>}
                        <button
                          onClick={e => { e.stopPropagation(); setEditModal({ dateKey: key, mealType: type }); }}
                          className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-500 flex items-center justify-center text-sm leading-none hover:bg-blue-100 ml-1 flex-shrink-0"
                        >+</button>
                      </div>
                      {items.length === 0 ? (
                        <p className="text-xs text-gray-300 dark:text-gray-600 py-1 text-center">尚未記錄</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {items.map((food, idx) => (
                            <div key={food.id || idx} className="flex justify-between items-center bg-white dark:bg-gray-800 rounded-xl px-3 py-2">
                              <div>
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{food.name}</p>
                                <p className="text-xs text-gray-400">碳 {food.carbs}g · 蛋 {food.protein}g · 脂 {food.fat}g</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-blue-500">{food.calories} kcal</span>
                                <button
                                  onClick={e => { e.stopPropagation(); removeFood(key, type, idx); }}
                                  className="text-gray-300 hover:text-red-400 text-base leading-none transition-colors"
                                >×</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Exercise records for this day */}
                {(() => {
                  const exList = allExercise[key] || [];
                  if (exList.length === 0) return null;
                  const totalBurned = exList.reduce((s, e) => s + (e.calories || 0), 0);
                  return (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-sm">🏃</span>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">運動記錄</span>
                        <span className="text-xs text-orange-400 font-semibold ml-auto">-{totalBurned} kcal</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {exList.map((ex, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 rounded-xl px-3 py-2">
                            <div>
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{ex.name}</p>
                              <p className="text-xs text-gray-400">{ex.duration} 分鐘</p>
                            </div>
                            <span className="text-xs font-semibold text-orange-400">-{ex.calories} kcal</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {!isToday && count > 0 && (
                  <button
                    onClick={() => copyToToday(key)}
                    className="mt-4 w-full py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    {copyToast === key ? '✓ 已複製到今天' : '📋 複製全部餐點到今天'}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {editModal && (
        <AddFoodModal
          mealType={editModal.mealType}
          onAdd={addFood}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
}

/* ─── CalendarHeatmap ─── */

function CalendarHeatmap({ allDays, goals }) {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const todayKey = localDateKey(now);

  const firstDay    = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWD     = firstDay.getDay(); // 0=Sun

  // Build cell list: null for padding, then {d, key, calories, isToday}
  const cells = [
    ...Array(startWD).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d   = i + 1;
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const day   = allDays[key];
      const foods = day ? Object.values(day.meals).flat() : [];
      const cals  = foods.reduce((s, f) => s + (f.calories || 0), 0);
      return { d, key, cals, isToday: key === todayKey, isFuture: key > todayKey };
    }),
  ];

  function cellStyle(cell) {
    if (!cell || cell.isFuture) return 'bg-gray-50 dark:bg-gray-700/40 text-gray-300 dark:text-gray-600';
    if (cell.cals === 0) return 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500';
    const rate = cell.cals / goals.calories;
    if (rate > 1.2)  return 'bg-rose-200 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300';
    if (rate >= 0.7) return 'bg-green-200 dark:bg-green-900/50 text-green-700 dark:text-green-300';
    return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {month + 1} 月記錄熱力圖
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-700" />
          <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/40" />
          <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/50" />
          <div className="w-3 h-3 rounded bg-rose-200 dark:bg-rose-900/50" />
          <span className="ml-0.5">未·低·達·超</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['日','一','二','三','四','五','六'].map(d => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`pad-${i}`} />;
          return (
            <div
              key={cell.key}
              title={cell.cals > 0 ? `${cell.cals} kcal` : ''}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-colors ${cellStyle(cell)} ${cell.isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
            >
              <span className="text-xs font-semibold leading-none">{cell.d}</span>
              {cell.cals > 0 && (
                <span className="text-[8px] leading-none mt-0.5 opacity-70">{cell.cals}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── FoodSearchModal ─── */
const MEAL_LABELS = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心' };

function FoodSearchModal({ allDays, onClose }) {
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState({});
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  const index = useMemo(() => {
    const rows = [];
    Object.entries(allDays)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([date, day]) => {
        Object.entries(day.meals || {}).forEach(([mealType, foods]) => {
          foods.forEach(food => rows.push({ date, mealType, food }));
        });
      });
    return rows;
  }, [allDays]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const seen = new Set();
    return index.filter(({ food }) => {
      if (!food.name.toLowerCase().includes(q)) return false;
      if (seen.has(food.name)) return false;
      seen.add(food.name);
      return true;
    }).slice(0, 30);
  }, [query, index]);

  function addToToday({ food }) {
    const todayKey  = getTodayKey();
    const todayData = loadDayData(todayKey);
    const updated   = {
      ...todayData,
      meals: {
        ...todayData.meals,
        snack: [...(todayData.meals?.snack || []), { ...food, id: Date.now() }],
      },
    };
    saveDayData(todayKey, updated);
    setAdded(p => ({ ...p, [food.name]: true }));
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">搜尋食物記錄</h3>
            <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2.5">
            <span className="text-gray-400">🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="輸入食物名稱，例如：雞排、白飯…"
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400 text-lg leading-none">×</button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {!query.trim() && (
            <p className="text-center text-gray-300 dark:text-gray-600 text-sm py-12">輸入關鍵字搜尋歷史紀錄</p>
          )}
          {query.trim() && results.length === 0 && (
            <p className="text-center text-gray-300 dark:text-gray-600 text-sm py-12">找不到「{query}」相關紀錄</p>
          )}
          {results.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-400 mb-1">找到 {results.length} 筆（顯示最近一次）</p>
              {results.map(({ date, mealType, food }) => (
                <div key={food.name} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{food.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {date.slice(5).replace('-','/')} {MEAL_LABELS[mealType]} · 碳 {food.carbs}g · 蛋 {food.protein}g · 脂 {food.fat}g
                    </p>
                  </div>
                  <span className="text-sm font-bold text-blue-500 flex-shrink-0">{food.calories} kcal</span>
                  <button
                    onClick={() => addToToday({ food })}
                    className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                      added[food.name]
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {added[food.name] ? '✓ 已加' : '＋ 今天'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-300 dark:text-gray-600 text-center pb-4 flex-shrink-0">「＋ 今天」會加入今日點心</p>
      </div>
    </div>
  );
}

/* ─── WeightChart ─── */

function buildDayKeys(n) {
  const today = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (n - 1 - i));
    return localDateKey(d);
  });
}

function WeightChart({ days, weightLog }) {
  const [show30, setShow30] = useState(false);

  const displayKeys = show30 ? buildDayKeys(30) : days;
  const entries = displayKeys.map(key => ({ key, kg: weightLog[key] ?? null }));
  const weights = entries.map(e => e.kg).filter(Boolean);

  if (weights.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">體重趨勢</h2>
          <ViewToggle show30={show30} setShow30={setShow30} />
        </div>
        <p className="text-center text-gray-300 dark:text-gray-600 text-sm py-6">
          {show30 ? '近 30 天' : '本期'}無體重記錄
        </p>
      </div>
    );
  }

  const minW  = Math.min(...weights) - 0.5;
  const maxW  = Math.max(...weights) + 0.5;
  const range = maxW - minW || 1;

  const W = 300; const H = 90;
  const pL = 32; const pR = 8; const pT = 10; const pB = 10;
  const iW = W - pL - pR;
  const iH = H - pT - pB;

  const toX = i  => pL + (i / Math.max(entries.length - 1, 1)) * iW;
  const toY = kg => pT + iH - ((kg - minW) / range) * iH;

  const pts = entries
    .map((e, i) => e.kg != null ? { x: toX(i), y: toY(e.kg), kg: e.kg, key: e.key } : null)
    .filter(Boolean);

  // Linear regression trend line
  let trendLine = null;
  if (pts.length >= 3) {
    const n   = pts.length;
    const sumX = pts.reduce((s, p) => s + p.x, 0);
    const sumY = pts.reduce((s, p) => s + p.y, 0);
    const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const x0 = pts[0].x;
    const x1 = pts[pts.length - 1].x;
    trendLine = { x0, y0: slope * x0 + intercept, x1, y1: slope * x1 + intercept };
  }

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const latest   = weights[weights.length - 1];
  const first    = weights[0];
  const diff     = (latest - first).toFixed(1);

  // Y-axis labels
  const yLabels = [minW, (minW + maxW) / 2, maxW].map(v => ({
    y: toY(v), label: v.toFixed(1),
  }));

  // X-axis: show ~5 labels
  const step = Math.ceil(displayKeys.length / 5);
  const xLabels = displayKeys
    .map((key, i) => ({ i, key }))
    .filter(({ i }) => i % step === 0 || i === displayKeys.length - 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">體重趨勢</h2>
        <div className="flex items-center gap-2">
          {weights.length >= 2 && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              Number(diff) < 0
                ? 'text-green-600 bg-green-50 dark:bg-green-900/30'
                : 'text-rose-500 bg-rose-50 dark:bg-rose-900/30'
            }`}>
              {Number(diff) > 0 ? '▲' : '▼'} {Math.abs(Number(diff))} kg
            </span>
          )}
          <ViewToggle show30={show30} setShow30={setShow30} />
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height: 90 }}>
        {/* Grid lines */}
        {yLabels.map(({ y, label }) => (
          <g key={label}>
            <line x1={pL} y1={y} x2={W - pR} y2={y} stroke="#e5e7eb" strokeWidth="1" opacity="0.8" />
            <text x={pL - 3} y={y + 3} fontSize="7" fill="#9ca3af" textAnchor="end">{label}</text>
          </g>
        ))}

        {/* Trend line */}
        {trendLine && (
          <line
            x1={trendLine.x0} y1={trendLine.y0}
            x2={trendLine.x1} y2={trendLine.y1}
            stroke="#c4b5fd" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.7"
          />
        )}

        {/* Weight polyline */}
        {pts.length >= 2 && (
          <polyline points={polyline} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Dots — only render if ≤30 points to avoid clutter */}
        {pts.map(p => (
          <circle key={p.key} cx={p.x} cy={p.y} r={show30 ? 2.5 : 4} fill="white" stroke="#8b5cf6" strokeWidth="2" />
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-1 text-xs text-gray-300 dark:text-gray-600">
        {xLabels.map(({ i, key }) => (
          <span key={key} style={{ position: 'relative' }}>{shortDate(key)}</span>
        ))}
      </div>

      {/* Legend */}
      {trendLine && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-4 h-px" style={{ borderTop: '2px dashed #c4b5fd' }} />
            <span className="text-xs text-gray-400">趨勢線</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ViewToggle({ show30, setShow30 }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 text-xs font-semibold">
      <button
        onClick={() => setShow30(false)}
        className={`px-2.5 py-1 transition-colors ${!show30 ? 'bg-violet-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-400 hover:bg-gray-50'}`}
      >7天</button>
      <button
        onClick={() => setShow30(true)}
        className={`px-2.5 py-1 transition-colors ${show30 ? 'bg-violet-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-400 hover:bg-gray-50'}`}
      >30天</button>
    </div>
  );
}
