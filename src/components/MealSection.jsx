import { useState, useMemo } from 'react';
import { saveFavorite, removeFavorite, loadFavorites, loadGoals, loadMealSplit } from '../utils/storage';

const MEAL_META = {
  breakfast: { label: '早餐', emoji: '🌅', color: 'text-amber-500' },
  lunch:     { label: '午餐', emoji: '☀️',  color: 'text-blue-500'  },
  dinner:    { label: '晚餐', emoji: '🌙', color: 'text-indigo-500' },
  snack:     { label: '點心', emoji: '🍎', color: 'text-rose-400'   },
};

export default function MealSection({ meals, onRemove, onAddClick, yesterdayMeals = {}, onCopyMeal }) {
  const [favNames, setFavNames] = useState(() =>
    new Set(loadFavorites().map(f => f.name))
  );
  const goals    = useMemo(() => loadGoals(),     []);
  const mealSplit = useMemo(() => loadMealSplit(), []);

  function toggleFav(food) {
    if (favNames.has(food.name)) {
      removeFavorite(food.name);
      setFavNames(prev => { const s = new Set(prev); s.delete(food.name); return s; });
    } else {
      saveFavorite(food);
      setFavNames(prev => new Set([...prev, food.name]));
    }
  }
  return (
    <div className="flex flex-col gap-3">
      {Object.entries(MEAL_META).map(([type, meta]) => {
        const items  = meals[type] || [];
        const total  = items.reduce((s, f) => s + (f.calories || 0), 0);
        const target = Math.round(goals.calories * (mealSplit[type] ?? 25) / 100);
        const pct    = target > 0 ? total / target : 0;
        const calColor = total === 0
          ? 'text-gray-400 dark:text-gray-500'
          : pct > 1.15 ? 'text-rose-500'
          : pct >= 0.85 ? 'text-green-500'
          : 'text-gray-500 dark:text-gray-400';
        return (
          <div key={type} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-lg">{meta.emoji}</span>
                <span className={`font-semibold ${meta.color}`}>{meta.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${calColor}`}>
                  {total}
                  <span className="text-gray-300 dark:text-gray-600 font-normal text-xs"> / {target}</span>
                </span>
                <button
                  onClick={() => onAddClick(type)}
                  className="w-7 h-7 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 transition-colors text-lg leading-none"
                  aria-label={`新增${meta.label}`}
                >
                  +
                </button>
              </div>
            </div>
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <p className="text-gray-300 dark:text-gray-600 text-sm">尚未記錄</p>
                {yesterdayMeals[type]?.length > 0 && onCopyMeal && (
                  <button
                    onClick={() => onCopyMeal(type, yesterdayMeals[type])}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-500 transition-colors px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20"
                  >
                    📋 複製昨日{meta.label}（{yesterdayMeals[type].length} 項）
                  </button>
                )}
              </div>
            ) : (
              <ul>
                {items.map(food => (
                  <li
                    key={food.id}
                    className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50/60 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{food.name}</p>
                      <p className="text-xs text-gray-400">
                        碳 {food.carbs}g · 蛋 {food.protein}g · 脂 {food.fat}g
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-blue-500">{food.calories} kcal</span>
                      <button
                        onClick={() => toggleFav(food)}
                        className={`text-lg leading-none transition-colors ${
                          favNames.has(food.name) ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'
                        }`}
                        aria-label={favNames.has(food.name) ? '取消收藏' : '收藏'}
                      >
                        {favNames.has(food.name) ? '★' : '☆'}
                      </button>
                      <button
                        onClick={() => onRemove(type, food.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                        aria-label="刪除"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
