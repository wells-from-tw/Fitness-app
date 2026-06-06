import { useState, useRef } from 'react';
import { loadGoals, saveGoals, loadProfile, saveProfile, loadAllDays, loadWeightLog, loadAllExercise, loadWeightGoal, saveWeightGoal, loadMealSplit, saveMealSplit, loadWaterGoal, saveWaterGoal } from '../utils/storage';
import { calcBMR, calcTDEE, calcBMI, bmiLabel, ACTIVITY_LEVELS } from '../utils/tdee';
import { loadApiKey, saveApiKey } from '../utils/ai';

const FIELDS = [
  { key: 'calories', label: '每日卡路里目標', unit: 'kcal', min: 500,  max: 5000, step: 50, color: 'blue'  },
  { key: 'carbs',    label: '碳水化合物',     unit: 'g',    min: 0,    max: 600,  step: 5,  color: 'amber' },
  { key: 'protein',  label: '蛋白質',         unit: 'g',    min: 0,    max: 400,  step: 5,  color: 'blue'  },
  { key: 'fat',      label: '脂肪',           unit: 'g',    min: 0,    max: 200,  step: 2,  color: 'rose'  },
];

const PRESETS = [
  { label: '減重', desc: '低卡高蛋白', goals: { calories: 1500, carbs: 150, protein: 140, fat: 50 } },
  { label: '維持', desc: '均衡攝取',   goals: { calories: 2000, carbs: 250, protein: 120, fat: 65 } },
  { label: '增肌', desc: '高蛋白高熱', goals: { calories: 2500, carbs: 300, protein: 180, fat: 80 } },
];

const COLOR_MAP = {
  blue:  { ring: 'ring-blue-400',  bg: 'bg-blue-50',  text: 'text-blue-600'  },
  amber: { ring: 'ring-amber-400', bg: 'bg-amber-50', text: 'text-amber-600' },
  rose:  { ring: 'ring-rose-400',  bg: 'bg-rose-50',  text: 'text-rose-600'  },
};

