const API_KEY_STORAGE = 'wisefitness_api_key';

export function loadApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}
export function saveApiKey(key) {
  if (key) localStorage.setItem(API_KEY_STORAGE, key.trim());
  else localStorage.removeItem(API_KEY_STORAGE);
}

const NUTRITION_PROMPT = `你是一個專業的台灣營養師助理。請辨識食物並估算其一份的營養成分。
請以 JSON 格式回傳，只回傳 JSON 物件，不要加任何說明文字或 markdown：
{
  "name": "食物名稱（繁體中文，簡短清楚）",
  "calories": 整數,
  "carbs": 整數（克）,
  "protein": 整數（克）,
  "fat": 整數（克）
}
估算原則：以常見的一份量為基準，台灣在地料理請參考本地食材與烹調方式，無法識別也請盡量估算。`;

function parseNutrition(text, fallbackName) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('PARSE_ERROR');
  const parsed = JSON.parse(jsonMatch[0]);
  return {
    name:     String(parsed.name    || fallbackName),
    calories: Math.round(Number(parsed.calories) || 0),
    carbs:    Math.round(Number(parsed.carbs)    || 0),
    protein:  Math.round(Number(parsed.protein)  || 0),
    fat:      Math.round(Number(parsed.fat)      || 0),
  };
}

async function callClaude(messages, maxTokens = 256) {
  const apiKey = loadApiKey();
  if (!apiKey) throw new Error('NO_KEY');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: maxTokens, messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('INVALID_KEY');
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Estimate nutrition from a text description. */
export async function estimateNutrition(description) {
  const data = await callClaude([{
    role: 'user',
    content: `${NUTRITION_PROMPT}\n\n食物描述：${description}`,
  }]);
  return parseNutrition(data.content?.[0]?.text || '', description);
}

/** Estimate nutrition from a photo (base64 encoded). */
export async function estimateNutritionFromImage(base64Data, mimeType) {
  const data = await callClaude([{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
      { type: 'text', text: NUTRITION_PROMPT },
    ],
  }]);
  return parseNutrition(data.content?.[0]?.text || '', '照片食物');
}

/** Read nutrition facts directly from a nutrition label photo. */
export async function readNutritionLabel(base64Data, mimeType) {
  const prompt = `請仔細閱讀這張營養標示圖片，直接讀取標示上的數值，不要估算。
請以 JSON 格式回傳，只回傳 JSON 物件，不要加任何說明文字或 markdown：
{
  "name": "食品名稱（如圖片上有的話，否則填「營養標示商品」）",
  "calories": 整數（每份/每100g的熱量，單位 kcal。若標示為 kJ 請換算：kJ ÷ 4.184）,
  "carbs": 整數（碳水化合物，克）,
  "protein": 整數（蛋白質，克）,
  "fat": 整數（脂肪，克）
}

注意：
- 優先讀取「每份」的數值，若只有「每100g」則讀取每100g
- 若標示同時有每份和每100g，取每份的數值
- 所有數值四捨五入為整數`;

  const data = await callClaude([{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
      { type: 'text', text: prompt },
    ],
  }], 512);
  return parseNutrition(data.content?.[0]?.text || '', '營養標示商品');
}

/** AI weekly nutrition summary. stats = array of { key, calories, carbs, protein, fat, count }. */
export async function getWeeklySummary(stats, goals) {
  const lines = stats
    .filter(d => d.count > 0)
    .map(d => {
      const label = d.key.slice(5).replace('-', '/');
      return `${label}：${d.calories} kcal（碳${d.carbs}g 蛋${d.protein}g 脂${d.fat}g）`;
    });

  const prompt = `你是一位親切的台灣營養師。請根據以下這週飲食記錄，用 4-6 句繁體中文給出週報分析：整體達標率評估、最均衡的一天、最需改進的方面、下週具體改善建議。語氣積極鼓勵，直接輸出文字，不需要 JSON 或 markdown。

每日目標：${goals.calories} kcal（碳水 ${goals.carbs}g 蛋白質 ${goals.protein}g 脂肪 ${goals.fat}g）

${lines.length > 0 ? lines.join('\n') : '本週尚無飲食記錄'}`;

  const data = await callClaude([{ role: 'user', content: prompt }]);
  return data.content?.[0]?.text?.trim() || '無法取得分析結果';
}

/** AI dietary consultation — answer a user question based on weekly data. */
export async function getAiConsultation(question, weekLines, goals) {
  const prompt = `你是一位親切專業的台灣營養師助理。請根據使用者近 7 天的飲食數據，用繁體中文回答他的問題。回答要具體、有根據，不超過 5 句話，語氣輕鬆。

每日目標：${goals.calories} kcal（碳水 ${goals.carbs}g · 蛋白質 ${goals.protein}g · 脂肪 ${goals.fat}g）

近 7 天記錄：
${weekLines.length > 0 ? weekLines.join('\n') : '（無記錄）'}

使用者問題：${question}`;

  const data = await callClaude([{ role: 'user', content: prompt }]);
  return data.content?.[0]?.text?.trim() || '無法取得回答';
}

