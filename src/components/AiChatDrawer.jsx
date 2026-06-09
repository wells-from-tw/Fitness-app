import { useState, useRef, useEffect } from 'react';
import { chatTraining, chatNutrition } from '../utils/ai';

const STORAGE_KEYS = {
  training:  'wisefitness_chat_training',
  nutrition: 'wisefitness_chat_nutrition',
};
const MAX_MESSAGES = 20;

const MEAL_LABELS = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心' };

function loadHistory(mode) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[mode]);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveHistory(mode, msgs) {
  const trimmed = msgs.slice(-MAX_MESSAGES);
  localStorage.setItem(STORAGE_KEYS[mode], JSON.stringify(trimmed));
}

export default function AiChatDrawer({ mode, context, onConfirmExercises, onConfirmMeals, onClose }) {
  const [messages, setMessages] = useState(() => loadHistory(mode));
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      let reply;
      if (mode === 'training') {
        reply = await chatTraining(next, context);
        const assistantMsg = {
          role: 'assistant',
          content: reply.message,
          exercises: reply.exercises ?? undefined,
        };
        const updated = [...next, assistantMsg];
        setMessages(updated);
        saveHistory(mode, updated);
      } else {
        reply = await chatNutrition(next);
        const assistantMsg = {
          role: 'assistant',
          content: reply.message,
          meals:    reply.meals    ?? undefined,
          mealType: reply.mealType ?? undefined,
        };
        const updated = [...next, assistantMsg];
        setMessages(updated);
        saveHistory(mode, updated);
      }
    } catch (e) {
      const errMsg = {
        role: 'assistant',
        content: e.message === 'NO_KEY'
          ? '⚠️ 請先在「設定」頁面輸入 Claude API Key'
          : `⚠️ 發生錯誤：${e.message}`,
      };
      const updated = [...next, errMsg];
      setMessages(updated);
      saveHistory(mode, updated);
    }
    setLoading(false);
  }

  function handleConfirm(msg) {
    if (mode === 'training' && msg.exercises) {
      onConfirmExercises(msg.exercises);
      onClose();
    } else if (mode === 'nutrition' && msg.meals) {
      onConfirmMeals(msg.meals, msg.mealType);
      onClose();
    }
  }

  function handleClear() {
    setMessages([]);
    saveHistory(mode, []);
  }

  const title    = mode === 'training' ? '🏋️ 訓練助手' : '🥗 飲食助手';
  const placeholder = mode === 'training'
    ? '說說今天想練什麼…'
    : '說說今天吃了什麼…';

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" />

      {/* Drawer */}
      <div
        className="bg-white dark:bg-[#111] rounded-t-3xl border-t border-gray-100 dark:border-[#1e1e1e] flex flex-col"
        style={{ maxHeight: '82vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1e1e1e] shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1"
              >
                清除記錄
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#1e1e1e] text-gray-500 dark:text-gray-300 text-lg"
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
          {messages.length === 0 && (
            <div className="text-center text-sm text-gray-400 py-8">
              {mode === 'training'
                ? '👋 說說今天想練什麼，我幫你規劃！'
                : '👋 說說今天吃了什麼，我幫你記錄！'}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {/* Chat bubble */}
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-br-sm'
                  : 'bg-gray-100 dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-200 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>

              {/* Exercise preview card */}
              {msg.role === 'assistant' && msg.exercises && (
                <div className="w-full max-w-[90%] bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-2xl p-3 flex flex-col gap-2">
                  <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">訓練計劃</p>
                  <div className="flex flex-col gap-1">
                    {msg.exercises.map((ex, j) => (
                      <div key={j} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{ex.name}</span>
                        <span className="text-gray-400">
                          {ex.sets?.length > 0
                            ? `${ex.sets.length}組 × ${ex.sets[0].reps}下${ex.sets[0].weight > 0 ? ` @ ${ex.sets[0].weight}kg` : ''}`
                            : `${ex.duration} 分鐘`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleConfirm(msg)}
                    className="mt-1 w-full py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold active:scale-95 transition-all"
                  >
                    ✅ 確認加入今日訓練
                  </button>
                </div>
              )}

              {/* Meal preview card */}
              {msg.role === 'assistant' && msg.meals && (
                <div className="w-full max-w-[90%] bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-2xl p-3 flex flex-col gap-2">
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                    {msg.mealType ? MEAL_LABELS[msg.mealType] : '餐點'} 估算
                  </p>
                  <div className="flex flex-col gap-1">
                    {msg.meals.map((food, j) => (
                      <div key={j} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{food.name}</span>
                        <span className="text-gray-400">{food.calories} kcal</span>
                      </div>
                    ))}
                    <div className="border-t border-green-200 dark:border-green-800/40 pt-1 mt-1 flex justify-end">
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                        共 {msg.meals.reduce((s, f) => s + f.calories, 0)} kcal
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConfirm(msg)}
                    className="mt-1 w-full py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-semibold active:scale-95 transition-all"
                  >
                    ✅ 確認加入{msg.mealType ? MEAL_LABELS[msg.mealType] : '今日餐點'}
                  </button>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start">
              <div className="bg-gray-100 dark:bg-[#1e1e1e] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-6 pt-3 border-t border-gray-100 dark:border-[#1e1e1e] shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder={placeholder}
              rows={1}
              className="flex-1 resize-none bg-gray-100 dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800 placeholder-gray-400 max-h-32 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-40 active:scale-95 transition-all shrink-0"
            >
              {loading ? <span className="text-xs animate-spin">◌</span> : '↑'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
