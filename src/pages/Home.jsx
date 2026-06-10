import { useState, useRef } from 'react';
import useDayLog from '../hooks/useDayLog';
import CalorieRing from '../components/CalorieRing';
import MacroBar from '../components/MacroBar';
import MealSection from '../components/MealSection';
import AddFoodModal from '../components/AddFoodModal';
import WeightCard from '../components/WeightCard';
import WaterCard from '../components/WaterCard';
import ExerciseCard from '../components/ExerciseCard';
import { getTodayKey, loadWeightLog, loadWaterLog, loadExerciseLog, loadDayData, loadWaterGoal, loadAllDays, loadGoals } from '../utils/storage';
import { getDailySummary, getMealSuggestion, getAiConsultation } from '../utils/ai';
import { generateShareCard } from '../utils/shareCard';
import SharePreviewModal from '../components/SharePreviewModal';
import AiChatDrawer from '../components/AiChatDrawer';

function getWeekKey() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(d) {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日（週${days[d.getDay()]}）`;
}

export default function Home() {
  const { dayData, goals, totals, addFood, removeFood, copyMeals } = useDayLog();
  const [yesterdayMeals] = useState(() => loadDayData(getYesterdayKey()).meals);
  const [modal, setModal]     = useState(null);
  const dateKey               = getTodayKey();
  const weekKey               = getWeekKey();
  const [weight, setWeight]   = useState(() => loadWeightLog()[weekKey] ?? null);
  const initialCups           = loadWaterLog()[dateKey] ?? 0;
  const [burned, setBurned]   = useState(() =>
    loadExerciseLog(dateKey).reduce((s, e) => s + e.calories, 0)
  );
  const [waterGoal] = useState(() => loadWaterGoal());
  const [summaryModal,    setSummaryModal]    = useState(null);
  const [suggestionModal, setSuggestionModal] = useState(null);
  const [consultOpen,     setConsultOpen]     = useState(false);
  const [sharing,         setSharing]         = useState(false);
  const [previewUrl,      setPreviewUrl]      = useState(null);
  const [showChat,        setShowChat]        = useState(false);

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      const today = new Date();
      const days = ['日','一','二','三','四','五','六'];
      const dateStr = `${today.getMonth()+1}月${today.getDate()}日（週${days[today.getDay()]}）`;
      const waterCups = loadWaterLog()[dateKey] ?? 0;

      const dataUrl = await generateShareCard({
        date: dateStr,
        calories: totals.calories,
        goalCalories: goals.calories,
        burned,
        protein: totals.protein,   goalProtein: goals.protein,
        carbs:   totals.carbs,     goalCarbs:   goals.carbs,
        fat:     totals.fat,       goalFat:     goals.fat,
        waterCups, waterGoal,
        weight,
      });

      setPreviewUrl(dataUrl);
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
    setSharing(false);
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] dark:bg-[#0a0a0a]">
      {/* Top bar */}
      <header className="bg-[#f8f8f8]/90 dark:bg-[#0a0a0a]/95 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100 dark:border-[#1a1a1a]">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Fitness</h1>
            <p className="text-[11px] text-gray-400 mt-0.5 tracking-wide">{formatDate(new Date())}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-400 tracking-widest uppercase">目標</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              {goals.calories}<span className="text-xs font-normal text-gray-400 ml-1">kcal</span>
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-28 pt-6 flex flex-col gap-3">
        {/* Calorie Ring */}
        <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#1e1e1e] p-5 flex flex-col items-center">
          <CalorieRing consumed={totals.calories} burned={burned} goal={goals.calories} />
        </div>

        {/* Weight */}
        <WeightCard
          dateKey={weekKey}
          initialWeight={weight}
          weekly
          onSaved={kg => setWeight(kg)}
        />

        {/* Water */}
        <WaterCard dateKey={dateKey} initialCups={initialCups} goal={waterGoal} />

        {/* Exercise */}
        <ExerciseCard dateKey={dateKey} onBurnedChange={setBurned} />

        {/* Macros */}
        <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#1e1e1e] p-5">
          <h2 className="text-[11px] text-gray-400 mb-4 uppercase tracking-widest">營養素</h2>
          <MacroBar totals={totals} goals={goals} />
        </div>

        {/* Meals */}
        <div>
          <h2 className="text-[11px] text-gray-400 uppercase tracking-widest mb-3 px-1">今日餐點</h2>
          <MealSection
            meals={dayData.meals}
            onRemove={removeFood}
            onAddClick={type => setModal(type)}
            yesterdayMeals={yesterdayMeals}
            onCopyMeal={copyMeals}
          />
        </div>

        {totals.calories > 0 && (
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (summaryModal === 'loading') return;
                setSummaryModal('loading');
                try {
                  const text = await getDailySummary(dayData.meals, totals, goals);
                  setSummaryModal(text);
                } catch (err) {
                  setSummaryModal(
                    err.message === 'NO_KEY'      ? '請先在設定頁輸入 Anthropic API Key' :
                    err.message === 'INVALID_KEY' ? 'API Key 無效，請重新設定' :
                    `分析失敗：${err.message}`
                  );
                }
              }}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold shadow-md hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              {summaryModal === 'loading'
                ? <><span className="inline-block animate-spin text-base">◌</span>&nbsp;分析中…</>
                : <>✨ 今日小結</>}
            </button>
            {goals.calories - totals.calories > 100 && (
              <button
                onClick={async () => {
                  if (suggestionModal === 'loading') return;
                  setSuggestionModal('loading');
                  const remaining = goals.calories - totals.calories;
                  try {
                    const text = await getMealSuggestion(remaining, totals, goals);
                    setSuggestionModal(text);
                  } catch (err) {
                    setSuggestionModal(`建議失敗：${err.message}`);
                  }
                }}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-semibold shadow-md hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                {suggestionModal === 'loading'
                  ? <><span className="inline-block animate-spin text-base">◌</span>&nbsp;思考中…</>
                  : <>🍽️ 推薦下一餐</>}
              </button>
            )}
          </div>
        )}
        {/* AI 諮詢 */}
        <button
          onClick={() => setConsultOpen(true)}
          className="w-full py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          💬 AI 飲食諮詢
        </button>

        {/* Share card */}
        <button
          onClick={handleShare}
          disabled={sharing}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold shadow-md hover:opacity-90 disabled:opacity-60 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {sharing
            ? <><span className="inline-block animate-spin text-base">◌</span>&nbsp;生成中…</>
            : <>📤 分享今日進度</>}
        </button>
      </main>

      {/* FAB — add food */}
      <button
        onClick={() => setModal('breakfast')}
        className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center text-3xl leading-none"
        aria-label="新增食物"
      >
        +
      </button>

      {/* FAB — AI chat */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-36 right-5 z-40 w-12 h-12 rounded-full bg-violet-500 hover:bg-violet-600 text-white shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center text-xl"
        aria-label="AI 飲食助手"
      >
        🤖
      </button>

      {previewUrl && (
        <SharePreviewModal
          dataUrl={previewUrl}
          filename="wisefitness-today.png"
          title="Fitness 今日進度"
          onClose={() => setPreviewUrl(null)}
        />
      )}

      {modal && (
        <AddFoodModal
          mealType={modal}
          onAdd={addFood}
          onClose={() => setModal(null)}
        />
      )}

      {suggestionModal && suggestionModal !== 'loading' && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setSuggestionModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg p-6 pb-12"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🍽️</span>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">推薦下一餐</h3>
              <span className="ml-1 text-xs text-emerald-500 font-semibold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                剩餘 {goals.calories - totals.calories} kcal
              </span>
              <button
                onClick={() => setSuggestionModal(null)}
                className="ml-auto text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >×</button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{suggestionModal}</p>
          </div>
        </div>
      )}

      {consultOpen && (
        <ConsultModal goals={goals} onClose={() => setConsultOpen(false)} />
      )}

      {summaryModal && summaryModal !== 'loading' && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setSummaryModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg p-6 pb-12"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">✨</span>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">今日飲食小結</h3>
              <button
                onClick={() => setSummaryModal(null)}
                className="ml-auto text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >×</button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{summaryModal}</p>
          </div>
        </div>
      )}

      {showChat && (
        <AiChatDrawer
          mode="nutrition"
          context={{ goals, totals, meals: dayData.meals, burned }}
          onConfirmMeals={(meals, mealType) => {
            const type = mealType || 'snack';
            meals.forEach(food => addFood(type, food));
          }}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}

/* ── ConsultModal ── */
function buildWeekSummary() {
  const allDays = loadAllDays();
  const goals   = loadGoals();
  const lines   = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const day   = allDays[key];
    const foods = day ? Object.values(day.meals).flat() : [];
    if (foods.length === 0) continue;
    const cal  = foods.reduce((s, f) => s + (f.calories || 0), 0);
    const carb = foods.reduce((s, f) => s + (f.carbs    || 0), 0);
    const pro  = foods.reduce((s, f) => s + (f.protein  || 0), 0);
    const fat  = foods.reduce((s, f) => s + (f.fat      || 0), 0);
    lines.push(`${key.slice(5)}：${cal}kcal 碳${carb}g 蛋${pro}g 脂${fat}g`);
  }
  return { lines, goals };
}

const QUICK_QUESTIONS = [
  '我最近蛋白質攝取夠嗎？',
  '我這週熱量分布均衡嗎？',
  '我的飲食有什麼需要改善？',
  '今天還能吃什麼？',
];

function ConsultModal({ goals, onClose }) {
  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const inputRef = useRef(null);

  async function ask(q) {
    const question = (q ?? input).trim();
    if (!question || loading) return;
    setInput('');
    setLoading(true);
    const { lines } = buildWeekSummary();
    try {
      const answer = await getAiConsultation(question, lines, goals);
      setMessages(prev => [...prev, { q: question, a: answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { q: question, a: `錯誤：${e.message}` }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: '82vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <span className="text-xl">💬</span>
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">AI 飲食諮詢</h3>
          <p className="text-xs text-gray-400 ml-1">依據近 7 天數據回答</p>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {messages.length === 0 && !loading && (
            <div>
              <p className="text-xs text-gray-400 mb-3 text-center">快速提問：</p>
              <div className="flex flex-col gap-2">
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} onClick={() => ask(q)}
                    className="text-left text-sm text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-4 py-2.5 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="self-end bg-blue-500 text-white text-sm rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                {m.q}
              </div>
              <div className="self-start bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[90%] leading-relaxed whitespace-pre-wrap">
                {m.a}
              </div>
            </div>
          ))}
          {loading && (
            <div className="self-start bg-gray-100 dark:bg-gray-700 text-gray-400 text-sm rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-2">
              <span className="inline-block animate-spin">◌</span> 思考中…
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex gap-2 flex-shrink-0">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
            placeholder="輸入問題…"
            className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            onClick={() => ask()}
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-2xl transition-colors"
          >
            送出
          </button>
        </div>
      </div>
    </div>
  );
}
