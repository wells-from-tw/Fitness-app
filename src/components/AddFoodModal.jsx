import { useState, useEffect, useRef, useCallback } from 'react';
import { estimateNutrition, estimateNutritionFromImage, parseMultipleFoods, loadApiKey } from '../utils/ai';
import { getBarcodeEntry, saveBarcodeEntry } from '../utils/storage';
import { loadFavorites, saveFavorite, removeFavorite, loadAllDays } from '../utils/storage';

function getRecentFoods() {
  const all = loadAllDays();
  const keys = Object.keys(all).sort().reverse().slice(0, 14);
  const seen = new Set();
  const result = [];
  for (const key of keys) {
    const meals = all[key]?.meals || {};
    for (const foods of Object.values(meals)) {
      for (const food of [...foods].reverse()) {
        const baseName = food.name.replace(/（×[\d.]+）$/, '');
        if (!seen.has(baseName)) {
          seen.add(baseName);
          result.push({ ...food, name: baseName });
        }
      }
    }
  }
  return result.slice(0, 25);
}

const MEAL_LABELS = {
  breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心',
};

const QUICK_FOODS = [
  { name: '水煮蛋',         calories: 78,  carbs: 1,  protein: 6,  fat: 5  },
  { name: '白飯（1碗）',    calories: 240, carbs: 53, protein: 4,  fat: 0  },
  { name: '雞胸肉（100g）', calories: 165, carbs: 0,  protein: 31, fat: 4  },
  { name: '香蕉',           calories: 89,  carbs: 23, protein: 1,  fat: 0  },
  { name: '花椰菜（100g）', calories: 34,  carbs: 7,  protein: 3,  fat: 0  },
  { name: '牛奶（240ml）',  calories: 149, carbs: 12, protein: 8,  fat: 8  },
];

const EMPTY = { name: '', calories: '', carbs: '', protein: '', fat: '' };

