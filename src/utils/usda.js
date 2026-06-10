/**
 * USDA FoodData Central — used as an additional reference source for
 * international / Western foods (burgers, pasta, cereal, branded snacks…)
 * that the Taiwan 衛福部資料庫 doesn't cover well.
 *
 * Requires a free API key from https://fdc.nal.usda.gov/api-key-signup.html
 * Stored in localStorage only (never hardcoded / committed).
 */

const USDA_KEY_STORAGE = 'wisefitness_usda_key';

export function loadUsdaKey() {
  return localStorage.getItem(USDA_KEY_STORAGE) || '';
}
export function saveUsdaKey(key) {
  if (key) localStorage.setItem(USDA_KEY_STORAGE, key.trim());
  else localStorage.removeItem(USDA_KEY_STORAGE);
}

const NUTRIENT_MAP = {
  'Energy': 'calories',
  'Protein': 'protein',
  'Total lipid (fat)': 'fat',
  'Carbohydrate, by difference': 'carbs',
};

/**
 * Search USDA FoodData Central by free-text query.
 * Returns up to `limit` items: { name, brand, per, calories, protein, fat, carbs }
 * `per` is either "每100g" (Foundation/SR Legacy) or "每{servingSize}{unit}" (Branded).
 * Returns [] silently on any error / missing key — this is a "best effort" extra source.
 */
export async function searchUsda(text, limit = 5) {
  const apiKey = loadUsdaKey();
  const q = String(text || '').trim();
  if (!apiKey || !q) return [];

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(q)}&pageSize=${limit}&dataType=Foundation,SR%20Legacy,Branded`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const foods = data.foods || [];

    return foods
      .map(f => {
        const nutrients = {};
        for (const n of f.foodNutrients || []) {
          const key = NUTRIENT_MAP[n.nutrientName];
          if (key && nutrients[key] === undefined) nutrients[key] = n.value;
        }
        const perServing = f.servingSize && f.servingSizeUnit;
        return {
          name: f.description || '',
          brand: f.brandOwner || f.brandName || '',
          per: perServing ? `每${f.servingSize}${f.servingSizeUnit}` : '每100g',
          calories: Math.round(nutrients.calories || 0),
          protein: Math.round(nutrients.protein || 0),
          fat: Math.round(nutrients.fat || 0),
          carbs: Math.round(nutrients.carbs || 0),
        };
      })
      .filter(f => f.name && f.calories > 0);
  } catch {
    return [];
  }
}
