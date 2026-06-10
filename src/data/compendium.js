/**
 * Compendium of Physical Activities (2011) — curated extension dataset.
 *
 * The main `EXERCISES` list in `exercises.js` covers common gym/strength
 * movements with detailed muscle-group mappings. This file adds MET values
 * (and rough muscle-group estimates where meaningful) for sports, cardio,
 * and everyday activities that users commonly type/AI-parse but that aren't
 * gym exercises — e.g. 籃球, 拳擊, 攀岩, 太極, 遛狗, 戰繩…
 *
 * Used as a *fallback* lookup (after EXERCISES) so MET-based calorie
 * estimates and muscle heatmap mapping work for these too, instead of
 * silently defaulting to MET 5 / no muscle group.
 *
 * Source: Ainsworth et al., 2011 Compendium of Physical Activities
 * (https://sites.google.com/site/compendiumofphysicalactivities/) —
 * publicly published reference MET values, widely cited.
 */

export const COMPENDIUM = [
  // ── 球類運動 ─────────────────────────────────────────────
  { name: '籃球', alt: '打籃球,鬥牛,籃球比賽', met: 8.0, type: 'cardio',
    muscles: { primary: ['quads', 'calves'], secondary: ['core', 'shoulders'] } },
  { name: '排球', alt: '打排球,沙灘排球', met: 4.0, type: 'cardio',
    muscles: { primary: ['shoulders', 'quads'], secondary: ['core'] } },
  { name: '足球', alt: '踢足球,五人制足球', met: 7.0, type: 'cardio',
    muscles: { primary: ['quads', 'hamstrings', 'calves'], secondary: ['core'] } },
  { name: '網球', alt: '打網球', met: 7.3, type: 'cardio',
    muscles: { primary: ['shoulders', 'forearms', 'quads'], secondary: ['core'] } },
  { name: '羽毛球', alt: '打羽球,羽球', met: 5.5, type: 'cardio',
    muscles: { primary: ['shoulders', 'quads'], secondary: ['forearms', 'core'] } },
  { name: '桌球', alt: '乒乓球,打桌球', met: 4.0, type: 'cardio',
    muscles: { primary: ['shoulders', 'forearms'], secondary: ['core'] } },
  { name: '棒球', alt: '壘球,打棒球', met: 5.0, type: 'cardio',
    muscles: { primary: ['shoulders', 'core'], secondary: ['quads'] } },
  { name: '高爾夫球', alt: '高爾夫,打高爾夫', met: 4.3, type: 'cardio',
    muscles: { primary: ['core', 'shoulders'], secondary: ['lower_back'] } },
  { name: '手球', alt: '團隊手球', met: 8.0, type: 'cardio',
    muscles: { primary: ['shoulders', 'quads'], secondary: ['core'] } },
  { name: '壁球', alt: '回力球', met: 7.3, type: 'cardio',
    muscles: { primary: ['quads', 'shoulders'], secondary: ['core', 'forearms'] } },
  { name: '美式足球', alt: '橄欖球,touch football', met: 8.0, type: 'cardio',
    muscles: { primary: ['quads', 'core'], secondary: ['shoulders', 'glutes'] } },
  { name: '保齡球', alt: '打保齡球', met: 3.0, type: 'cardio',
    muscles: { primary: ['shoulders', 'quads'], secondary: ['core'] } },
  { name: '飛盤', alt: '極限飛盤,圓盤', met: 8.0, type: 'cardio',
    muscles: { primary: ['quads', 'shoulders'], secondary: ['core'] } },

  // ── 武術 / 格鬥 ──────────────────────────────────────────
  { name: '拳擊', alt: '打拳,拳擊有氧,沙包訓練', met: 7.8, type: 'cardio',
    muscles: { primary: ['shoulders', 'core'], secondary: ['triceps', 'quads'] } },
  { name: '跆拳道', alt: '空手道,柔道,武術,格鬥訓練', met: 10.3, type: 'cardio',
    muscles: { primary: ['core', 'quads', 'shoulders'], secondary: ['hamstrings'] } },
  { name: '太極', alt: '太極拳', met: 3.0, type: 'cardio',
    muscles: { primary: ['core', 'quads'], secondary: ['shoulders'] } },

  // ── 戶外 / 攀爬 ──────────────────────────────────────────
  { name: '攀岩', alt: '抱石,攀岩館', met: 8.0, type: 'cardio',
    muscles: { primary: ['forearms', 'lats', 'biceps'], secondary: ['core', 'shoulders'] } },
  { name: '攀繩', alt: '繩索攀爬', met: 8.0, type: 'strength',
    muscles: { primary: ['lats', 'biceps', 'forearms'], secondary: ['core'] } },

  // ── 雪上 / 水上 ──────────────────────────────────────────
  { name: '滑雪', alt: '雙板滑雪,單板滑雪,滑雪板', met: 7.0, type: 'cardio',
    muscles: { primary: ['quads', 'glutes'], secondary: ['core', 'calves'] } },
  { name: '溜冰', alt: '直排輪,滑冰', met: 7.0, type: 'cardio',
    muscles: { primary: ['quads', 'glutes', 'calves'], secondary: ['core'] } },
  { name: '衝浪', alt: '滑浪', met: 5.0, type: 'cardio',
    muscles: { primary: ['shoulders', 'core'], secondary: ['lats'] } },
  { name: '立式划槳', alt: 'SUP,槳板', met: 6.0, type: 'cardio',
    muscles: { primary: ['core', 'shoulders', 'lats'], secondary: ['quads'] } },
  { name: '游泳-蛙式', alt: '蛙式', met: 5.3, type: 'cardio',
    muscles: { primary: ['chest', 'quads'], secondary: ['shoulders', 'core'] } },
  { name: '游泳-自由式', alt: '自由式,捷泳', met: 8.3, type: 'cardio',
    muscles: { primary: ['lats', 'shoulders'], secondary: ['triceps', 'core'] } },
  { name: '游泳-仰式', alt: '仰式', met: 4.8, type: 'cardio',
    muscles: { primary: ['lats', 'shoulders'], secondary: ['core'] } },
  { name: '游泳-蝶式', alt: '蝶式', met: 13.8, type: 'cardio',
    muscles: { primary: ['lats', 'chest', 'shoulders'], secondary: ['core', 'quads'] } },

  // ── 舞蹈 ─────────────────────────────────────────────────
  { name: '社交舞', alt: '排舞,交際舞,土風舞', met: 4.5, type: 'cardio',
    muscles: { primary: ['quads', 'calves'], secondary: ['core'] } },
  { name: '街舞', alt: '熱舞,Hip Hop舞蹈,Zumba,尊巴', met: 6.0, type: 'cardio',
    muscles: { primary: ['quads', 'core'], secondary: ['shoulders', 'calves'] } },

  // ── 功能性訓練 ────────────────────────────────────────────
  { name: 'CrossFit', alt: '混合健身,功能性訓練', met: 8.0, type: 'strength',
    muscles: { primary: ['quads', 'core', 'shoulders'], secondary: ['glutes', 'chest'] } },
  { name: '壺鈴訓練', alt: '壺鈴擺盪,kettlebell', met: 8.0, type: 'strength',
    muscles: { primary: ['shoulders', 'core', 'glutes'], secondary: ['quads', 'lats'] } },
  { name: '戰繩', alt: '戰繩訓練,battle rope', met: 8.0, type: 'cardio',
    muscles: { primary: ['shoulders', 'core'], secondary: ['forearms'] } },
  { name: '懸吊訓練', alt: 'TRX,吊環訓練', met: 6.0, type: 'strength',
    muscles: { primary: ['core', 'chest', 'shoulders'], secondary: ['lats'] } },
  { name: '跳箱', alt: '箱式跳躍,box jump', met: 8.0, type: 'cardio',
    muscles: { primary: ['quads', 'glutes', 'calves'], secondary: ['core'] } },

  // ── 自行車 ───────────────────────────────────────────────
  { name: '登山自行車', alt: '越野單車,off-road cycling', met: 8.5, type: 'cardio',
    muscles: { primary: ['quads', 'calves'], secondary: ['core', 'hamstrings'] } },
  { name: '飛輪', alt: '飛輪課,室內飛輪,SPIN', met: 8.5, type: 'cardio',
    muscles: { primary: ['quads', 'calves'], secondary: ['hamstrings', 'glutes'] } },

  // ── 日常活動 ─────────────────────────────────────────────
  { name: '遛狗', alt: '帶狗散步', met: 3.0, type: 'cardio',
    muscles: { primary: ['quads', 'calves'], secondary: ['core'] } },
  { name: '打掃', alt: '拖地,吸地,做家事', met: 3.5, type: 'cardio',
    muscles: { primary: ['core', 'shoulders'], secondary: ['quads'] } },
  { name: '園藝', alt: '種花,除草,挖土', met: 4.0, type: 'cardio',
    muscles: { primary: ['lower_back', 'quads'], secondary: ['forearms'] } },
  { name: '搬運重物', alt: '搬家,扛重物,負重行走', met: 5.0, type: 'strength',
    muscles: { primary: ['core', 'lower_back', 'quads'], secondary: ['forearms', 'shoulders'] } },
  { name: '伸展', alt: '熱身,拉筋,暖身運動', met: 2.5, type: 'cardio',
    muscles: { primary: ['core'], secondary: [] } },
];

const STRIP_RE = /[\d０-９.,，、。\s()（）×x*~約份次組分鐘]/gi;

/**
 * Match a freeform exercise name against the Compendium fallback list.
 * Returns the matched entry or null. Mirrors the matching strategy used
 * for the curated EXERCISES list (exact → substring, either direction).
 */
export function matchCompendium(name) {
  const n = String(name || '').replace(STRIP_RE, '').toLowerCase();
  if (!n) return null;

  for (const item of COMPENDIUM) {
    const candidates = [item.name, ...(item.alt ? item.alt.split(',') : [])]
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    if (candidates.some(c => c === n)) return item;
  }
  for (const item of COMPENDIUM) {
    const candidates = [item.name, ...(item.alt ? item.alt.split(',') : [])]
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    if (candidates.some(c => n.includes(c) || c.includes(n))) return item;
  }
  return null;
}
