import { useState, useMemo, useCallback } from 'react';
import { loadExerciseLog, saveExerciseLog, loadAllExercise, loadProfile, getTodayKey } from '../utils/storage';
import { EXERCISES, CATEGORIES, MUSCLE_LABELS, calcMuscleIntensities, intensityColor } from '../data/exercises';
import { generateTrainingCard } from '../utils/shareCard';
import MuscleHeatmap from '../components/MuscleHeatmap';

export default function Training() {
  const dateKey = getTodayKey();
  const profile = useMemo(() => loadProfile(), []);

  const [log, setLog]           = useState(() => loadExerciseLog(dateKey));
  const [showAdd, setShowAdd]   = useState(false);
  const [cat, setCat]           = useState('cardio');
  const [selected, setSelected] = useState(null); // exercise object from DB
  const [duration, setDuration] = useState('30');
  const [sets, setSets]         = useState([{ reps: '10', weight: '20' }]);

  const totalBurned = useMemo(() => log.reduce((s, e) => s + (e.calories || 0), 0), [log]);
  const muscleIntensities = useMemo(() => calcMuscleIntensities(log), [log]);
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (sharing || log.length === 0) return;
    setSharing(true);
    try {
      const today = new Date();
      const days = ['日','一','二','三','四','五','六'];
      const dateStr = `${today.getMonth()+1}月${today.getDate()}日（週${days[today.getDay()]}）`;

      // grab the two .rbh SVGs (front = index 0, back = index 1)
      const rbhSvgs = document.querySelectorAll('.rbh');
      const frontSvgEl = rbhSvgs[0] ?? null;
      const backSvgEl  = rbhSvgs[1] ?? null;

      const dataUrl = await generateTrainingCard({
        date: dateStr,
        log,
        totalBurned,
        muscleIntensities,
        muscleLabels: MUSCLE_LABELS,
        intensityColor,
        frontSvgEl,
        backSvgEl,
      });

      const res  = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'wisefitness-training.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Fitness 今日訓練' });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'wisefitness-training.png';
        a.click();
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
    setSharing(false);
  }

  function persist(newLog) {
    setLog(newLog);
    saveExerciseLog(dateKey, newLog);
    // notify Home page ExerciseCard if it's listening
    window.dispatchEvent(new CustomEvent('wisefitness:exercise-updated', { detail: { dateKey } }));
  }

  function handleSelectExercise(ex) {
    setSelected(ex);
    setDuration('30');
    setSets([{ reps: '10', weight: '20' }]);
  }

  function calcCalories(ex, dur, setList) {
    const weightKg = profile.weight || 65;
    const hours    = (Number(dur) || 0) / 60;
    return Math.round((ex.met || 5) * weightKg * hours);
  }

  function handleAddSet() {
    setSets(prev => [...prev, { reps: '10', weight: prev[prev.length - 1]?.weight ?? '20' }]);
  }

  function handleRemoveSet(i) {
    setSets(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleSetChange(i, field, val) {
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }

  function handleAddExercise() {
    if (!selected) return;
    const dur = Number(duration) || 0;
    const parsedSets = sets.map(s => ({ reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 }));
    const cal = calcCalories(selected, dur, parsedSets);

    const entry = {
      id:       Date.now(),
      name:     selected.name,
      type:     selected.type,
      met:      selected.met,
      muscles:  selected.muscles,
      duration: dur,
      calories: cal,
      sets:     selected.type === 'strength' ? parsedSets : [],
    };
    persist([...log, entry]);
    setShowAdd(false);
    setSelected(null);
    setDuration('30');
    setSets([{ reps: '10', weight: '20' }]);
  }

  function handleRemove(id) {
    persist(log.filter(e => e.id !== id));
  }

  const filteredExercises = useMemo(
    () => EXERCISES.filter(e => e.category === cat),
    [cat]
  );

  // live calories preview
  const previewCal = selected ? calcCalories(selected, duration, sets) : 0;

  // For strength: live volume
  const totalVolume = useMemo(() => {
    return sets.reduce((s, set) => s + (Number(set.reps) || 0) * (Number(set.weight) || 0), 0);
  }, [sets]);

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0a0a0a] pb-28">
      {/* Header */}
      <div className="bg-[#f8f8f8]/90 dark:bg-[#0a0a0a]/95 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100 dark:border-[#1a1a1a] px-4 pt-12 pb-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">🏋️ 訓練</h1>
            <p className="text-xs text-gray-400 mt-0.5">{dateKey}</p>
          </div>
          <div className="flex items-center gap-2">
            {totalBurned > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl px-4 py-2 text-center">
                <p className="text-lg font-bold text-orange-500">-{totalBurned}</p>
                <p className="text-xs text-gray-400">kcal 消耗</p>
              </div>
            )}
            {log.length > 0 && (
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-semibold shadow hover:opacity-90 disabled:opacity-60 transition-all active:scale-95"
              >
                {sharing
                  ? <span className="inline-block animate-spin">◌</span>
                  : '📤'}
                <span>{sharing ? '生成中…' : '分享'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 flex flex-col gap-4">

        {/* Muscle Heatmap */}
        <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#1e1e1e] p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">今日肌群熱力圖</h2>
          <MuscleHeatmap muscleIntensities={muscleIntensities} />
        </div>

        {/* Monthly Training Heatmap */}
        <TrainingCalendarHeatmap />

        {/* Today's Log */}
        <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#1e1e1e] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">今日運動</h2>
            <button
              onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors active:scale-95"
            >
              <span className="text-base leading-none">+</span> 新增運動
            </button>
          </div>

          {log.length === 0 && !showAdd && (
            <p className="text-xs text-gray-400 text-center py-4">
              還沒有記錄，點「新增運動」開始
            </p>
          )}

          {log.length > 0 && (
            <div className="flex flex-col gap-2 mb-1">
              {log.map(entry => (
                <ExerciseLogItem key={entry.id} entry={entry} onRemove={handleRemove} />
              ))}
            </div>
          )}
        </div>

        {/* Add Exercise Panel */}
        {showAdd && (
          <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#1e1e1e] p-4 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">新增運動</h2>

            {/* Layout C: library (left) + form (right) on ≥sm, stacked on mobile */}
            <div className="flex flex-col gap-4 sm:flex-row">

              {/* ── Left: Library ── */}
              <div className="flex-1 min-w-0">
                {/* Category tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-hide">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setCat(c.id); setSelected(null); }}
                      className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                        cat === c.id
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                      }`}
                    >
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>

                {/* Exercise list */}
                <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                  {filteredExercises.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => handleSelectExercise(ex)}
                      className={`text-left px-3 py-2.5 rounded-2xl text-sm transition-colors ${
                        selected?.id === ex.id
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-400'
                          : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:border-orange-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{ex.name}</span>
                        <span className="text-xs text-gray-400">MET {ex.met}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ex.muscles.primary.slice(0, 3).map(m => (
                          <span key={m} className="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300">
                            {MUSCLE_LABELS[m]}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Right: Form ── */}
              <div className="sm:w-52 flex flex-col gap-3">
                {!selected && (
                  <div className="flex items-center justify-center h-32 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-400 text-center">從左側選擇運動<br />或手動輸入</p>
                  </div>
                )}

                {selected && (
                  <>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl px-3 py-2">
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{selected.name}</p>
                      <p className="text-xs text-gray-400">
                        {profile.weight}kg × MET {selected.met}
                      </p>
                    </div>

                    {/* Duration (both cardio & strength) */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">時間（分鐘）</label>
                      <input
                        type="number" min="1" max="240"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                        className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      />
                    </div>

                    {/* Sets — only for strength */}
                    {selected.type === 'strength' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-500">組數與次數</label>
                          <button
                            onClick={handleAddSet}
                            className="text-xs text-orange-500 font-semibold"
                          >
                            + 加一組
                          </button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {sets.map((set, i) => (
                            <div key={i} className="flex items-center gap-1 min-w-0">
                              <span className="text-xs text-gray-400 w-4 shrink-0 text-center">{i + 1}</span>
                              <input
                                type="number" min="1" max="100"
                                value={set.reps}
                                onChange={e => handleSetChange(i, 'reps', e.target.value)}
                                placeholder="次"
                                className="min-w-0 w-0 flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-200"
                              />
                              <span className="text-xs text-gray-400 shrink-0">×</span>
                              <input
                                type="number" min="0" step="2.5"
                                value={set.weight}
                                onChange={e => handleSetChange(i, 'weight', e.target.value)}
                                placeholder="kg"
                                className="min-w-0 w-0 flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-200"
                              />
                              {sets.length > 1 && (
                                <button onClick={() => handleRemoveSet(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0 pl-0.5">×</button>
                              )}
                            </div>
                          ))}
                        </div>
                        {totalVolume > 0 && (
                          <p className="text-xs text-gray-400 mt-1 text-right">總訓練量 {totalVolume} kg</p>
                        )}
                      </div>
                    )}

                    {/* Calories preview */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2 text-center">
                      <p className="text-lg font-bold text-orange-500">-{previewCal} kcal</p>
                      <p className="text-xs text-gray-400">預估消耗</p>
                    </div>
                  </>
                )}

                {/* Manual name input if nothing selected */}
                {!selected && (
                  <ManualForm profile={profile} onAdd={(entry) => { persist([...log, entry]); setShowAdd(false); }} />
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowAdd(false); setSelected(null); }}
                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-2xl text-sm font-semibold"
              >
                取消
              </button>
              {selected && (
                <button
                  onClick={handleAddExercise}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl py-2.5 text-sm transition-colors active:scale-95"
                >
                  新增 {selected.name}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Exercise log item ─────────────────────────────────────────────────── */
function ExerciseLogItem({ entry, onRemove }) {
  const primaryMuscles = entry.muscles?.primary ?? [];

  return (
    <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-900/10 rounded-2xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{entry.name}</span>
          {entry.type === 'cardio' && (
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-[#1e1e1e] px-2 py-0.5 rounded-full">
              {entry.duration} 分鐘
            </span>
          )}
          {entry.type === 'strength' && entry.sets?.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-[#1e1e1e] px-2 py-0.5 rounded-full">
              {entry.sets.length} 組
            </span>
          )}
        </div>

        {/* Muscle chips */}
        {primaryMuscles.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {primaryMuscles.map(m => {
              const intensity = calcMuscleIntensities([entry])[m] || 0;
              const color = intensityColor(intensity);
              return (
                <span
                  key={m}
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{
                    background: color ?? '#F3F4F6',
                    color: color ? '#374151' : '#9CA3AF',
                  }}
                >
                  {MUSCLE_LABELS[m]}
                </span>
              );
            })}
          </div>
        )}

        {/* Sets detail for strength */}
        {entry.type === 'strength' && entry.sets?.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            {entry.sets.map((s, i) => `${s.reps}×${s.weight}kg`).join('  ')}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-orange-500 whitespace-nowrap">-{entry.calories} kcal</span>
        <button
          onClick={() => onRemove(entry.id)}
          className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/* ── Manual entry form (when nothing selected from library) ────────────── */
function ManualForm({ profile, onAdd }) {
  const [name, setName]         = useState('');
  const [duration, setDuration] = useState('');
  const [sets, setSets]         = useState([{ reps: '10', weight: '' }]);

  const weightKg = profile?.weight ?? 70;

  // Estimate calories: MET 5.0 for general strength training
  const MET = 5.0;
  const estimated = duration
    ? Math.round(MET * weightKg * (Number(duration) || 0) / 60)
    : null;

  function updateSet(i, field, val) {
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }
  function addSet()    { setSets(prev => [...prev, { reps: '10', weight: '' }]); }
  function removeSet(i) { setSets(prev => prev.filter((_, idx) => idx !== i)); }

  function handle() {
    if (!name) return;
    onAdd({
      id:       Date.now(),
      name,
      type:     'strength',
      duration: Number(duration) || 0,
      calories: estimated ?? 0,
      muscles:  { primary: [], secondary: [] },
      sets:     sets.map(s => ({ reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 })),
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-[#222] pt-3">
      <p className="text-xs text-gray-400 font-semibold">手動輸入</p>

      {/* Name */}
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="運動名稱（例：HS 胸推）"
        className="w-full border border-gray-200 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
      />

      {/* Duration */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">訓練時間（分鐘）</label>
        <input
          type="number" min="1" value={duration}
          onChange={e => setDuration(e.target.value)}
          placeholder="30"
          className="w-full border border-gray-200 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
      </div>

      {/* Sets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">組數 / 次數</label>
          <button
            type="button" onClick={addSet}
            className="text-xs text-orange-500 font-semibold hover:text-orange-600"
          >+ 加一組</button>
        </div>
        <div className="flex flex-col gap-1.5">
          {sets.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-8 shrink-0">第{i + 1}組</span>
              <div className="flex-1 flex items-center gap-1">
                <input
                  type="number" min="1" value={s.reps}
                  onChange={e => updateSet(i, 'reps', e.target.value)}
                  placeholder="次數"
                  className="flex-1 border border-gray-200 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
                <span className="text-xs text-gray-400">次</span>
              </div>
              <div className="flex-1 flex items-center gap-1">
                <input
                  type="number" min="0" step="0.5" value={s.weight}
                  onChange={e => updateSet(i, 'weight', e.target.value)}
                  placeholder="重量"
                  className="flex-1 border border-gray-200 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
                <span className="text-xs text-gray-400">kg</span>
              </div>
              {sets.length > 1 && (
                <button onClick={() => removeSet(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Estimated calories */}
      {estimated !== null && (
        <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 rounded-xl px-4 py-2.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">預估消耗</span>
          <span className="text-lg font-bold text-orange-500">{estimated} <span className="text-xs font-normal">kcal</span></span>
        </div>
      )}

      <button
        onClick={handle}
        disabled={!name}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-2xl py-2.5 text-sm transition-colors active:scale-95"
      >
        新增
      </button>
    </div>
  );
}

/* ─── TrainingCalendarHeatmap ─── */
function TrainingCalendarHeatmap() {
  const now        = new Date();
  const year       = now.getFullYear();
  const month      = now.getMonth();
  const todayKey   = getTodayKey();
  const allExercise = useMemo(() => loadAllExercise(), []);

  const firstDay    = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWD     = firstDay.getDay(); // 0=Sun

  const cells = [
    ...Array(startWD).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d   = i + 1;
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const exercises = allExercise[key] || [];
      const totalBurned = exercises.reduce((s, e) => s + (e.calories || 0), 0);
      const count = exercises.length;
      return { d, key, count, totalBurned, isToday: key === todayKey, isFuture: key > todayKey };
    }),
  ];

  function cellStyle(cell) {
    if (!cell || cell.isFuture) return 'bg-gray-50 dark:bg-gray-700/40 text-gray-300 dark:text-gray-600';
    if (cell.count === 0) return 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-400 dark:text-gray-500';
    if (cell.count >= 4)  return 'bg-orange-300 dark:bg-orange-700/60 text-orange-800 dark:text-orange-200';
    if (cell.count >= 2)  return 'bg-orange-200 dark:bg-orange-800/50 text-orange-700 dark:text-orange-300';
    return 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400';
  }

  const daysWorked = cells.filter(c => c && !c.isFuture && c.count > 0).length;
  const totalKcal  = cells.filter(Boolean).reduce((s, c) => s + (c.totalBurned || 0), 0);

  return (
    <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#1e1e1e] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] text-gray-400 dark:text-gray-600 uppercase tracking-widest">
          {month + 1} 月訓練熱力圖
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <div className="w-3 h-3 rounded bg-gray-100 dark:bg-[#1a1a1a]" />
          <div className="w-3 h-3 rounded bg-orange-100 dark:bg-orange-900/40" />
          <div className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-800/50" />
          <div className="w-3 h-3 rounded bg-orange-300 dark:bg-orange-700/60" />
          <span className="ml-0.5">無·少·中·多</span>
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
              title={cell.count > 0 ? `${cell.count} 項運動・消耗 ${cell.totalBurned} kcal` : ''}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-colors ${cellStyle(cell)} ${cell.isToday ? 'ring-2 ring-orange-400 ring-offset-1 dark:ring-offset-[#111]' : ''}`}
            >
              <span className="text-xs font-semibold leading-none">{cell.d}</span>
              {cell.count > 0 && (
                <span className="text-[8px] leading-none mt-0.5 opacity-70">{cell.count}項</span>
              )}
            </div>
          );
        })}
      </div>

      {daysWorked > 0 && (
        <div className="flex justify-between text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-[#1e1e1e]">
          <span>本月訓練 <span className="font-semibold text-orange-500">{daysWorked} 天</span></span>
          <span>累計消耗 <span className="font-semibold text-orange-500">{totalKcal} kcal</span></span>
        </div>
      )}
    </div>
  );
}