export default function AddFoodModal({ mealType, onAdd, onClose }) {
  const hasKey = !!loadApiKey();
  const [tab, setTab]           = useState(hasKey ? 'ai' : 'manual');
  const [form, setForm]         = useState(EMPTY);
  const [aiInput, setAiInput]   = useState('');
  const [aiMode, setAiMode]     = useState('text'); // 'text' | 'photo'
  const [photo, setPhoto]       = useState(null);   // { preview, base64, mimeType }
  const [aiState, setAiState]   = useState('idle');
  const [aiError, setAiError]   = useState('');
  const [multiResults, setMultiResults] = useState([]); // parsed multi-food results
  const [favs, setFavs]         = useState(() => loadFavorites());
  const [recentFoods]           = useState(() => getRecentFoods());
  const [servings, setServings] = useState(1);
  const fileInputRef            = useRef(null);

  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleAiEstimate() {
    if (!aiInput.trim()) return;
    setAiState('loading');
    setAiError('');
    setMultiResults([]);
    try {
      const results = await parseMultipleFoods(aiInput.trim());
      if (results.length === 1) {
        // Single item → fill form as before
        const r = results[0];
        setForm({ name: r.name, calories: String(r.calories), carbs: String(r.carbs), protein: String(r.protein), fat: String(r.fat) });
        setMultiResults([]);
      } else {
        // Multiple items → show multi-preview
        setMultiResults(results);
        setForm(EMPTY);
      }
      setAiState('done');
    } catch (e) {
      setAiState('error');
      if (e.message === 'NO_KEY')           setAiError('尚未設定 API Key，請至「設定」頁面輸入。');
      else if (e.message === 'INVALID_KEY') setAiError('API Key 無效，請至設定頁確認。');
      else setAiError(`估算失敗：${e.message}`);
    }
  }

  function handleAddAll() {
    multiResults.forEach(item => {
      onAdd({ ...item, id: Date.now() + Math.random() });
    });
    onClose();
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUrl = ev.target.result;
      const base64  = dataUrl.split(',')[1];
      const mimeType = file.type || 'image/jpeg';
      setPhoto({ preview: dataUrl, base64, mimeType });
      setAiState('loading');
      setAiError('');
      try {
        const result = await estimateNutritionFromImage(base64, mimeType);
        setForm({
          name:     result.name,
          calories: String(result.calories),
          carbs:    String(result.carbs),
          protein:  String(result.protein),
          fat:      String(result.fat),
        });
        setAiState('done');
      } catch (err) {
        setAiState('error');
        if (err.message === 'NO_KEY')           setAiError('尚未設定 API Key，請至「設定」頁面輸入。');
        else if (err.message === 'INVALID_KEY') setAiError('API Key 無效，請至設定頁確認。');
        else setAiError(`辨識失敗：${err.message}`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function clearPhoto() {
    setPhoto(null);
    setAiState('idle');
    setAiError('');
    setForm(EMPTY);
  }

  function fill(food) {
    setForm({
      name:     food.name,
      calories: String(food.calories),
      carbs:    String(food.carbs),
      protein:  String(food.protein),
      fat:      String(food.fat),
    });
  }

  function handleSubmit(e) {
    e?.preventDefault();
    if (!form.name || !form.calories) return;
    const food = {
      name:     servings === 1 ? form.name : `${form.name}（×${servings}）`,
      calories: Math.round((Number(form.calories) || 0) * servings),
      carbs:    Math.round((Number(form.carbs)    || 0) * servings),
      protein:  Math.round((Number(form.protein)  || 0) * servings),
      fat:      Math.round((Number(form.fat)      || 0) * servings),
    };
    onAdd(mealType, food);
    onClose();
  }

  function handleSaveFav() {
    if (!form.name || !form.calories) return;
    saveFavorite({
      name:     form.name,
      calories: Number(form.calories) || 0,
      carbs:    Number(form.carbs)    || 0,
      protein:  Number(form.protein)  || 0,
      fat:      Number(form.fat)      || 0,
    });
    setFavs(loadFavorites());
  }

  function handleRemoveFav(name) {
    removeFavorite(name);
    setFavs(loadFavorites());
  }

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  const tabs = [
    ...(hasKey ? [{ id: 'ai',      label: '✨ AI 辨識' }] : []),
    { id: 'barcode', label: '📷 條碼' },
    { id: 'manual',  label: '手動輸入' },
    { id: 'recent',  label: `🕐 最近${recentFoods.length > 0 ? ` (${recentFoods.length})` : ''}` },
    { id: 'favs',    label: `⭐ 收藏${favs.length > 0 ? ` (${favs.length})` : ''}` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            新增食物 · {MEAL_LABELS[mealType]}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-5 pt-3 gap-4 overflow-x-auto">
          {tabs.map(({ id, label }) => (
            <TabBtn key={id} active={tab === id} onClick={() => setTab(id)}>{label}</TabBtn>
          ))}
        </div>

        <div className="p-5 overflow-y-auto max-h-[70vh]">

          {/* ── AI TAB ── */}
          {tab === 'ai' && (
            <div className="flex flex-col gap-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                {[{ id: 'text', label: '✏️ 文字描述' }, { id: 'photo', label: '📷 食物照片' }].map(m => (
                  <button key={m.id} type="button"
                    onClick={() => { setAiMode(m.id); setAiState('idle'); setAiError(''); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      aiMode === m.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Text input */}
              {aiMode === 'text' && (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={aiInput}
                    onChange={e => { setAiInput(e.target.value); setAiState('idle'); setMultiResults([]); }}
                    rows={3}
                    placeholder={'直接描述你吃了什麼，支援多品項\n例：八方雲集12個招牌鍋貼\nSukiya超大碗牛丼＋單點一盤牛丼'}
                    className="w-full border border-gray-200 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  />
                  <button type="button" onClick={handleAiEstimate}
                    disabled={!aiInput.trim() || aiState === 'loading'}
                    className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors">
                    {aiState === 'loading' ? <span className="flex items-center justify-center gap-1.5"><SpinIcon/>AI 計算中…</span> : '✨ AI 自動換算營養素'}
                  </button>
                  <p className="text-xs text-gray-400">可一次輸入整頓飯，AI 自動拆分品項</p>
                </div>
              )}

              {/* Photo input */}
              {aiMode === 'photo' && (
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handlePhotoChange}/>
                  {!photo ? (
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-blue-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-50 transition-colors text-blue-400">
                      <span className="text-3xl">📷</span>
                      <span className="text-sm font-medium">點此拍照或選擇圖片</span>
                    </button>
                  ) : (
                    <div className="relative">
                      <img src={photo.preview} alt="food"
                        className="w-full h-40 object-cover rounded-2xl"/>
                      <button type="button" onClick={clearPhoto}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full text-sm leading-none flex items-center justify-center">
                        ×
                      </button>
                      {aiState === 'loading' && (
                        <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center gap-2 text-blue-500 text-sm font-semibold">
                          <SpinIcon/>辨識中…
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1.5">Claude AI 將自動辨識照片中的食物，結果僅供參考</p>
                </div>
              )}

              {aiState === 'error' && (
                <div className="bg-red-50 text-red-500 text-sm rounded-xl px-4 py-3">{aiError}</div>
              )}

              {/* Multi-item result */}
              {aiState === 'done' && multiResults.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span>✨</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">AI 解析結果（{multiResults.length} 項）</span>
                  </div>
                  {multiResults.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-[#1a1a1a] rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          碳 {item.carbs}g · 蛋 {item.protein}g · 脂 {item.fat}g
                        </p>
                      </div>
                      <span className="text-sm font-bold text-blue-500 shrink-0">{item.calories} kcal</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm px-1 pt-1">
                    <span className="text-gray-400">合計</span>
                    <span className="font-bold text-blue-600">
                      {multiResults.reduce((s, i) => s + i.calories, 0)} kcal
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAll}
                    className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-2xl text-sm transition-all active:scale-95"
                  >
                    全部加入{MEAL_LABELS[mealType]}
                  </button>
                </div>
              )}

              {/* Single-item result */}
              {aiState === 'done' && multiResults.length === 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span>✨</span>
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">AI 估算結果</span>
                    <button
                      type="button"
                      onClick={handleSaveFav}
                      className="ml-auto text-xs text-amber-500 hover:text-amber-600 font-semibold"
                    >
                      ⭐ 收藏
                    </button>
                  </div>
                  <p className="text-base font-bold text-gray-800 dark:text-gray-100 mb-2">{form.name}</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: '卡路里', value: form.calories, unit: 'kcal', color: 'text-blue-600'  },
                      { label: '碳水',   value: form.carbs,    unit: 'g',    color: 'text-amber-600' },
                      { label: '蛋白質', value: form.protein,  unit: 'g',    color: 'text-blue-600'  },
                      { label: '脂肪',   value: form.fat,      unit: 'g',    color: 'text-rose-500'  },
                    ].map(({ label, value, unit, color }) => (
                      <div key={label} className="bg-white dark:bg-[#1a1a1a] rounded-xl p-2">
                        <p className={`text-base font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-gray-400">{unit}</p>
                        <p className="text-xs text-gray-500">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiState === 'done' && multiResults.length === 0 && <FormFields form={form} set={set} />}
              {aiState === 'done' && multiResults.length === 0 && <ServingsRow servings={servings} setServings={setServings} />}

              {multiResults.length === 0 && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!form.name || !form.calories}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-2xl py-3 transition-colors"
                >
                  新增至{MEAL_LABELS[mealType]}
                </button>
              )}
            </div>
          )}

          {/* ── BARCODE TAB ── */}
          {tab === 'barcode' && (
            <BarcodeTab
              hasKey={hasKey}
              onFound={food => {
                fill(food);
                setServings(1);
                setAiState('done');
                setTab(hasKey ? 'ai' : 'manual');
              }}
            />
          )}

          {/* ── MANUAL TAB ── */}
          {tab === 'manual' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">常用食物</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_FOODS.map(f => (
                    <button key={f.name} type="button" onClick={() => fill(f)}
                      className="text-sm px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              <FormFields form={form} set={set} showName />
              {form.name && form.calories && <ServingsRow servings={servings} setServings={setServings} />}

              <div className="flex gap-2">
                <button type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-2xl py-3 transition-colors">
                  新增
                </button>
                {form.name && form.calories && (
                  <button type="button" onClick={handleSaveFav}
                    className="px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-500 rounded-2xl transition-colors text-lg">
                    ⭐
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ── RECENT TAB ── */}
          {tab === 'recent' && (
            <div className="flex flex-col gap-3">
              {recentFoods.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-4xl mb-3">🕐</p>
                  <p className="text-gray-400 text-sm">尚無記錄</p>
                  <p className="text-gray-300 text-xs mt-1">記錄食物後會自動出現在這裡</p>
                </div>
              ) : (
                recentFoods.map(food => (
                  <div key={food.name}
                    className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{food.name}</p>
                      <p className="text-xs text-gray-400">
                        {food.calories} kcal · 碳 {food.carbs}g · 蛋 {food.protein}g · 脂 {food.fat}g
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { onAdd(mealType, food); onClose(); }}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-xl transition-colors"
                    >
                      新增
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── FAVS TAB ── */}
          {tab === 'favs' && (
            <div className="flex flex-col gap-3">
              {favs.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-4xl mb-3">⭐</p>
                  <p className="text-gray-400 text-sm">尚無收藏</p>
                  <p className="text-gray-300 text-xs mt-1">在 AI 辨識或手動輸入後按 ⭐ 加入收藏</p>
                </div>
              ) : (
                favs.map(food => (
                  <div key={food.name}
                    className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-3">
                    <button
                      type="button"
                      onClick={() => { fill(food); setTab(hasKey ? 'ai' : 'manual'); }}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{food.name}</p>
                      <p className="text-xs text-gray-400">
                        {food.calories} kcal · 碳 {food.carbs}g · 蛋 {food.protein}g · 脂 {food.fat}g
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => { onAdd(mealType, food); onClose(); }}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-xl transition-colors"
                    >
                      新增
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFav(food.name)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function TabBtn({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
        active ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-600'
      }`}>
      {children}
    </button>
  );
}

function FormFields({ form, set, showName = false }) {
  return (
    <div className="flex flex-col gap-3">
      {showName && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">食物名稱 *</label>
          <input required value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="例：雞胸肉"
            className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
        </div>
      )}
      {!showName && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">食物名稱</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <NumField label="卡路里 (kcal) *" value={form.calories} onChange={v => set('calories', v)}/>
        <NumField label="碳水化合物 (g)"   value={form.carbs}    onChange={v => set('carbs',    v)}/>
        <NumField label="蛋白質 (g)"        value={form.protein}  onChange={v => set('protein',  v)}/>
        <NumField label="脂肪 (g)"          value={form.fat}      onChange={v => set('fat',      v)}/>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <input type="number" min="0" step="1" value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
    </div>
  );
}

function ServingsRow({ servings, setServings }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 font-medium flex-shrink-0">份數</span>
      <div className="flex gap-1.5 flex-1">
        {[0.5, 1, 1.5, 2, 3].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setServings(n)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              servings === n
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            ×{n}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Open Food Facts lookup ── */
// Returns { found, hasNutrition, name, calories, carbs, protein, fat }
// Throws only on network error
async function lookupBarcode(barcode) {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,product_name_zh,product_name_en,serving_size,nutriments`,
    { headers: { 'User-Agent': 'WiseFitness/1.0' } }
  );
  if (!res.ok) throw new Error('網路錯誤，請稍後再試');
  const data = await res.json();

  if (data.status !== 1) {
    return { found: false, hasNutrition: false, name: '', calories: 0, carbs: 0, protein: 0, fat: 0 };
  }

  const p = data.product;
  const n = p.nutriments || {};
  const rawName = p.product_name_zh || p.product_name_en || p.product_name || '';

  // Prefer per-serving values; fall back to per-100g
  const hasSrv = n['energy-kcal_serving'] != null;
  const kcal   = Math.round(hasSrv ? n['energy-kcal_serving']         : (n['energy-kcal_100g']      ?? 0));
  const carbs  = Math.round(hasSrv ? (n['carbohydrates_serving'] ?? 0) : (n['carbohydrates_100g']    ?? 0));
  const pro    = Math.round(hasSrv ? (n['proteins_serving']      ?? 0) : (n['proteins_100g']         ?? 0));
  const fat    = Math.round(hasSrv ? (n['fat_serving']           ?? 0) : (n['fat_100g']              ?? 0));
  const suffix = (kcal > 0 && !hasSrv) ? '（每 100g）' : '';
  const hasNutrition = kcal > 0;

  return {
    found: true,
    hasNutrition,
    name:     rawName + suffix || '未知商品',
    calories: kcal, carbs, protein: pro, fat,
  };
}

/* ── BarcodeTab ── */
function BarcodeTab({ onFound, hasKey }) {
  const videoRef    = useRef(null);
  const readerRef   = useRef(null);
  const [phase, setPhase]           = useState('init');   // init|scanning|lookup|cached|ai-fallback|error
  const [barcode, setBarcode]       = useState('');
  const [errMsg,  setErrMsg]        = useState('');
  const [cachedFood, setCachedFood] = useState(null);     // hit from local cache
  const [fallbackName, setFallbackName] = useState('');
  const [aiEstState, setAiEstState] = useState('idle');
  const [aiEstError, setAiEstError] = useState('');

  const stop = useCallback(() => {
    try { readerRef.current?.reset(); } catch (_) {}
    readerRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } = await import('@zxing/browser');
        if (cancelled) return;

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints);
        readerRef.current = reader;

        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width:  { ideal: 1280 },
            height: { ideal: 720 },
          }
        };

        await reader.decodeFromConstraints(
          constraints,
          videoRef.current,
          async (result, err) => {
            if (cancelled || !result) return;
            cancelled = true;
            const code = result.getText();
            setBarcode(code);
            stop();

            // 1️⃣ Check local cache first
            const cached = getBarcodeEntry(code);
            if (cached) {
              setCachedFood(cached);
              setPhase('cached');
              return;
            }

            // 2️⃣ Query Open Food Facts
            setPhase('lookup');
            try {
              const info = await lookupBarcode(code);
              if (info.found && info.hasNutrition) {
                // ✅ Full data → save to cache and done
                const food = { name: info.name, calories: info.calories, carbs: info.carbs, protein: info.protein, fat: info.fat };
                saveBarcodeEntry(code, food);
                onFound(food);
              } else {
                // ⚠️ Not found or no nutrition → AI fallback
                setFallbackName(info.name || '');
                setPhase('ai-fallback');
              }
            } catch (e) {
              setErrMsg(e.message);
              setPhase('error');
            }
          }
        );
        if (!cancelled) setPhase('scanning');
      } catch (e) {
        setErrMsg('無法開啟相機，請確認已授權相機權限');
        setPhase('error');
      }
    }

    start();
    return () => { cancelled = true; stop(); };
  }, [onFound, stop]);

  async function handleAiFallback() {
    if (!fallbackName.trim()) return;
    setAiEstState('loading');
    setAiEstError('');
    try {
      const result = await estimateNutrition(fallbackName.trim());
      saveBarcodeEntry(barcode, result); // 存入快取，下次直接用
      onFound(result);
    } catch (e) {
      setAiEstState('error');
      if (e.message === 'NO_KEY')           setAiEstError('尚未設定 API Key，請至設定頁面輸入。');
      else if (e.message === 'INVALID_KEY') setAiEstError('API Key 無效，請至設定頁確認。');
      else setAiEstError(`AI 估算失敗：${e.message}`);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Video viewport — hide when in fallback/error */}
      {(phase === 'init' || phase === 'scanning' || phase === 'lookup') && (
        <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />

          {phase === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-blue-400 rounded-xl w-52 h-32 relative">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400 animate-bounce" style={{ animationDuration: '1.5s' }} />
              </div>
            </div>
          )}
          {phase === 'init' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">
              <SpinIcon /> <span className="ml-2">啟動相機…</span>
            </div>
          )}
          {phase === 'lookup' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-2">
              <SpinIcon />
              <span className="text-sm">查詢資料庫… {barcode}</span>
            </div>
          )}
        </div>
      )}

      {phase === 'scanning' && (
        <p className="text-xs text-gray-400 text-center">將條碼對準框框內，自動偵測</p>
      )}

      {/* ── Cached hit UI ── */}
      {phase === 'cached' && cachedFood && (
        <div className="w-full flex flex-col gap-3">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl px-4 py-3 flex items-start gap-2">
            <span className="text-lg">⚡</span>
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">從你的私人資料庫找到了！</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">條碼：{barcode}</p>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-4 py-3">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">{cachedFood.name}</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: '卡路里', value: cachedFood.calories, unit: 'kcal', color: 'text-blue-600' },
                { label: '碳水',   value: cachedFood.carbs,    unit: 'g',    color: 'text-amber-600' },
                { label: '蛋白質', value: cachedFood.protein,  unit: 'g',    color: 'text-blue-600' },
                { label: '脂肪',   value: cachedFood.fat,      unit: 'g',    color: 'text-rose-500' },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="bg-white dark:bg-[#111] rounded-xl p-2">
                  <p className={`text-base font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400">{unit}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onFound(cachedFood)}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-2xl text-sm transition-all active:scale-95"
          >
            加入餐點
          </button>
        </div>
      )}

      {/* ── AI Fallback UI ── */}
      {phase === 'ai-fallback' && (
        <div className="w-full flex flex-col gap-3">
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl px-4 py-3 flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                {fallbackName ? '找到商品名稱，但缺少營養資料' : '資料庫查無此商品'}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                條碼：{barcode}
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              商品名稱（可修改後讓 AI 估算）
            </label>
            <input
              value={fallbackName}
              onChange={e => { setFallbackName(e.target.value); setAiEstState('idle'); setAiEstError(''); }}
              placeholder="例：統一麥香紅茶 500ml"
              className="w-full border border-gray-200 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {hasKey ? (
            <button
              type="button"
              onClick={handleAiFallback}
              disabled={!fallbackName.trim() || aiEstState === 'loading'}
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {aiEstState === 'loading'
                ? <span className="flex items-center justify-center gap-1.5"><SpinIcon/>AI 估算中…</span>
                : '✨ AI 自動估算營養素'}
            </button>
          ) : (
            <p className="text-xs text-gray-400 text-center">請先在設定頁設定 API Key 以使用 AI 估算</p>
          )}

          {aiEstState === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-500 text-sm rounded-xl px-4 py-3">
              {aiEstError}
            </div>
          )}
        </div>
      )}

      {phase === 'error' && (
        <div className="w-full bg-rose-50 dark:bg-rose-900/30 rounded-2xl p-4 text-center">
          <p className="text-rose-500 text-sm font-semibold mb-1">⚠️ {errMsg}</p>
          <p className="text-xs text-gray-400">請改用 AI 辨識或手動輸入</p>
        </div>
      )}
    </div>
  );
}

function SpinIcon() {
  return (
    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}
