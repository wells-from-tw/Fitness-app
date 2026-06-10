import { searchFoodDb } from './foodDb';
import { searchUsda } from './usda';

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

/**
 * Build a "官方食品成分資料庫候選項目" block by locally searching the
 * 衛福部食品營養成分資料庫 (per-100g values) for entries whose name/俗名
 * overlaps with the user's description. Lets the AI ground its estimate
 * in real measured data and reason about portion size, instead of
 * guessing absolute calories from scratch.
 */
async function buildDbCandidatesBlock(description) {
  const candidates = await searchFoodDb(description, 15);
  if (candidates.length === 0) return '';
  const lines = candidates.map(c => {
    const altStr = c.alt ? `（俗名：${c.alt}）` : '';
    const descStr = c.desc ? `（${c.desc}）` : '';
    return `- ${c.name}${altStr}［${c.category}］${descStr} 每100g：熱量${c.calories}kcal、蛋白質${c.protein}g、脂肪${c.fat}g、碳水${c.carbs}g`;
  }).join('\n');
  return `\n\n【台灣衛福部食品營養成分資料庫候選項目（每100g可食部分數值）】\n${lines}\n\n比對規則：
- 若使用者描述的食物（或其組成部分，如白飯、肉燥、青菜）對應到上面清單中的某一項（含俗名/同義詞），請優先以該項目的「每100g數值」為基礎推算，不要憑空估算熱量
- 推算時請依台灣常見的份量習慣，估計實際食用的可食重量（公克），再用「每100g數值 × 重量(g)/100」換算成 calories/carbs/protein/fat
- 一份描述可能對應資料庫中多個品項的組合（例如「滷肉飯」＝白飯＋滷肉），可分別取用對應項目並加總，最後仍輸出為使用者描述的單一品項
- 找不到合適項目時，才依你自己的知識估算`;
}

/**
 * Build a "USDA FoodData Central候選項目" block for international/Western
 * foods that the Taiwan official database doesn't cover well. Only runs if
 * the user has configured a (free) USDA API key in Settings; otherwise
 * returns '' immediately (searchUsda short-circuits).
 */
async function buildUsdaBlock(description) {
  const candidates = await searchUsda(description, 5);
  if (candidates.length === 0) return '';
  const lines = candidates.map(c => {
    const brandStr = c.brand ? `（${c.brand}）` : '';
    return `- ${c.name}${brandStr} ${c.per}：熱量${c.calories}kcal、蛋白質${c.protein}g、脂肪${c.fat}g、碳水${c.carbs}g`;
  }).join('\n');
  return `\n\n【USDA FoodData Central 候選項目（國際/西式食品參考）】\n${lines}\n\n比對規則：
- 若使用者描述的是西式/國際食品（如漢堡、義大利麵、起司、穀片、罐頭等），且上述清單有對應品項，請優先參考其數值估算
- 標示「每100g」者，請依實際食用重量換算（數值 × 重量(g)/100）
- 標示「每Xg/Xml」者，代表該包裝/份量的數值，請依使用者描述的數量做比例調整
- 找不到合適項目時，才依你自己的知識估算`;
}

/**
 * Build a "已知食物參考表" block from the user's saved foods (favorites / past entries),
 * so the AI prefers these calibrated values over a fresh guess when the name matches.
 */
function buildReferenceBlock(reference) {
  if (!reference || reference.length === 0) return '';
  const lines = reference
    .slice(0, 30)
    .map(f => `- ${f.name}：${f.calories} kcal（碳水 ${f.carbs}g · 蛋白質 ${f.protein}g · 脂肪 ${f.fat}g）`)
    .join('\n');
  return `\n\n使用者過去記錄／收藏過的食物（若名稱相同或非常相似，請優先採用以下數值，不要重新估算）：\n${lines}`;
}

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

