import { useState } from 'react';
import { saveProfile, saveGoals } from '../utils/storage';
import { calcBMR, calcTDEE, ACTIVITY_LEVELS } from '../utils/tdee';

const DEFAULT_PROFILE = { gender: 'male', age: 25, height: 170, weight: 65, activity: 1.55 };

export default function OnboardingModal({ onDone }) {
  const [step,    setStep]    = useState(1);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [goalKey, setGoalKey] = useState('maintain'); // 'lose' | 'maintain' | 'gain'

  function setP(key, val) { setProfile(p => ({ ...p, [key]: val })); }

  // Live TDEE from current profile inputs
  const bmr  = calcBMR(profile.gender, profile.weight, profile.height, profile.age);
  const tdee = calcTDEE(bmr, profile.activity);

  const GOAL_OPTIONS = [
    {
      key: 'lose', label: '減重', emoji: '📉',
      desc: '每天減少 500 大卡', color: 'border-rose-300 bg-rose-50 dark:bg-rose-900/20',
      active: 'border-rose-500 bg-rose-100 dark:bg-rose-900/40',
      calories: Math.max(1200, tdee - 500),
      carbs: Math.round(Math.max(1200, tdee - 500) * 0.40 / 4),
      protein: Math.round(Math.max(1200, tdee - 500) * 0.35 / 4),
      fat: Math.round(Math.max(1200, tdee - 500) * 0.25 / 9),
    },
    {
      key: 'maintain', label: '維持體重', emoji: '⚖️',
      desc: '均衡攝取', color: 'border-blue-300 bg-blue-50 dark:bg-blue-900/20',
      active: 'border-blue-500 bg-blue-100 dark:bg-blue-900/40',
      calories: tdee,
      carbs: Math.round(tdee * 0.50 / 4),
      protein: Math.round(tdee * 0.25 / 4),
      fat: Math.round(tdee * 0.25 / 9),
    },
    {
      key: 'gain', label: '增肌', emoji: '💪',
      desc: '每天增加 300 大卡', color: 'border-green-300 bg-green-50 dark:bg-green-900/20',
      active: 'border-green-500 bg-green-100 dark:bg-green-900/40',
      calories: tdee + 300,
      carbs: Math.round((tdee + 300) * 0.45 / 4),
      protein: Math.round((tdee + 300) * 0.30 / 4),
      fat: Math.round((tdee + 300) * 0.25 / 9),
    },
  ];

  const chosen = GOAL_OPTIONS.find(g => g.key === goalKey) ?? GOAL_OPTIONS[1];

  function handleFinish() {
    saveProfile(profile);
    saveGoals({
      calories: chosen.calories,
      carbs:    chosen.carbs,
      protein:  chosen.protein,
      fat:      chosen.fat,
    });
    localStorage.setItem('wisefitness_onboarded', '1');
    window.dispatchEvent(new Event('wisefitness:goals-updated'));
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-blue-50 to-slate-50 dark:from-gray-900 dark:to-gray-950 flex flex-col overflow-y-auto">
      <div className="max-w-lg mx-auto w-full px-5 pt-10 pb-12 flex flex-col flex-1">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map(n => (
            <div key={n} className={`h-1.5 rounded-full transition-all duration-300 ${
              n === step ? 'w-8 bg-blue-500' : n < step ? 'w-3 bg-blue-300' : 'w-3 bg-gray-200 dark:bg-gray-700'
            }`} />
          ))}
        </div>

        {/* ── Step 1: Profile ── */}
        {step === 1 && (
          <div className="flex flex-col gap-6 flex-1">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">歡迎使用 Fitness 👋</h1>
              <p className="text-gray-400 text-sm mt-1">先填入基本資料，幫你計算每日所需熱量</p>
            </div>

            {/* Gender */}
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2 block">性別</label>
              <div className="flex gap-3">
                {[{ v: 'male', label: '男 ♂' }, { v: 'female', label: '女 ♀' }].map(({ v, label }) => (
                  <button key={v} onClick={() => setP('gender', v)}
                    className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${
                      profile.gender === v
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Age / Height / Weight */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'age',    label: '年齡', unit: '歲', min: 10, max: 99,  step: 1   },
                { key: 'height', label: '身高', unit: 'cm', min: 100,max: 250, step: 1   },
                { key: 'weight', label: '體重', unit: 'kg', min: 20, max: 300, step: 0.5 },
              ].map(({ key, label, unit, min, max, step }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl overflow-hidden flex items-center">
                    <input
                      type="number" min={min} max={max} step={step}
                      value={profile[key]}
                      onChange={e => setP(key, Number(e.target.value))}
                      className="flex-1 px-2 py-3 text-sm text-center focus:outline-none w-0 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <span className="px-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-700 h-full flex items-center border-l border-gray-100 dark:border-gray-600">{unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Activity */}
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2 block">活動量</label>
              <div className="flex flex-col gap-2">
                {ACTIVITY_LEVELS.map(({ value, label, desc }) => (
                  <button key={value} onClick={() => setP('activity', value)}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition-all ${
                      profile.activity === value
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-400 text-blue-700 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-800 border-2 border-transparent text-gray-600 dark:text-gray-300'
                    }`}>
                    <span className="font-semibold">{label}</span>
                    <span className="text-xs opacity-60">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-4">
              <button onClick={() => setStep(2)}
                className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base shadow-md transition-all active:scale-95">
                下一步 →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Goal ── */}
        {step === 2 && (
          <div className="flex flex-col gap-6 flex-1">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">你的目標是？</h1>
              <p className="text-gray-400 text-sm mt-1">
                依據你的資料，TDEE 約 <span className="text-blue-500 font-bold">{tdee} kcal</span> / 天
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {GOAL_OPTIONS.map(opt => (
                <button key={opt.key} onClick={() => setGoalKey(opt.key)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${
                    goalKey === opt.key ? opt.active : opt.color
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="font-bold text-gray-800 dark:text-gray-100">{opt.label}</span>
                    <span className="text-xs text-gray-400 ml-auto">{opt.desc}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { l: '熱量', v: opt.calories, u: 'kcal' },
                      { l: '碳水', v: opt.carbs,    u: 'g'    },
                      { l: '蛋白', v: opt.protein,  u: 'g'    },
                      { l: '脂肪', v: opt.fat,      u: 'g'    },
                    ].map(({ l, v, u }) => (
                      <div key={l} className="bg-white/70 dark:bg-gray-800/70 rounded-xl py-1.5">
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{v}</p>
                        <p className="text-xs text-gray-400">{u}</p>
                        <p className="text-xs text-gray-500">{l}</p>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-auto pt-4">
              <button onClick={() => setStep(1)}
                className="flex-none px-5 py-4 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold transition-all active:scale-95">
                ← 返回
              </button>
              <button onClick={() => setStep(3)}
                className="flex-1 py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base shadow-md transition-all active:scale-95">
                下一步 →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-6 flex-1">
            <div className="text-center mt-4">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">設定完成！</h1>
              <p className="text-gray-400 text-sm mt-1">你的每日目標已建立</p>
            </div>

            <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: '每日熱量', value: chosen.calories, unit: 'kcal', color: 'text-blue-500',  bg: 'bg-blue-50 dark:bg-blue-900/20'   },
                  { label: '碳水',     value: chosen.carbs,    unit: 'g',    color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                  { label: '蛋白質',   value: chosen.protein,  unit: 'g',    color: 'text-blue-500',  bg: 'bg-blue-50 dark:bg-blue-900/20'   },
                  { label: '脂肪',     value: chosen.fat,      unit: 'g',    color: 'text-rose-400',  bg: 'bg-rose-50 dark:bg-rose-900/20'   },
                ].map(({ label, value, unit, color, bg }) => (
                  <div key={label} className={`${bg} rounded-2xl p-3 text-center`}>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{unit} {label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              <p>💡 之後可以到「設定」頁調整目標、記錄體重，或在首頁用 AI 辨識食物。</p>
            </div>

            <div className="flex gap-3 w-full mt-auto pt-2">
              <button onClick={() => setStep(2)}
                className="flex-none px-5 py-4 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold transition-all active:scale-95">
                ← 返回
              </button>
              <button onClick={handleFinish}
                className="flex-1 py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base shadow-md transition-all active:scale-95">
                開始使用 Fitness！
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
