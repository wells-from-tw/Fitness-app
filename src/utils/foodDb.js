/**
 * 衛福部食品營養成分資料庫（每100g可食部分）
 * 欄位對應：
 *   name     ← 樣品名稱
 *   alt      ← 俗名（逗號分隔的同義詞/別名）
 *   category ← 食品分類
 *   desc     ← 內容物描述
 *   calories ← 熱量(kcal)
 *   protein  ← 粗蛋白(g)　— 即一般營養標示上的「蛋白質」
 *   fat      ← 粗脂肪(g)　— 即一般營養標示上的「脂肪」
 *   carbs    ← 總碳水化合物(g)
 *
 * Loaded lazily (dynamic import) so the ~500KB dataset doesn't bloat the
 * main app bundle — it's only fetched the first time an AI estimate runs.
 */
let dbPromise = null;
function loadFoodDb() {
  if (!dbPromise) {
    dbPromise = import('../data/foodDb.json').then(m => m.default ?? m);
  }
  return dbPromise;
}

const STRIP_RE = /[\d０-９.,，、。\s()（）×x*~約份碗杯個片塊條根盒包瓶罐]/gi;

/**
 * Find candidate foods from the official database whose name/alt name
 * shares a substring (length >= 2) with the user's free-text description.
 * Returns up to `limit` best-scoring, de-duplicated candidates.
 */
export async function searchFoodDb(text, limit = 12) {
  const t = String(text || '').replace(STRIP_RE, '');
  if (t.length < 2) return [];

  const FOOD_DB = await loadFoodDb();
  const scored = [];
  for (const item of FOOD_DB) {
    const candidates = [item.name, ...(item.alt ? item.alt.split(/[,、]/) : [])]
      .map(s => s.trim())
      .filter(Boolean);

    let best = 0;
    for (const cand of candidates) {
      if (t.includes(cand)) { best = Math.max(best, cand.length * 2); continue; }
      if (cand.includes(t)) { best = Math.max(best, t.length); continue; }
      const maxLen = Math.min(cand.length, t.length);
      for (let len = maxLen; len >= 2; len--) {
        let found = false;
        for (let i = 0; i + len <= cand.length; i++) {
          if (t.includes(cand.slice(i, i + len))) { found = true; break; }
        }
        if (found) { best = Math.max(best, len); break; }
      }
    }
    if (best >= 2) scored.push({ item, score: best });
  }

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set();
  const result = [];
  for (const { item } of scored) {
    if (seen.has(item.name)) continue;
    seen.add(item.name);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}