/** AI meal suggestion based on remaining calories/macros for the day. */
export async function getMealSuggestion(remaining, totals, goals) {
  const carbGap    = Math.max(0, goals.carbs   - totals.carbs);
  const proteinGap = Math.max(0, goals.protein - totals.protein);
  const fatGap     = Math.max(0, goals.fat     - totals.fat);

  const prompt = `你是一位親切的台灣營養師。根據使用者今日剩餘熱量，推薦 1-2 道適合的台灣常見食物或餐點。

今日已攝取：${totals.calories} kcal（目標 ${goals.calories} kcal，剩餘 ${remaining} kcal）
三大營養素缺口：碳水 ${carbGap}g · 蛋白質 ${proteinGap}g · 脂肪 ${fatGap}g

請直接推薦具體食物（注明估計熱量），說明為什麼適合今天的缺口，不超過 3 句話，語氣輕鬆。`;

  const data = await callClaude([{ role: 'user', content: prompt }]);
  return data.content?.[0]?.text?.trim() || '無法取得建議';
}

/** AI daily nutrition summary. Returns a plain-text analysis string. */
export async function getDailySummary(meals, totals, goals) {
  const MEAL_NAMES = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心' };
  const mealLines = Object.entries(meals)
    .filter(([, foods]) => foods.length > 0)
    .map(([type, foods]) =>
      `【${MEAL_NAMES[type]}】${foods.map(f => `${f.name}(${f.calories}kcal)`).join('、')}`
    );

  const prompt = `你是一位親切的台灣營養師。請根據今日飲食記錄，用 3-5 句繁體中文給出小結：整體熱量評估、三大營養素均衡度、值得稱讚的點、明日一個具體建議。語氣自然親切，直接輸出文字，不需要 JSON 或 markdown。

今日攝取：${totals.calories} kcal（目標 ${goals.calories} kcal）
碳水：${totals.carbs}g（目標 ${goals.carbs}g）　蛋白質：${totals.protein}g（目標 ${goals.protein}g）　脂肪：${totals.fat}g（目標 ${goals.fat}g）

${mealLines.length > 0 ? mealLines.join('\n') : '今日尚無飲食記錄'}`;

  const data = await callClaude([{ role: 'user', content: prompt }]);
  return data.content?.[0]?.text?.trim() || '無法取得分析結果';
}

/**
 * Parse a freeform workout plan text into structured exercise entries.
 * Returns an array of { name, sets: [{reps, weight}], duration }
 */
export async function parseWorkoutPlan(planText) {
  const prompt = `你是一個健身紀錄助手。請解析以下訓練計劃文字，將每個動作轉換成 JSON 格式。
只回傳 JSON 陣列，不要加任何說明文字或 markdown 代碼塊。

每個動作格式如下：
{
  "name": "動作名稱（保留原文）",
  "sets": [
    { "reps": 數字, "weight": 數字 }
  ],
  "duration": 數字
}

重要規則（所有數值必須是純數字，不能是字串）：
- reps 和 weight 必須是整數，不可以是字串
- 如果是範圍（例如 5-8下），取最大值（填 8）
- 如果重量是範圍（例如 40-50kg），取最大值（填 50）
- 如果沒有標示重量，weight 填 0
- 如果指定多組相同設定，請展開成多個 set 物件（例如 4組×8下 → 4個 set）
- duration 依組數估算，每組約3分鐘含休息，填整數

訓練計劃：
${planText}`;

  const data = await callClaude([{ role: 'user', content: prompt }]);
  const text = data.content?.[0]?.text || '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('PARSE_ERROR');
  const parsed = JSON.parse(match[0]);
  // Sanitize: ensure all numeric fields are numbers
  return parsed.map(item => ({
    name:     String(item.name || '未知動作'),
    duration: Math.round(Number(item.duration) || (item.sets?.length || 1) * 3),
    sets: (item.sets || []).map(s => ({
      reps:   Math.round(Number(String(s.reps).split('-').pop()) || 0),
      weight: Math.round(Number(String(s.weight).split('-').pop()) || 0),
    })),
  }));
}

/**
 * Parse a freeform meal description into multiple food items.
 * Returns an array of { name, calories, carbs, protein, fat }
 */
export async function parseMultipleFoods(description) {
  const prompt = `你是一個專業的台灣營養師助理。使用者描述了他今天吃的東西，可能包含多個品項。
請辨識每個食物並估算其營養成分，以 JSON 陣列回傳。只回傳 JSON 陣列，不要加任何說明文字或 markdown。

每個品項格式：
{
  "name": "食物名稱（繁體中文，簡短清楚，包含數量或份量）",
  "calories": 整數,
  "carbs": 整數（克）,
  "protein": 整數（克）,
  "fat": 整數（克）
}

估算原則：
- 台灣在地連鎖店請參考實際菜單熱量（八方雲集、Sukiya、麥當勞等）
- 有指定數量請乘以對應份量
- 套餐請拆成主餐+附餐（如有米飯請單獨列出）
- 無法細分的套餐就列為一筆

使用者描述：${description}`;

  const data = await callClaude([{ role: 'user', content: prompt }]);
  const text = data.content?.[0]?.text || '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('PARSE_ERROR');
  const parsed = JSON.parse(match[0]);
  return parsed.map(item => ({
    name:     String(item.name    || '未知食物'),
    calories: Math.round(Number(item.calories) || 0),
    carbs:    Math.round(Number(item.carbs)    || 0),
    protein:  Math.round(Number(item.protein)  || 0),
    fat:      Math.round(Number(item.fat)      || 0),
  }));
}
