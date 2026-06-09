import { useState, useMemo, useCallback, useEffect } from 'react';
import { loadExerciseLog, saveExerciseLog, loadAllExercise, loadProfile, getTodayKey } from '../utils/storage';
import { EXERCISES, CATEGORIES, MUSCLE_LABELS, calcMuscleIntensities, intensityColor } from '../data/exercises';
import { generateTrainingCard } from '../utils/shareCard';
import { parseWorkoutPlan } from '../utils/ai';
import MuscleHeatmap from '../components/MuscleHeatmap';
import SharePreviewModal from '../components/SharePreviewModal';
import AiChatDrawer from '../components/AiChatDrawer';

function offsetToKey(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function viewLabel(offset) {
  if (offset === 0) return '今天';
  if (offset === -1) return '昨天';
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function Training() {
  const todayKey = getTodayKey();
  const profile  = useMemo(() => loadProfile(), []);

  const [viewOffset, setViewOffset] = useState(0);
  const dateKey = useMemo(() => offsetToKey(viewOffset), [viewOffset]);
  const isToday = viewOffset === 0;

  const [log, setLog] = useState(() => loadExerciseLog(todayKey));

  // Reload log when date changes
  useEffect(() => {
    setLog(loadExerciseLog(dateKey));
    setShowAdd(false);
  }, [dateKey]);
  const [showAdd, setShowAdd]   = useState(false);
  const [cat, setCat]           = useState('cardio');
  const [selected, setSelected] = useState(null); // exercise object from DB
  const [duration, setDuration] = useState('30');
  const [durationTouched, setDurationTouched] = useState(false);
  const [sets, setSets]         = useState([{ reps: '10', weight: '20' }]);
  const [showPaste, setShowPaste] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const totalBurned = useMemo(() => log.reduce((s, e) => s + (e.calories || 0), 0), [log]);
  const muscleIntensities = useMemo(() => calcMuscleIntensities(log), [log]);
  const [sharing, setSharing]     = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showChat, setShowChat]   = useState(false);

  async function handleShare() {
    if (sharing || log.length === 0) return;
    setSharing(true);
    try {
      const days = ['日','一','二','三','四','五','六'];
      const viewDate = new Date(dateKey + 'T00:00:00');
      const dateStr = `${viewDate.getMonth()+1}月${viewDate.getDate()}日（週${days[viewDate.getDay()]}）`;

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

      setPreviewUrl(dataUrl);
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
    setDurationTouched(false);
    setDuration(ex.type === 'strength' ? '30' : '30');
    setSets([{ reps: '10', weight: '20' }]);
  }

  function calcCalories(ex, dur, setList) {
    const weightKg = profile.weight || 65;
    const hours    = (Number(dur) || 0) / 60;
    return Math.round((ex.met || 5) * weightKg * hours);
  }

  // Auto-suggest duration from set count (≈3 min/set incl. rest), unless user manually edited it
  function autoDuration(nextLen) {
    if (!durationTouched) setDuration(String(nextLen * 3));
  }

  function handleAddSet() {
    setSets(prev => {
      const next = [...prev, { reps: '10', weight: prev[prev.length - 1]?.weight ?? '20' }];
      autoDuration(next.length);
      return next;
    });
  }

  function handleRemoveSet(i) {
    setSets(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      autoDuration(next.length);
      return next;
    });
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
    setDurationTouched(false);
    setSets([{ reps: '10', weight: '20' }]);
  }

  function handleRemove(id) {
    persist(log.filter(e => e.id !== id));
  }

  function handleUpdateEntry(id, updates) {
    persist(log.map(e => e.id === id ? { ...e, ...updates } : e));
    setEditingEntry(null);
  }

  function handleAddMany(entries) {
    const next = [...log, ...entries];
    persist(next);
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
        <div className="max-w-lg mx-auto flex flex-col gap-2">
          {/* Row 1: title + actions */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">🏋️ 訓練</h1>
            <div className="flex items-center gap-2">
              {totalBurned > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl px-3 py-1.5 text-center">
                  <p className="text-sm font-bold text-orange-500">-{totalBurned} kcal</p>
                </div>
              )}
              <button
                onClick={() => setShowPaste(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold transition-all active:scale-95"
              >
                📋 貼上計劃
              </button>
              {log.length > 0 && (
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-semibold shadow hover:opacity-90 disabled:opacity-60 transition-all active:scale-95"
                >
                  {sharing ? <span className="inline-block animate-spin">◌</span> : '📤'}
                  <span>{sharing ? '生成中…' : '分享'}</span>
                </button>
              )}
            </div>
          </div>
          {/* Row 2: date navigator */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setViewOffset(o => o - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#1e1e1e] text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] active:scale-95 transition-all text-sm font-bold"
            >
              ‹
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[72px]">{viewLabel(viewOffset)}</p>
              <p className="text-[11px] text-gray-400">{dateKey}</p>
            </div>
            <button
              onClick={() => setViewOffset(o => Math.min(0, o + 1))}
              disabled={isToday}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#1e1e1e] text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] disabled:opacity-30 active:scale-95 transition-all text-sm font-bold"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 flex flex-col gap-4">

        {/* Muscle Heatmap */}
        <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#1e1e1e] p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{viewLabel(viewOffset)}肌群熱力圖</h2>
          <MuscleHeatmap muscleIntensities={muscleIntensities} />
        </div>

        {/* Monthly Training Heatmap */}
        <TrainingCalendarHeatmap onDayClick={key => {
          const today = new Date();
          today.setHours(0,0,0,0);
          const clicked = new Date(key);
          clicked.setHours(0,0,0,0);
          const diff = Math.round((clicked - today) / 86400000);
          setViewOffset(diff);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} />

        {/* Today's Log */}
        <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#1e1e1e] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{viewLabel(viewOffset)}運動</h2>
            <button
              onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors active:scale-95"
            >
              <span className="text-base leading-none">+</span> 新增運動
            </button>
          </div>

          {log.length === 0 && !showAdd && (
            <p className="text-xs text-gray-400 text-center py-4">
              {isToday ? '還沒有記錄，點「新增運動」開始' : '這天沒有運動記錄'}
            </p>
          )}

          {log.length > 0 && (
            <div className="flex flex-col gap-2 mb-1">
              {log.map(entry => (
                <ExerciseLogItem key={entry.id} entry={entry} onRemove={handleRemove} onEdit={setEditingEntry} />
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
                        onChange={e => { setDuration(e.target.value); setDurationTouched(true); }}
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

      {/* AI Chat FAB */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-violet-500 hover:bg-violet-600 text-white shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center text-2xl"
        aria-label="AI 訓練助手"
      >
        🤖
      </button>

      {previewUrl && (
        <SharePreviewModal
          dataUrl={previewUrl}
          filename="wisefitness-training.png"
          title="Fitness 今日訓練"
          onClose={() => setPreviewUrl(null)}
        />
      )}

      {showPaste && (
        <PasteSheet
          profile={profile}
          onAdd={handleAddMany}
          onClose={() => setShowPaste(false)}
        />
      )}

      {editingEntry && (
        <EditEntrySheet
          entry={editingEntry}
          profile={profile}
          onSave={updates => handleUpdateEntry(editingEntry.id, updates)}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {showChat && (
        <AiChatDrawer
          mode="training"
          onConfirmExercises={entries => handleAddMany(entries.map(e => {
            const matched = EXERCISES.find(ex => ex.name.toLowerCase() === e.name.toLowerCase())
              || EXERCISES.find(ex => e.name.toLowerCase().includes(ex.name.toLowerCase()) || ex.name.toLowerCase().includes(e.name.toLowerCase()));
            const weightKg = profile.weight || 65;
            const MET = matched?.met ?? 5;
            const dur = e.duration || Math.ceil((e.sets?.length || 1) * 3) || 5;
            return {
              id:       Date.now() + Math.random(),
              name:     e.name,
              type:     matched?.type ?? 'strength',
              met:      MET,
              duration: dur,
              calories: Math.round(MET * weightKg * dur / 60),
              muscles:  matched?.muscles ?? { primary: [], secondary: [] },
              sets:     (e.sets || []),
            };
          }))}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}

/* ── Exercise log item ─────────────────────────────────────────────────── */
function ExerciseLogItem({ entry, onRemove, onEdit }) {
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
          onClick={() => onEdit(entry)}
          className="text-gray-300 hover:text-orange-400 transition-colors text-sm leading-none"
        >
          ✏️
        </button>
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

/* ── PasteSheet ────────────────────────────────────────────────────────── */
// 範本格式：動作名稱 X組 Y下 Zkg（每行一個動作；重量可省略）
const PLAN_TEMPLATE_PROMPT = `請幫我安排今天的訓練計劃，並且每個動作都用「以下這個固定格式」單獨一行輸出，不要有其他文字混在同一行：

動作名稱 X組 Y下 Zkg

範例：
槓鈴平板臥推 4組 8下 50kg
上斜啞鈴臥推 3組 10下 20kg
滑輪夾胸 2組 15下 12.5kg

如果是徒手或不需要負重的動作，公斤數可以省略，例如：
捲腹 3組 20下

請開始安排：[在這裡描述你今天想練的部位/目標]`;

function parsePlanLocally(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const DASH = '[-–—~]';                                     // -, –, —, ~ (handles ranges)
  const SET_RE    = /(\d+)\s*組/;
  const REPS_RE   = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${DASH}\\s*(\\d+(?:\\.\\d+)?))?\\s*下`);
  const WEIGHT_RE = new RegExp(`(?:每邊\\s*)?(\\d+(?:\\.\\d+)?)\\s*(?:${DASH}\\s*(\\d+(?:\\.\\d+)?))?\\s*kg`, 'i');

  const items = [];
  for (const line of lines) {
    const setM = line.match(SET_RE);
    const repM = line.match(REPS_RE);
    if (!setM || !repM) return null; // doesn't match the format → bail, fall back to AI

    const n = parseInt(setM[1], 10);
    const r = Math.round(parseFloat(repM[2] || repM[1])); // range → take max

    const wM = line.match(WEIGHT_RE);
    const w  = wM ? Math.round(parseFloat(wM[2] || wM[1])) : 0; // range → take max

    // 動作名稱 = 「組數」字樣之前的文字（去掉尾端分隔符號）
    const name = line.slice(0, setM.index).trim().replace(/[\s,，｜|]+$/, '');
    if (!name) return null;

    items.push({
      name,
      sets: Array.from({ length: n }, () => ({ reps: r, weight: w })),
      duration: n * 3,
    });
  }
  return items;
}

function PasteSheet({ profile, onAdd, onClose }) {
  const [text, setText]     = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [parsed, setParsed] = useState([]);
  const [errMsg, setErrMsg] = useState('');
  const [usedAi, setUsedAi] = useState(false);
  const [copied, setCopied] = useState(false);

  const weightKg = profile?.weight ?? 70;
  const MET = 5.0;

  // 嘗試將解析出的動作名稱對應回資料庫，帶出肌群資訊（讓人體熱力圖能正確顯示）
  function matchExercise(name) {
    const n = name.trim().toLowerCase();
    if (!n) return null;
    return (
      EXERCISES.find(e => e.name.toLowerCase() === n) ||
      EXERCISES.find(e => n.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(n)) ||
      null
    );
  }

  function buildEntries(result) {
    return result.map(item => {
      const dur = item.duration || Math.ceil((item.sets?.length || 1) * 3) || 5;
      const matched = matchExercise(item.name);
      return {
        id:       Date.now() + Math.random(),
        name:     item.name,
        type:     'strength',
        met:      matched?.met ?? MET,
        duration: dur,
        calories: Math.round((matched?.met ?? MET) * weightKg * dur / 60),
        muscles:  matched?.muscles ?? { primary: [], secondary: [] },
        sets:     (item.sets || []).map(s => ({ reps: s.reps || 0, weight: s.weight || 0 })),
      };
    });
  }

  function handleCopyTemplate() {
    navigator.clipboard?.writeText(PLAN_TEMPLATE_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleParse() {
    if (!text.trim()) return;
    setStatus('loading');
    setErrMsg('');
    setUsedAi(false);

    // 1️⃣ Try local rule-based parsing first — free, instant
    const local = parsePlanLocally(text.trim());
    if (local && local.length > 0) {
      setParsed(buildEntries(local));
      setStatus('done');
      return;
    }

    // 2️⃣ Fall back to AI for freeform / messy text
    setUsedAi(true);
    try {
      const result = await parseWorkoutPlan(text.trim());
      setParsed(buildEntries(result));
      setStatus('done');
    } catch (e) {
      if (e.message === 'NO_KEY') setErrMsg('請先在設定頁面輸入 API Key');
      else if (e.message === 'INVALID_KEY') setErrMsg('API Key 無效，請至設定頁確認');
      else setErrMsg(e.message?.startsWith('PARSE_ERROR') ? e.message.replace('PARSE_ERROR：', '') : `解析失敗：${e.message}`);
      setStatus('error');
    }
  }

  function handleConfirm() {
    onAdd(parsed);
    onClose();
  }

  const totalKcal = parsed.reduce((s, e) => s + e.calories, 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#111] rounded-t-3xl w-full max-w-lg p-6 pb-10 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">📋 貼上訓練計劃</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {status !== 'done' ? (
          <>
            <p className="text-xs text-gray-400 mb-2">
              把訓練計劃文字貼進來。符合「動作 X組 Y下 Zkg」格式的話會直接免費解析；
              格式不規則時才會用 AI 輔助理解。
            </p>
            <button
              type="button"
              onClick={handleCopyTemplate}
              className="mb-3 self-start text-xs px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-300 hover:bg-violet-100 transition-colors font-medium"
            >
              {copied ? '✅ 已複製，貼到 ChatGPT 給它吧' : '📋 複製 ChatGPT 範本提示詞'}
            </button>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`例如：\n槓鈴平板臥推 4組 8下 50kg\n上斜啞鈴臥推 3組 10下 20kg\n滑輪夾胸 2組 15下 12.5kg`}
              rows={7}
              className="w-full border border-gray-200 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
            />
            {errMsg && <p className="text-xs text-red-500 mt-2">{errMsg}</p>}
            <button
              onClick={handleParse}
              disabled={!text.trim() || status === 'loading'}
              className="mt-3 w-full py-3 rounded-2xl bg-violet-500 hover:bg-violet-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {status === 'loading'
                ? <><span className="inline-block animate-spin">◌</span> 解析中…</>
                : '解析計劃'}
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">
              解析完成！以下動作將加入今日訓練：
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${usedAi ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300'}`}>
                {usedAi ? '✨ AI 輔助解析' : '⚡ 本地免費解析'}
              </span>
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {parsed.map((e, i) => (
                <div key={i} className="flex items-start justify-between bg-gray-50 dark:bg-[#1a1a1a] rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{e.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {e.sets.length} 組・{e.duration} 分鐘
                      {e.sets.some(s => s.weight > 0) && `・${e.sets.map(s => `${s.reps}×${s.weight}kg`).join(' ')}`}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-orange-500 shrink-0 ml-2">~{e.calories} kcal</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm mb-4 px-1">
              <span className="text-gray-500">共 {parsed.length} 項・預估消耗</span>
              <span className="font-bold text-orange-500">{totalKcal} kcal</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setStatus('idle'); setParsed([]); }}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 font-semibold text-sm"
              >
                重新輸入
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-all active:scale-95"
              >
                加入今日訓練
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── TrainingCalendarHeatmap ─── */
function TrainingCalendarHeatmap({ onDayClick }) {
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
              onClick={() => !cell.isFuture && onDayClick?.(cell.key)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-colors ${cellStyle(cell)} ${cell.isToday ? 'ring-2 ring-orange-400 ring-offset-1 dark:ring-offset-[#111]' : ''} ${!cell.isFuture ? 'cursor-pointer hover:opacity-75 active:scale-95' : ''}`}
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

/* ── EditEntrySheet ────────────────────────────────────────────────────── */
function EditEntrySheet({ entry, profile, onSave, onClose }) {
  const weightKg = profile?.weight || 65;
  const MET = entry.met || 5.0;
  const isStrength = entry.type === 'strength';

  const [duration, setDuration] = useState(String(entry.duration ?? 0));
  const [sets, setSets] = useState(
    isStrength && entry.sets?.length > 0
      ? entry.sets.map(s => ({ reps: String(s.reps ?? 0), weight: String(s.weight ?? 0) }))
      : [{ reps: '10', weight: '20' }]
  );

  function handleAddSet() {
    setSets(prev => [...prev, { reps: '10', weight: prev[prev.length - 1]?.weight ?? '20' }]);
  }
  function handleRemoveSet(i) {
    setSets(prev => prev.filter((_, idx) => idx !== i));
  }
  function handleSetChange(i, field, val) {
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }

  const dur = Number(duration) || 0;
  const estimated = Math.round(MET * weightKg * dur / 60);

  function handleSave() {
    const updates = {
      duration: dur,
      calories: estimated,
    };
    if (isStrength) {
      updates.sets = sets.map(s => ({ reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 }));
    }
    onSave(updates);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#111] rounded-t-3xl w-full max-w-lg p-6 pb-10 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">✏️ 編輯 {entry.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">時間（分鐘）</label>
            <input
              type="number" min="1" max="240"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full border border-gray-200 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {isStrength && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-500">組數與次數</label>
                <button onClick={handleAddSet} className="text-xs text-orange-500 font-semibold">+ 加一組</button>
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
                      className="min-w-0 w-0 flex-1 border border-gray-200 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-gray-100 rounded-xl px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                    <span className="text-xs text-gray-400 shrink-0">×</span>
                    <input
                      type="number" min="0" step="2.5"
                      value={set.weight}
                      onChange={e => handleSetChange(i, 'weight', e.target.value)}
                      placeholder="kg"
                      className="min-w-0 w-0 flex-1 border border-gray-200 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-gray-100 rounded-xl px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                    {sets.length > 1 && (
                      <button onClick={() => handleRemoveSet(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0 pl-0.5">×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-orange-500">-{estimated} kcal</p>
            <p className="text-xs text-gray-400">預估消耗（依時間重新計算）</p>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl py-3 text-sm transition-colors active:scale-95"
          >
            儲存變更
          </button>
        </div>
      </div>
    </div>
  );
}