export default function Settings() {
  const [goals,      setGoals]      = useState(() => loadGoals());
  const [profile,    setProfile]    = useState(() => loadProfile());
  const [saved,      setSaved]      = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [importMsg,  setImportMsg]  = useState('');
  const [tdeeSheet,  setTdeeSheet]  = useState(false);
  const importRef = useRef(null);

  // Live BMI / TDEE from profile + latest weight
  const weightLog = (() => {
    try { return JSON.parse(localStorage.getItem('wisefitness_weight') || '{}'); } catch { return {}; }
  })();
  const latestWeight = Object.values(weightLog).slice(-1)[0] ?? profile.weight ?? 65;
  const bmr  = calcBMR(profile.gender, latestWeight, profile.height, profile.age);
  const tdee = calcTDEE(bmr, profile.activity);
  const bmi  = latestWeight > 0 && profile.height > 0 ? calcBMI(latestWeight, profile.height) : null;
  const bmiInfo = bmi ? bmiLabel(bmi) : null;

  function setField(key, val)    { setGoals(p => ({ ...p, [key]: Number(val) })); setSaved(false); }
  function setProf(key, val)     { setProfile(p => ({ ...p, [key]: val }));       setProfileSaved(false); }
  function applyPreset(preset)   { setGoals(preset.goals); setSaved(false); }

  function handleSaveGoals() {
    saveGoals(goals);
    window.dispatchEvent(new Event('wisefitness:goals-updated'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleSaveProfile() {
    saveProfile(profile);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
    // Prompt to apply TDEE if goals differ noticeably
    if (Math.abs(tdee - goals.calories) > 80) {
      setTdeeSheet(true);
    }
  }

  function applyTDEE() {
    setGoals(p => ({ ...p, calories: tdee }));
    setSaved(false);
  }

  const ALL_KEYS = [
    'wisefitness_data', 'wisefitness_goals', 'wisefitness_weight',
    'wisefitness_exercise', 'wisefitness_water', 'wisefitness_profile',
    'wisefitness_favs', 'wisefitness_api_key', 'wisefitness_weight_goal',
    'wisefitness_meal_split', 'wisefitness_water_goal',
  ];

  function handleExportJSON() {
    const data = {};
    ALL_KEYS.forEach(key => {
      const val = localStorage.getItem(key);
      if (val) {
        try { data[key] = JSON.parse(val); } catch { data[key] = val; }
      }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `wisefitness_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        ALL_KEYS.forEach(key => {
          if (data[key] !== undefined) {
            localStorage.setItem(key, typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]));
          }
        });
        setImportMsg('✓ 還原成功，重新載入中…');
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        setImportMsg('❌ 無效的備份檔案');
        setTimeout(() => setImportMsg(''), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleExportCSV() {
    const allDays     = loadAllDays();
    const weightLog   = loadWeightLog();
    const exerciseLog = loadAllExercise();
    const MEAL_MAP    = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心' };

    const rows = ['日期,餐別,食物名稱,熱量(kcal),碳水(g),蛋白質(g),脂肪(g)'];
    Object.entries(allDays).sort().forEach(([date, day]) => {
      Object.entries(day.meals || {}).forEach(([mealKey, foods]) => {
        foods.forEach(f => {
          rows.push([date, MEAL_MAP[mealKey] || mealKey, `"${f.name}"`, f.calories, f.carbs, f.protein, f.fat].join(','));
        });
      });
    });

    rows.push('');
    rows.push('日期,體重(kg)');
    Object.entries(weightLog).sort().forEach(([date, kg]) => rows.push(`${date},${kg}`));

    rows.push('');
    rows.push('日期,運動名稱,時間(分),消耗(kcal)');
    Object.entries(exerciseLog).sort().forEach(([date, exercises]) => {
      exercises.forEach(e => rows.push([date, `"${e.name}"`, e.duration, e.calories].join(',')));
    });

    const csv   = rows.join('\n');
    const blob  = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `wisefitness_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50 dark:from-gray-900 dark:to-gray-950">
      <header className="bg-white/80 dark:bg-gray-900/90 backdrop-blur-md sticky top-0 z-30 border-b border-blue-50 dark:border-gray-800 shadow-sm">
        <div className="max-w-lg mx-auto px-5 py-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">設定</h1>
          <p className="text-xs text-gray-400 mt-0.5">個人資料與每日目標</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 pb-28 flex flex-col gap-4">

        {/* ── 個人資料 ── */}
        <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">個人資料</h2>

          {/* Gender */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">性別</label>
            <div className="flex gap-2">
              {[{ v: 'male', label: '男' }, { v: 'female', label: '女' }].map(({ v, label }) => (
                <button key={v} type="button" onClick={() => setProf('gender', v)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    profile.gender === v
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Age + Height + Weight row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">年齡</label>
              <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden dark:bg-gray-700">
                <input type="number" min="10" max="99" value={profile.age}
                  onChange={e => setProf('age', Number(e.target.value))}
                  className="flex-1 px-2 py-2.5 text-sm text-center focus:outline-none w-0 dark:bg-gray-700 dark:text-gray-100"/>
                <span className="px-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-600 h-full flex items-center border-l border-gray-200 dark:border-gray-600">歲</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">身高</label>
              <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden dark:bg-gray-700">
                <input type="number" min="100" max="250" value={profile.height}
                  onChange={e => setProf('height', Number(e.target.value))}
                  className="flex-1 px-2 py-2.5 text-sm text-center focus:outline-none w-0 dark:bg-gray-700 dark:text-gray-100"/>
                <span className="px-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-600 h-full flex items-center border-l border-gray-200 dark:border-gray-600">cm</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">體重</label>
              <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden dark:bg-gray-700">
                <input type="number" min="20" max="300" step="0.1" value={profile.weight ?? 65}
                  onChange={e => setProf('weight', Number(e.target.value))}
                  className="flex-1 px-2 py-2.5 text-sm text-center focus:outline-none w-0 dark:bg-gray-700 dark:text-gray-100"/>
                <span className="px-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-600 h-full flex items-center border-l border-gray-200 dark:border-gray-600">kg</span>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="mb-5">
            <label className="text-xs text-gray-500 mb-2 block">活動量</label>
            <div className="flex flex-col gap-1.5">
              {ACTIVITY_LEVELS.map(({ value, label, desc }) => (
                <button key={value} type="button" onClick={() => setProf('activity', value)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-colors ${
                    profile.activity === value
                      ? 'bg-blue-50 border-2 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100'
                  }`}>
                  <span className="font-semibold">{label}</span>
                  <span className="text-xs opacity-60">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSaveProfile}
            className={`w-full py-3 rounded-2xl font-semibold text-white text-sm transition-all active:scale-95 ${
              profileSaved ? 'bg-green-500' : 'bg-gray-700 hover:bg-gray-800'
            }`}>
            {profileSaved ? '✓ 已儲存' : '儲存個人資料'}
          </button>
        </section>

        {/* ── BMI & TDEE ── */}
        <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">BMI & 建議熱量</h2>
          <p className="text-xs text-gray-400 mb-4">依據個人資料與最近記錄的體重計算（Mifflin-St Jeor 公式）</p>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* BMI */}
            <div className={`rounded-2xl p-3 text-center ${bmiInfo ? bmiInfo.bg : 'bg-gray-50'}`}>
              <p className={`text-2xl font-bold ${bmiInfo ? bmiInfo.color : 'text-gray-400'}`}>
                {bmi ?? '—'}
              </p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">BMI</p>
              {bmiInfo && <p className={`text-xs font-semibold mt-0.5 ${bmiInfo.color}`}>{bmiInfo.label}</p>}
            </div>
            {/* BMR */}
            <div className="bg-gray-50 rounded-2xl p-3 text-center">
              <p className="text-2xl font-bold text-gray-700">{Math.round(bmr)}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">BMR</p>
              <p className="text-xs text-gray-400 mt-0.5">kcal/日</p>
            </div>
            {/* TDEE */}
            <div className="bg-blue-50 rounded-2xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{tdee}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">TDEE</p>
              <p className="text-xs text-gray-400 mt-0.5">kcal/日</p>
            </div>
          </div>

          {/* Goal suggestions */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: '減重 (-500)', kcal: tdee - 500, color: 'text-rose-500',  bg: 'bg-rose-50'  },
              { label: '維持',        kcal: tdee,        color: 'text-blue-500',  bg: 'bg-blue-50'  },
              { label: '增肌 (+300)', kcal: tdee + 300,  color: 'text-green-500', bg: 'bg-green-50' },
            ].map(({ label, kcal, color, bg }) => (
              <button key={label} type="button"
                onClick={() => { setGoals(p => ({ ...p, calories: Math.max(1200, kcal) })); setSaved(false); }}
                className={`${bg} rounded-xl p-2.5 text-center transition-all active:scale-95 hover:opacity-80`}>
                <p className={`text-sm font-bold ${color}`}>{Math.max(1200, kcal)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </button>
            ))}
          </div>

          <button onClick={applyTDEE}
            className="w-full py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-all active:scale-95">
            套用 TDEE 維持熱量（{tdee} kcal）
          </button>
        </section>

        {/* Weight trend */}
        <WeightTrendChart profile={profile} />

        {/* Weight goal */}
        <WeightGoalSection currentWeight={latestWeight} />

        {/* Macro trend chart */}
        <MacroTrendChart />

        {/* Meal split */}
        <MealSplitSection totalCalories={goals.calories} />

        {/* Water goal */}
        <WaterGoalSection />

        {/* ── 快速套用 ── */}
        <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">快速套用</h2>
          <div className="grid grid-cols-3 gap-3">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => applyPreset(p)}
                className="flex flex-col items-center gap-1 p-3 rounded-2xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all active:scale-95">
                <span className="text-base font-bold text-gray-700">{p.label}</span>
                <span className="text-xs text-gray-400 text-center">{p.desc}</span>
                <span className="text-xs font-semibold text-blue-500 mt-1">{p.goals.calories} kcal</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── 精細調整 ── */}
        <section className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">精細調整</h2>
          {FIELDS.map(({ key, label, unit, min, max, step, color }) => {
            const c   = COLOR_MAP[color];
            const val = goals[key] ?? 0;
            const pct = Math.min(((val - min) / (max - min)) * 100, 100);
            return (
              <div key={key}>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</label>
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${c.bg} ring-2 ${c.ring}`}>
                    <span className={`text-base font-bold ${c.text}`}>{val}</span>
                    <span className={`text-xs ${c.text} opacity-70`}>{unit}</span>
                  </div>
                </div>
                <input type="range" min={min} max={max} step={step} value={val}
                  onChange={e => setField(key, e.target.value)}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${
                    color === 'amber' ? '#fbbf24' : color === 'rose' ? '#fb7185' : '#3b82f6'
                  } ${pct}%, #e5e7eb ${pct}%)` }}/>
                <div className="flex justify-between text-xs text-gray-300 mt-1">
                  <span>{min}{unit}</span><span>{max}{unit}</span>
                </div>
              </div>
            );
          })}
        </section>

        {/* Macros ratio */}
        <MacroRatioCard goals={goals} />

        {/* Save goals */}
        <button onClick={handleSaveGoals}
          className={`w-full py-4 rounded-2xl font-semibold text-white text-base shadow-md transition-all active:scale-95 ${
            saved ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'
          }`}>
          {saved ? '✓ 已儲存' : '儲存目標設定'}
        </button>

        {/* ── API Key ── */}
        <ApiKeySection />

        {/* ── 資料管理 ── */}
        <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">💾</span>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">資料管理</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            JSON 備份包含所有資料可完整還原；CSV 適合匯入 Excel 分析。
          </p>

          {/* JSON backup/restore */}
          <div className="flex gap-2 mb-3">
            <button onClick={handleExportJSON}
              className="flex-1 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-all active:scale-95">
              📦 匯出備份 JSON
            </button>
            <button onClick={() => importRef.current?.click()}
              className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold transition-all active:scale-95">
              📥 還原備份
            </button>
            <input ref={importRef} type="file" accept=".json" hidden onChange={handleImportJSON}/>
          </div>

          {importMsg && (
            <p className={`text-xs text-center mb-3 font-semibold ${importMsg.startsWith('✓') ? 'text-green-500' : 'text-red-500'}`}>
              {importMsg}
            </p>
          )}

          {/* CSV export */}
          <button onClick={handleExportCSV}
            className="w-full py-3 rounded-2xl bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-500 text-white text-sm font-semibold transition-all active:scale-95">
            📊 匯出 CSV（Excel 分析用）
          </button>
        </section>

      </main>

      {tdeeSheet && (
        <TDEESuggestionSheet
          tdee={tdee}
          weight={latestWeight}
          onApply={(newGoals) => {
            setGoals(newGoals);
            setSaved(false);
            setTdeeSheet(false);
          }}
          onClose={() => setTdeeSheet(false)}
        />
      )}
    </div>
  );
}

/* ── TDEESuggestionSheet ── */
function TDEESuggestionSheet({ tdee, weight, onApply, onClose }) {
  const PLANS = [
    {
      key: 'lose',
      label: '減脂',
      emoji: '🔥',
      kcal: Math.max(1200, tdee - 500),
      desc: 'TDEE - 500 kcal',
      color: 'text-rose-500',
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      border: 'border-rose-200 dark:border-rose-700',
    },
    {
      key: 'maintain',
      label: '維持',
      emoji: '⚖️',
      kcal: tdee,
      desc: '等於 TDEE',
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-700',
    },
    {
      key: 'gain',
      label: '增肌',
      emoji: '💪',
      kcal: tdee + 300,
      desc: 'TDEE + 300 kcal',
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-700',
    },
  ];

  // Auto-calculate macros: protein = 2g/kg, fat = 25% kcal, carbs = rest
  function calcMacros(kcal, planKey) {
    const protein = Math.round(weight * (planKey === 'gain' ? 2.2 : planKey === 'lose' ? 2.0 : 1.8));
    const fat     = Math.round((kcal * 0.25) / 9);
    const carbs   = Math.round((kcal - protein * 4 - fat * 9) / 4);
    return { calories: kcal, protein, fat, carbs: Math.max(50, carbs) };
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">✨ 根據 TDEE 設定目標</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          你的 TDEE 為 <span className="font-semibold text-blue-500">{tdee} kcal</span>。選擇目標後會自動套用熱量與三大營養素。
        </p>

        <div className="flex flex-col gap-3">
          {PLANS.map(plan => {
            const macros = calcMacros(plan.kcal, plan.key);
            return (
              <button
                key={plan.key}
                onClick={() => onApply(macros)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 ${plan.bg} ${plan.border} text-left transition-all active:scale-98 hover:opacity-90`}
              >
                <span className="text-2xl">{plan.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-bold ${plan.color}`}>{plan.label}</span>
                    <span className="text-xs text-gray-400">{plan.desc}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    蛋白 {macros.protein}g · 碳水 {macros.carbs}g · 脂肪 {macros.fat}g
                  </div>
                </div>
                <span className={`text-base font-bold ${plan.color} shrink-0`}>{macros.calories} kcal</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-300 dark:text-gray-600 text-center mt-4">套用後請記得點「儲存目標設定」</p>
      </div>
    </div>
  );
}

function MacroRatioCard({ goals }) {
  const total      = goals.carbs * 4 + goals.protein * 4 + goals.fat * 9;
  const carbPct    = total > 0 ? Math.round((goals.carbs   * 4 / total) * 100) : 0;
  const proteinPct = total > 0 ? Math.round((goals.protein * 4 / total) * 100) : 0;
  const fatPct     = total > 0 ? 100 - carbPct - proteinPct : 0;
  return (
    <section className="bg-white rounded-3xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">熱量來源比例</h2>
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-4">
        <div className="bg-amber-400 transition-all duration-500" style={{ width: `${carbPct}%` }}/>
        <div className="bg-blue-500 transition-all duration-500"  style={{ width: `${proteinPct}%` }}/>
        <div className="bg-rose-400 transition-all duration-500"  style={{ width: `${fatPct}%` }}/>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: '碳水',   pct: carbPct,    kcal: goals.carbs   * 4, color: 'text-amber-500' },
          { label: '蛋白質', pct: proteinPct, kcal: goals.protein * 4, color: 'text-blue-500'  },
          { label: '脂肪',   pct: fatPct,     kcal: goals.fat     * 9, color: 'text-rose-400'  },
        ].map(({ label, pct, kcal, color }) => (
          <div key={label} className="bg-gray-50 rounded-2xl p-3">
            <p className={`text-lg font-bold ${color}`}>{pct}%</p>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="text-xs text-gray-400">{kcal} kcal</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── WaterGoalSection ── */
function WaterGoalSection() {
  const [goal,  setGoal]  = useState(() => loadWaterGoal());
  const [saved, setSaved] = useState(false);

  function handleSave(val) {
    setGoal(val);
    saveWaterGoal(val);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const OPTIONS = [6, 7, 8, 9, 10, 12];

  return (
    <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">每日飲水目標</h2>
        {saved && <span className="text-xs text-green-500 font-semibold">✓ 已儲存</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(n => (
          <button
            key={n}
            onClick={() => handleSave(n)}
            className={`py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 flex flex-col items-center gap-0.5 ${
              goal === n
                ? 'bg-cyan-500 text-white shadow-sm'
                : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20'
            }`}
          >
            <span>{n} 杯</span>
            <span className={`text-xs font-normal ${goal === n ? 'text-cyan-100' : 'text-gray-400'}`}>{n * 250} ml</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ── MacroTrendChart ── */
function MacroTrendChart() {
  const allDays = loadAllDays();
  const goals   = loadGoals();

  const today = new Date();
  const dayKeys = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (29 - i));
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  });

  const entries = dayKeys.map(key => {
    const day   = allDays[key];
    const foods = day ? Object.values(day.meals).flat() : [];
    if (foods.length === 0) return { key, carbs: null, protein: null, fat: null };
    return {
      key,
      carbs:   foods.reduce((s, f) => s + (f.carbs   || 0), 0),
      protein: foods.reduce((s, f) => s + (f.protein || 0), 0),
      fat:     foods.reduce((s, f) => s + (f.fat     || 0), 0),
    };
  });

  const hasAny = entries.some(e => e.carbs !== null);
  if (!hasAny) {
    return (
      <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">近 30 天三大營養素</h2>
        <p className="text-center text-gray-300 dark:text-gray-600 text-sm py-6">尚無飲食記錄</p>
      </section>
    );
  }

  // Normalize to % of goal so all 3 lines share the same scale
  const norm = (val, goal) => (val !== null && goal > 0 ? Math.round((val / goal) * 100) : null);
  const carbPcts    = entries.map(e => norm(e.carbs,   goals.carbs));
  const proteinPcts = entries.map(e => norm(e.protein, goals.protein));
  const fatPcts     = entries.map(e => norm(e.fat,     goals.fat));

  const W = 320, H = 100;
  const pL = 28, pR = 8, pT = 8, pB = 8;
  const iW = W - pL - pR;
  const iH = H - pT - pB;
  const yMax = 160;
  const toX  = i   => pL + (i / (dayKeys.length - 1)) * iW;
  const toY  = pct => pT + iH - Math.min(pct, yMax) / yMax * iH;

  function buildSegments(pcts) {
    const segments = [];
    let cur = [];
    pcts.forEach((p, i) => {
      if (p !== null) {
        cur.push(`${toX(i)},${toY(p)}`);
      } else {
        if (cur.length >= 2) segments.push(cur.join(' '));
        cur = [];
      }
    });
    if (cur.length >= 2) segments.push(cur.join(' '));
    return segments;
  }

  const MACROS = [
    { label: '碳水',   pcts: carbPcts,    stroke: '#f59e0b' },
    { label: '蛋白質', pcts: proteinPcts, stroke: '#3b82f6' },
    { label: '脂肪',   pcts: fatPcts,     stroke: '#fb7185' },
  ];

  const goalY = toY(100);

  return (
    <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">近 30 天三大營養素</h2>
      <p className="text-xs text-gray-400 mb-3">以各自目標量的 % 顯示，100% 虛線＝達標</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height: 100 }}>
        {/* 100% goal line */}
        <line x1={pL} y1={goalY} x2={W - pR} y2={goalY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
        <text x={pL - 2} y={goalY + 3} fontSize="7" fill="#9ca3af" textAnchor="end">100%</text>
        {/* 50% grid line */}
        <line x1={pL} y1={toY(50)} x2={W - pR} y2={toY(50)} stroke="#e5e7eb" strokeWidth="1" opacity="0.8" />
        <text x={pL - 2} y={toY(50) + 3} fontSize="7" fill="#d1d5db" textAnchor="end">50%</text>

        {MACROS.map(({ label, pcts, stroke }) =>
          buildSegments(pcts).map((pts, si) => (
            <polyline
              key={`${label}-${si}`}
              points={pts}
              fill="none"
              stroke={stroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
          ))
        )}
      </svg>

      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{dayKeys[0].slice(5).replace('-','/')}</span>
        <span>{dayKeys[29].slice(5).replace('-','/')}</span>
      </div>

      <div className="flex justify-center gap-5 mt-3">
        {[
          { label: '碳水',   color: 'bg-amber-400', goal: goals.carbs,   unit: 'g' },
          { label: '蛋白質', color: 'bg-blue-400',  goal: goals.protein, unit: 'g' },
          { label: '脂肪',   color: 'bg-rose-400',  goal: goals.fat,     unit: 'g' },
        ].map(({ label, color, goal, unit }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-2 rounded-sm ${color}`} />
            <span className="text-xs text-gray-500">{label}（目標 {goal}{unit}）</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── MealSplitSection ── */
const MEAL_SPLIT_META = {
  breakfast: { label: '早餐', emoji: '🌅', color: 'text-amber-500',  bar: 'bg-amber-400'  },
  lunch:     { label: '午餐', emoji: '☀️',  color: 'text-blue-500',   bar: 'bg-blue-400'   },
  dinner:    { label: '晚餐', emoji: '🌙', color: 'text-indigo-500', bar: 'bg-indigo-400' },
  snack:     { label: '點心', emoji: '🍎', color: 'text-rose-400',   bar: 'bg-rose-400'   },
};

function MealSplitSection({ totalCalories }) {
  const [split, setSplit] = useState(() => loadMealSplit());
  const [saved,  setSaved]  = useState(false);

  const total   = Object.values(split).reduce((a, b) => a + b, 0);
  const isValid = Math.round(total) === 100;

  function setOne(key, val) {
    setSplit(p => ({ ...p, [key]: Number(val) }));
    setSaved(false);
  }

  function reset() {
    setSplit({ breakfast: 25, lunch: 35, dinner: 30, snack: 10 });
    setSaved(false);
  }

  function handleSave() {
    if (!isValid) return;
    saveMealSplit(split);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">每餐熱量分配</h2>
        <button onClick={reset} className="text-xs text-blue-400 hover:text-blue-500">重設預設</button>
      </div>
      <p className="text-xs text-gray-400 mb-4">設定後首頁每餐標題會顯示「已吃 / 目標」kcal</p>

      <div className="flex flex-col gap-4">
        {Object.entries(MEAL_SPLIT_META).map(([key, meta]) => {
          const kcal = totalCalories > 0 ? Math.round(totalCalories * split[key] / 100) : null;
          return (
            <div key={key}>
              <div className="flex justify-between items-center mb-1.5">
                <span className={`text-sm font-semibold ${meta.color}`}>{meta.emoji} {meta.label}</span>
                <div className="flex items-center gap-2">
                  {kcal !== null && <span className="text-xs text-gray-400">{kcal} kcal</span>}
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200 w-9 text-right">{split[key]}%</span>
                </div>
              </div>
              <input
                type="range" min={0} max={70} step={5}
                value={split[key]}
                onChange={e => setOne(key, e.target.value)}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${
                    key === 'breakfast' ? '#fbbf24' : key === 'lunch' ? '#3b82f6' : key === 'dinner' ? '#818cf8' : '#fb7185'
                  } ${split[key] / 70 * 100}%, #e5e7eb ${split[key] / 70 * 100}%)`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Total indicator */}
      <div className={`mt-4 flex items-center justify-between text-sm font-semibold ${isValid ? 'text-green-500' : 'text-rose-500'}`}>
        <span>合計 {Math.round(total)}%</span>
        <span>{isValid ? '✓ 加總為 100%' : `需調整 ${(100 - total).toFixed(0)}%`}</span>
      </div>

      {/* Preview bar */}
      <div className="flex h-2 rounded-full overflow-hidden mt-2 gap-0.5">
        {Object.entries(MEAL_SPLIT_META).map(([key, meta]) => (
          <div key={key} className={`${meta.bar} transition-all duration-300`} style={{ width: `${split[key]}%` }} />
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={!isValid}
        className={`mt-4 w-full py-3 rounded-2xl font-semibold text-white text-sm transition-all active:scale-95 ${
          saved ? 'bg-green-500' : isValid ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {saved ? '✓ 已儲存' : '儲存餐次分配'}
      </button>
    </section>
  );
}

function WeightGoalSection({ currentWeight }) {
  const [goal, setGoal]   = useState(() => loadWeightGoal() || { target: '', by: '' });
  const [saved, setSaved] = useState(false);

  const targetNum = parseFloat(goal.target);
  const hasTarget = !isNaN(targetNum) && targetNum > 0;
  const diff      = hasTarget ? (currentWeight - targetNum).toFixed(1) : null;
  const losing    = hasTarget && targetNum < currentWeight;
  const gaining   = hasTarget && targetNum > currentWeight;

  // Estimate days to goal from 30-day weight log trend
  let estDays = null;
  if (hasTarget) {
    const wlog = loadWeightLog();
    const entries = Object.entries(wlog).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length >= 2) {
      const first = entries[Math.max(0, entries.length - 30)];
      const last  = entries[entries.length - 1];
      const days  = Math.max(1, (new Date(last[0]) - new Date(first[0])) / 86400000);
      const slope = (last[1] - first[1]) / days; // kg/day
      if (losing && slope < -0.001) estDays = Math.round((targetNum - currentWeight) / slope);
      if (gaining && slope > 0.001)  estDays = Math.round((targetNum - currentWeight) / slope);
    }
  }

  // Progress bar
  let pct = 0;
  if (hasTarget) {
    const wlog = loadWeightLog();
    const allW = Object.values(wlog);
    if (allW.length >= 1) {
      const startW = losing
        ? Math.max(...allW)
        : Math.min(...allW);
      const total = Math.abs(targetNum - startW);
      const done  = Math.abs(currentWeight - startW);
      pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    }
  }

  function handleSave() {
    if (!hasTarget) return;
    saveWeightGoal({ target: targetNum, by: goal.by || null });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">體重目標</h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">目標體重</label>
          <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden dark:bg-gray-700">
            <input
              type="number" min="20" max="300" step="0.1"
              value={goal.target}
              onChange={e => { setGoal(p => ({ ...p, target: e.target.value })); setSaved(false); }}
              placeholder="65"
              className="flex-1 px-3 py-2.5 text-sm text-center focus:outline-none w-0 dark:bg-gray-700 dark:text-gray-100"
            />
            <span className="px-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-600 h-full flex items-center border-l border-gray-200 dark:border-gray-600">kg</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">截止日期（選填）</label>
          <input
            type="date"
            value={goal.by || ''}
            onChange={e => { setGoal(p => ({ ...p, by: e.target.value })); setSaved(false); }}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
      </div>

      {hasTarget && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>現在 <span className="font-semibold text-gray-700 dark:text-gray-200">{currentWeight} kg</span></span>
            <span>目標 <span className={`font-semibold ${losing ? 'text-green-600' : 'text-blue-600'}`}>{targetNum} kg</span></span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${losing ? 'bg-green-400' : 'bg-blue-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-400">
              {pct}% 完成 · 還差 {Math.abs(Number(diff))} kg
            </span>
            {estDays !== null && estDays > 0 && (
              <span className="text-xs text-violet-500 font-semibold">
                預估 {estDays} 天後達標
              </span>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!hasTarget}
        className={`w-full py-3 rounded-2xl font-semibold text-white text-sm transition-all active:scale-95 ${
          saved ? 'bg-green-500' : hasTarget ? 'bg-violet-500 hover:bg-violet-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {saved ? '✓ 已儲存' : '儲存體重目標'}
      </button>
    </section>
  );
}

function WeightTrendChart({ profile }) {
  const weightLog  = loadWeightLog();
  const weightGoal = loadWeightGoal();

  const today = new Date();
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
    days.push(key);
  }

  const entries = days.map(key => ({ key, kg: weightLog[key] ?? null }));
  const weights = entries.map(e => e.kg).filter(Boolean);

  if (weights.length === 0) {
    return (
      <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">近 30 天體重趨勢</h2>
        <p className="text-center text-gray-300 dark:text-gray-600 text-sm py-6">尚無體重記錄，請在主頁記錄體重</p>
      </section>
    );
  }

  const hm     = profile.height / 100;
  const bmiMin = parseFloat((18.5 * hm * hm).toFixed(1));
  const bmiMax = parseFloat((24.9 * hm * hm).toFixed(1));

  const goalKg  = weightGoal?.target ?? null;
  const allVals = [...weights, bmiMin, bmiMax, ...(goalKg ? [goalKg] : [])];
  const yMin    = Math.floor(Math.min(...allVals)) - 1;
  const yMax    = Math.ceil(Math.max(...allVals))  + 1;
  const yRange  = yMax - yMin || 2;

  const W = 320, H = 100;
  const pL = 36, pR = 8, pT = 8, pB = 8;
  const iW = W - pL - pR;
  const iH = H - pT - pB;

  const toX = i  => pL + (i / (days.length - 1)) * iW;
  const toY = kg => pT + iH - ((kg - yMin) / yRange) * iH;

  const pts = entries
    .map((e, i) => e.kg != null ? { x: toX(i), y: toY(e.kg), key: e.key } : null)
    .filter(Boolean);
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');

  const latestW = weights[weights.length - 1];
  const diff    = weights.length >= 2 ? (latestW - weights[0]).toFixed(1) : null;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">近 30 天體重趨勢</h2>
        {diff !== null && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            Number(diff) < 0
              ? 'text-green-600 bg-green-50 dark:bg-green-900/30'
              : 'text-rose-500 bg-rose-50 dark:bg-rose-900/30'
          }`}>
            {Number(diff) > 0 ? '+' : ''}{diff} kg
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height: 100 }}>
        {/* Normal BMI zone shading */}
        <rect
          x={pL} y={toY(bmiMax)}
          width={iW} height={Math.max(0, toY(bmiMin) - toY(bmiMax))}
          fill="#bbf7d0" fillOpacity="0.4"
        />
        {/* BMI lower bound */}
        <line x1={pL} y1={toY(bmiMin)} x2={W - pR} y2={toY(bmiMin)} stroke="#22c55e" strokeWidth="1" strokeDasharray="4,3" opacity="0.8" />
        <text x={pL - 2} y={toY(bmiMin) + 3} fontSize="7" fill="#22c55e" textAnchor="end">{bmiMin}</text>
        {/* BMI upper bound */}
        <line x1={pL} y1={toY(bmiMax)} x2={W - pR} y2={toY(bmiMax)} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" opacity="0.8" />
        <text x={pL - 2} y={toY(bmiMax) + 3} fontSize="7" fill="#f59e0b" textAnchor="end">{bmiMax}</text>
        {/* Target weight line */}
        {goalKg && (
          <>
            <line x1={pL} y1={toY(goalKg)} x2={W - pR} y2={toY(goalKg)} stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.7" />
            <text x={pL - 2} y={toY(goalKg) + 3} fontSize="7" fill="#8b5cf6" textAnchor="end">{goalKg}</text>
          </>
        )}
        {/* Weight polyline */}
        {pts.length >= 2 && (
          <polyline points={polyline} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {/* Dots */}
        {pts.map(p => (
          <circle key={p.key} cx={p.x} cy={p.y} r="3" fill="white" stroke="#8b5cf6" strokeWidth="2" />
        ))}
      </svg>

      <div className="flex justify-between text-xs mt-1">
        <span className="text-gray-400">{days[0].slice(5).replace('-', '/')}</span>
        <span className="text-violet-600 font-semibold">{latestW} kg 今天</span>
      </div>

      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-px bg-green-400" />
          <span className="text-xs text-gray-400">BMI 正常下限 ({bmiMin} kg)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-px bg-amber-400" />
          <span className="text-xs text-gray-400">上限 ({bmiMax} kg)</span>
        </div>
        {goalKg && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-px border-t border-dashed border-violet-500" />
            <span className="text-xs text-violet-500">目標 ({goalKg} kg)</span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── ApiKeySection ── */
function ApiKeySection() {
  const [key,   setKey]   = useState(() => loadApiKey());
  const [show,  setShow]  = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    saveApiKey(key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClear() {
    saveApiKey('');
    setKey('');
  }

  const masked = key ? key.slice(0, 10) + '•'.repeat(20) : '';

  return (
    <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🔑</span>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Anthropic API Key</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">用於 AI 食物辨識、飲食分析等功能。Key 只存在你的裝置，不會上傳。</p>

      <div className="flex gap-2 mb-3">
        <input
          type={show ? 'text' : 'password'}
          value={key}
          onChange={e => { setKey(e.target.value); setSaved(false); }}
          placeholder="sk-ant-api03-..."
          className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 font-mono"
        />
        <button
          onClick={() => setShow(v => !v)}
          className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-xs text-gray-500 dark:text-gray-300 hover:bg-gray-200 transition-colors"
        >
          {show ? '隱藏' : '顯示'}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!key.trim()}
          className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 ${
            saved ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400'
          }`}
        >
          {saved ? '✓ 已儲存' : '儲存 Key'}
        </button>
        {key && (
          <button
            onClick={handleClear}
            className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            清除
          </button>
        )}
      </div>
    </section>
  );
}
