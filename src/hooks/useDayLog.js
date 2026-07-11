import { useState, useCallback, useEffect } from 'react';
import { getTodayKey, loadDayData, saveDayData, loadGoals } from '../utils/storage';

export default function useDayLog() {
  // Capture once per session: if the app stays open past midnight, saves must
  // keep going to the day this data was loaded from (App.jsx reloads the page
  // when the date flips). Recomputing per render would write yesterday's
  // meals into today's key.
  const [dateKey] = useState(() => getTodayKey());
  const [goals, setGoals]     = useState(() => loadGoals());
  const [dayData, setDayData] = useState(() => loadDayData(dateKey));

  // Reload goals if they change (e.g. settings page saves)
  useEffect(() => {
    const onStorage = () => setGoals(loadGoals());
    window.addEventListener('storage', onStorage);
    // also pick up same-tab saves via custom event
    window.addEventListener('wisefitness:goals-updated', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('wisefitness:goals-updated', onStorage);
    };
  }, []);

  useEffect(() => {
    saveDayData(dateKey, dayData);
  }, [dateKey, dayData]);

  const addFood = useCallback((mealType, food) => {
    setDayData(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [mealType]: [...prev.meals[mealType], { ...food, id: Date.now() }],
      },
    }));
  }, []);

  const copyMeals = useCallback((mealType, foods) => {
    const base = Date.now();
    setDayData(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [mealType]: [
          ...prev.meals[mealType],
          ...foods.map((f, i) => ({ ...f, id: base + i })),
        ],
      },
    }));
  }, []);

  const removeFood = useCallback((mealType, foodId) => {
    setDayData(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [mealType]: prev.meals[mealType].filter(f => f.id !== foodId),
      },
    }));
  }, []);

  const totals = Object.values(dayData.meals).flat().reduce(
    (acc, f) => ({
      calories: acc.calories + (f.calories || 0),
      carbs:    acc.carbs    + (f.carbs    || 0),
      protein:  acc.protein  + (f.protein  || 0),
      fat:      acc.fat      + (f.fat      || 0),
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 }
  );

  return { dayData, goals, totals, addFood, removeFood, copyMeals };
}
