const STORAGE_KEY = 'wisefitness_data';
const GOALS_KEY   = 'wisefitness_goals';

export function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function loadDayData(dateKey) {
  const raw = localStorage.getItem(STORAGE_KEY);
  const all = raw ? JSON.parse(raw) : {};
  return all[dateKey] ?? {
    meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
  };
}

export function saveDayData(dateKey, data) {
  const raw = localStorage.getItem(STORAGE_KEY);
  const all = raw ? JSON.parse(raw) : {};
  all[dateKey] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function loadAllDays() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

/** Goals: { calories, carbs, protein, fat } */
const DEFAULT_GOALS = { calories: 2000, carbs: 250, protein: 120, fat: 65 };

export function loadGoals() {
  const raw = localStorage.getItem(GOALS_KEY);
  return raw ? { ...DEFAULT_GOALS, ...JSON.parse(raw) } : { ...DEFAULT_GOALS };
}

export function saveGoals(goals) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

/** Favorite foods */
const FAVS_KEY = 'wisefitness_favs';

export function loadFavorites() {
  const raw = localStorage.getItem(FAVS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveFavorite(food) {
  const favs = loadFavorites();
  // avoid duplicate by name
  if (favs.some(f => f.name === food.name)) return;
  favs.unshift({ ...food, savedAt: Date.now() });
  localStorage.setItem(FAVS_KEY, JSON.stringify(favs.slice(0, 30)));
}

export function removeFavorite(name) {
  const favs = loadFavorites().filter(f => f.name !== name);
  localStorage.setItem(FAVS_KEY, JSON.stringify(favs));
}

/** Weight log: { [dateKey]: number } */
const WEIGHT_KEY = 'wisefitness_weight';

export function loadWeightLog() {
  const raw = localStorage.getItem(WEIGHT_KEY);
  return raw ? JSON.parse(raw) : {};
}

export function saveWeight(dateKey, kg) {
  const log = loadWeightLog();
  if (kg === null || kg === undefined) {
    delete log[dateKey];
  } else {
    log[dateKey] = kg;
  }
  localStorage.setItem(WEIGHT_KEY, JSON.stringify(log));
}

/** Body profile: { gender, age, height, activity } */
const PROFILE_KEY = 'wisefitness_profile';
const DEFAULT_PROFILE = { gender: 'male', age: 25, height: 170, weight: 65, activity: 1.55 };

export function loadProfile() {
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/** Exercise log: { [dateKey]: [{ id, name, duration, calories }] } */
const EXERCISE_KEY = 'wisefitness_exercise';

export function loadExerciseLog(dateKey) {
  const raw = localStorage.getItem(EXERCISE_KEY);
  const all = raw ? JSON.parse(raw) : {};
  return all[dateKey] ?? [];
}

export function saveExerciseLog(dateKey, list) {
  const raw = localStorage.getItem(EXERCISE_KEY);
  const all = raw ? JSON.parse(raw) : {};
  all[dateKey] = list;
  localStorage.setItem(EXERCISE_KEY, JSON.stringify(all));
}

export function loadAllExercise() {
  const raw = localStorage.getItem(EXERCISE_KEY);
  return raw ? JSON.parse(raw) : {};
}

/** Water goal: number of cups (default 8) */
const WATER_GOAL_KEY = 'wisefitness_water_goal';

export function loadWaterGoal() {
  const raw = localStorage.getItem(WATER_GOAL_KEY);
  return raw ? Number(raw) : 8;
}

export function saveWaterGoal(cups) {
  localStorage.setItem(WATER_GOAL_KEY, String(cups));
}

/** Meal split: { breakfast, lunch, dinner, snack } — percentages summing to 100 */
const MEAL_SPLIT_KEY = 'wisefitness_meal_split';
const DEFAULT_SPLIT  = { breakfast: 25, lunch: 35, dinner: 30, snack: 10 };

export function loadMealSplit() {
  const raw = localStorage.getItem(MEAL_SPLIT_KEY);
  return raw ? JSON.parse(raw) : { ...DEFAULT_SPLIT };
}

export function saveMealSplit(split) {
  localStorage.setItem(MEAL_SPLIT_KEY, JSON.stringify(split));
}

/** Weight goal: { target: number, by?: string (YYYY-MM-DD) } */
const WEIGHT_GOAL_KEY = 'wisefitness_weight_goal';

export function loadWeightGoal() {
  const raw = localStorage.getItem(WEIGHT_GOAL_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveWeightGoal(goal) {
  localStorage.setItem(WEIGHT_GOAL_KEY, JSON.stringify(goal));
}

/** Water log: { [dateKey]: cups } */
const WATER_KEY = 'wisefitness_water';

export function loadWaterLog() {
  const raw = localStorage.getItem(WATER_KEY);
  return raw ? JSON.parse(raw) : {};
}

export function saveWater(dateKey, cups) {
  const log = loadWaterLog();
  log[dateKey] = cups;
  localStorage.setItem(WATER_KEY, JSON.stringify(log));
}