async function callClaude(messages, maxTokens = 256, system = null) {
  const apiKey = loadApiKey();
  if (!apiKey) throw new Error('NO_KEY');
  const body = { model: 'claude-haiku-4-5', max_tokens: maxTokens, messages };
  if (system) body.system = system;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('INVALID_KEY');
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Estimate nutrition from a text description. */
export async function estimateNutrition(description, reference = []) {
  const [dbBlock, usdaBlock] = await Promise.all([
    buildDbCandidatesBlock(description),
    buildUsdaBlock(description),
  ]);
  const data = await callClaude([{
    role: 'user',
    content: `${NUTRITION_PROMPT}${dbBlock}${usdaBlock}${buildReferenceBlock(reference)}\n\n食物描述：${description}`,
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
  const prompt = `你是一個健身紀錄助手。使用者會貼上「任何來源、任何格式」的訓練計劃文字
（可能來自 ChatGPT、教練、筆記、網頁等），格式可能很不規則，例如：
- 含有標題、星期幾分類（Day 1 / 週一 / 胸推日…）
- 編號清單、項目符號、表格式排版、emoji
- 超級組、循環訓練（用 a/b 標示或寫在同一行）
- 用 RPE、%1RM、「力竭」等描述強度而非具體公斤數
- 中英文混雜、繁簡混雜

你的任務：盡你所能從文字中萃取出「所有運動動作」，轉換成 JSON 陣列。
只回傳 JSON 陣列本身，不要加任何說明文字、不要 markdown 代碼塊。

每個動作格式：
{
  "name": "動作名稱（保留原文用語，不要翻譯或更改）",
  "sets": [
    { "reps": 數字, "weight": 數字 }
  ],
  "duration": 數字
}

解析規則（所有數值必須是純數字）：
- reps、weight 一律輸出整數，不能是字串或範圍
- 數值為範圍時（如 5-8下、40-50kg）取最大值
- 重量未標示、用 RPE / %1RM / 「自身體重」/ 「力竭」等描述時，weight 填 0
- 「4組×8下」展開成 4 個 set 物件；若只說「3組」沒寫次數，reps 填 0
- 若整段只有動作名稱、沒有組數資訊，仍要輸出該動作，sets 填一個 { reps: 0, weight: 0 }
- 忽略標題列、星期分類、休息時間、注意事項等非動作文字，但動作本身務必保留
- duration 依組數估算：每組約 3 分鐘（含休息），無法判斷組數時預設 duration 為 5
- 如果完全找不到任何動作，回傳空陣列 []

訓練計劃文字：
${planText}`;

  const data = await callClaude([{ role: 'user', content: prompt }], 4096);
  const text = data.content?.[0]?.text || '';
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json|```/g, '');
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('PARSE_ERROR：AI 未回傳有效的清單格式');
  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch (e) {
    throw new Error('PARSE_ERROR：AI 回傳的內容無法解析（可能太長被截斷）');
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('PARSE_ERROR：未解析出任何動作，請確認文字內容包含具體動作名稱與組數');
  }
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
export async function parseMultipleFoods(description, reference = []) {
  const [dbBlock, usdaBlock] = await Promise.all([
    buildDbCandidatesBlock(description),
    buildUsdaBlock(description),
  ]);
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
- 台灣在地連鎖店、超商鮮食請參考實際菜單／包裝營養標示熱量（如八方雲集、Sukiya、麥當勞、7-11、全家等）
- 有指定數量請乘以對應份量
- 套餐請拆成主餐+附餐（如有米飯請單獨列出）
- 無法細分的套餐就列為一筆${dbBlock}${usdaBlock}${buildReferenceBlock(reference)}

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

/* ─────────────────────────────────────────────
   AI Chat — Training mode
   messages: [{role:'user'|'assistant', content:string}]
   Returns: { message: string, exercises: array|null }
───────────────────────────────────────────── */
const EQUIPMENT_LABELS = {
  barbell:    '槓鈴',
  dumbbell:   '啞鈴',
  machine:    '機械/滑輪',
  bodyweight: '自身體重',
  cable:      '纜繩',
  kettlebell: '壺鈴',
  resistance: '彈力帶',
};

const SPLIT_LABELS = {
  chest:     '胸',
  back:      '背',
  legs:      '腿',
  shoulders: '肩',
  arms:      '手臂（二頭＋三頭）',
  core:      '核心',
  cardio:    '有氧',
  fullbody:  '全身',
  rest:      '休息',
};

const GOAL_LABELS = {
  muscle:    '增肌',
  fat_loss:  '減脂',
  maintain:  '維持體能',
};

const DAY_NAMES = ['週日','週一','週二','週三','週四','週五','週六'];

function buildTrainingSystem(ctx) {
  const today = new Date();
  const todayWD = today.getDay();
  const dateStr = `${today.getMonth()+1}月${today.getDate()}日（${DAY_NAMES[todayWD]}）`;

  let contextBlock = '';

  if (ctx) {
    const { prefs, recentLogs } = ctx;

    // Goal
    if (prefs?.goal) {
      contextBlock += `\n訓練目標：${GOAL_LABELS[prefs.goal] || prefs.goal}`;
    }

    // Equipment
    if (prefs?.equipment?.length > 0) {
      const eq = prefs.equipment.map(e => EQUIPMENT_LABELS[e] || e).join('、');
      contextBlock += `\n可用器材：${eq}`;
    } else {
      contextBlock += `\n可用器材：未設定（預設可建議自重動作）`;
    }

    // Today's split
    if (prefs?.split) {
      const todayGroup = prefs.split[todayWD];
      if (todayGroup && todayGroup !== 'rest') {
        contextBlock += `\n今日訓練分配：${SPLIT_LABELS[todayGroup] || todayGroup}日`;
      } else if (todayGroup === 'rest') {
        contextBlock += `\n今日訓練分配：原定休息日（但使用者可能想練輕鬆一點）`;
      }
      // Full split
      const splitSummary = Object.entries(prefs.split)
        .map(([wd, grp]) => `${DAY_NAMES[wd]}=${SPLIT_LABELS[grp] || grp}`)
        .join('、');
      contextBlock += `\n每週分配：${splitSummary}`;
    }

    // Recent logs
    if (recentLogs?.length > 0) {
      contextBlock += `\n\n最近 7 天訓練紀錄：`;
      recentLogs.forEach(({ dateLabel, exercises }) => {
        if (exercises.length === 0) {
          contextBlock += `\n  ${dateLabel}：休息`;
        } else {
          const names = [...new Set(exercises.map(e => e.name))].join('、');
          const muscles = [...new Set(exercises.flatMap(e => e.muscles?.primary || []))];
          const muscleStr = muscles.length > 0 ? `（${muscles.join('/')}）` : '';
          contextBlock += `\n  ${dateLabel}：${names}${muscleStr}`;
        }
      });
    }
  }

  return `你是一位親切專業的台灣健身教練助理。今天是 ${dateStr}。
${contextBlock ? `\n【使用者資料】${contextBlock}\n` : ''}
根據以上資料，主動提醒使用者：哪些部位需要休息、今天適合練什麼、推薦的器材動作。

每次回覆都必須只輸出一個 JSON 物件，格式如下，不要加任何說明文字或 markdown：
{
  "message": "你的回覆（繁體中文，親切自然，2-4句，可引用使用者的訓練紀錄給出具體建議）",
  "exercises": [
    {
      "name": "動作名稱（繁體中文）",
      "sets": [{"reps": 整數, "weight": 整數}],
      "duration": 整數（分鐘）
    }
  ]
}

規則：
- exercises 在討論中若已有具體計劃就輸出，否則輸出 null
- 使用者要求修改時，輸出更新後的完整 exercises
- weight 未指定時填 0，cardio 類型 sets 填 []
- 只推薦使用者擁有器材的動作
- 語氣輕鬆，可加 emoji`;
}

export async function chatTraining(messages, ctx = null) {
  const system = buildTrainingSystem(ctx);
  const apiMsgs = messages.map(m => ({ role: m.role, content: m.content }));
  const data = await callClaude(apiMsgs, 1024, system);
  const text = data.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { message: text, exercises: null };
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const exercises = Array.isArray(parsed.exercises) && parsed.exercises.length > 0
      ? parsed.exercises.map(e => ({
          name:     String(e.name || '未知動作'),
          duration: Math.round(Number(e.duration) || 5),
          sets: (e.sets || []).map(s => ({
            reps:   Math.round(Number(s.reps)   || 0),
            weight: Math.round(Number(s.weight) || 0),
          })),
        }))
      : null;
    return { message: String(parsed.message || ''), exercises };
  } catch {
    return { message: text, exercises: null };
  }
}

/* ─────────────────────────────────────────────
   AI Chat — Nutrition mode
   Returns: { message: string, mealType: string|null, meals: array|null }
───────────────────────────────────────────── */
const MEAL_NAMES = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心' };

function buildNutritionSystem(ctx) {
  let contextBlock = '';

  if (ctx) {
    const { goals, totals, meals, burned } = ctx;

    if (goals) {
      contextBlock += `\n每日目標：${goals.calories} kcal（碳水 ${goals.carbs}g · 蛋白質 ${goals.protein}g · 脂肪 ${goals.fat}g）`;
    }

    if (totals) {
      contextBlock += `\n今日已攝取：${totals.calories} kcal（碳水 ${totals.carbs}g · 蛋白質 ${totals.protein}g · 脂肪 ${totals.fat}g）`;
      if (goals) {
        const remaining = goals.calories - totals.calories + (burned || 0);
        contextBlock += `\n今日剩餘額度：約 ${remaining} kcal（已含運動消耗 ${burned || 0} kcal）`;
        const carbGap    = Math.max(0, goals.carbs    - totals.carbs);
        const proteinGap = Math.max(0, goals.protein  - totals.protein);
        const fatGap     = Math.max(0, goals.fat      - totals.fat);
        contextBlock += `\n尚未達標的營養素缺口：碳水 ${carbGap}g · 蛋白質 ${proteinGap}g · 脂肪 ${fatGap}g`;
      }
    }

    if (meals) {
      const mealLines = Object.entries(meals)
        .filter(([, foods]) => foods.length > 0)
        .map(([type, foods]) => `${MEAL_NAMES[type] || type}：${foods.map(f => f.name).join('、')}`);
      if (mealLines.length > 0) {
        contextBlock += `\n\n今天已記錄的餐點：\n  ${mealLines.join('\n  ')}`;
      } else {
        contextBlock += `\n\n今天尚未記錄任何餐點`;
      }
    }
  }

  return `你是一位親切專業的台灣營養師助理。使用者會告訴你今天吃了什麼或想記錄什麼餐點，你要幫他辨識食物、估算營養並記錄。
${contextBlock ? `\n【使用者今日狀況】${contextBlock}\n` : ''}
根據以上資料，可以主動提醒使用者：今天熱量/營養素還有多少額度、目前飲食是否均衡、適合吃什麼來補足缺口。

每次回覆都必須只輸出一個 JSON 物件，格式如下，不要加任何說明文字或 markdown：
{
  "message": "你的回覆（繁體中文，親切自然，2-4句，可引用使用者今日的剩餘額度或缺口給出具體建議）",
  "mealType": "breakfast"|"lunch"|"dinner"|"snack"|null,
  "meals": [
    {
      "name": "食物名稱（繁體中文，簡短清楚）",
      "calories": 整數,
      "carbs": 整數,
      "protein": 整數,
      "fat": 整數
    }
  ]
}

規則：
- 若使用者說的食物夠具體，meals 就輸出估算結果，否則輸出 null
- mealType 根據上下文判斷（早餐/午餐/晚餐/點心），無法判斷時輸出 null
- 台灣在地食物請參考在地熱量（如便利商店、夜市、早餐店等）
- 語氣輕鬆，可加 emoji`;
}

export async function chatNutrition(messages, ctx = null) {
  const system = buildNutritionSystem(ctx);
  const apiMsgs = messages.map(m => ({ role: m.role, content: m.content }));
  const data = await callClaude(apiMsgs, 1024, system);
  const text = data.content?.[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { message: text, mealType: null, meals: null };
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const meals = Array.isArray(parsed.meals) && parsed.meals.length > 0
      ? parsed.meals.map(f => ({
          name:     String(f.name     || '未知食物'),
          calories: Math.round(Number(f.calories) || 0),
          carbs:    Math.round(Number(f.carbs)    || 0),
          protein:  Math.round(Number(f.protein)  || 0),
          fat:      Math.round(Number(f.fat)      || 0),
        }))
      : null;
    const validTypes = ['breakfast','lunch','dinner','snack'];
    const mealType = validTypes.includes(parsed.mealType) ? parsed.mealType : null;
    return { message: String(parsed.message || ''), mealType, meals };
  } catch {
    return { message: text, mealType: null, meals: null };
  }
}
