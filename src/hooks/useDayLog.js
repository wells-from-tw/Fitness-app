import { useState, useCallback, useEffect } from 'react';
import { getTodayKey, loadDayData, saveDayData, loadGoals } from '../utils/storage';

export default function useDayLog(dateKey = getTodayKey()) {
  const [goals, setGoals] = useState(() => loadGoals());
  // Keep the loaded key together with its data so saves always target the
  // day the data was actually loaded from — never a stale/new key (e.g.
  // navigating between days, or the date flipping past midnight).
  const [day, setDay] = useState(() => ({ key: dateKey, data: loadDayData(dateKey) }));

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

  // Reload data when navigating to another day
  useEffect(() => {
    setDay(prev => prev.key === dateKey ? prev : { key: dateKey, data: loadDayData(dateKey) });
  }, [dateKey]);

  useEffect(() => {
    saveDayData(day.key, day.data);
  }, [day]);

  const updateMeals = useCallback(updater => {
    setDay(prev => ({
      ...prev,
      data: { ...prev.data, meals: updater(prev.data.meals) },
    }));
  }, []);

  const addFood = useCallback((mealType, food) => {
    updateMeals(meals => ({
      ...meals,
      [mealType]: [...meals[mealType], { ...food, id: Date.now() }],
    }));
  }, [updateMeals]);

  const copyMeals = useCallback((mealType, foods) => {
    const base = Date.now();
    updateMeals(meals => ({
      ...meals,
      [mealType]: [...meals[mealType], ...foods.map((f, i) => ({ ...f, id: base + i }))],
    }));
  }, [updateMeals]);

  const removeFood = useCallback((mealType, foodId) => {
    updateMeals(meals => ({
      ...meals,
      [mealType]: meals[mealType].filter(f => f.id !== foodId),
    }));
  }, [updateMeals]);

  const dayData = day.data;
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
