/**
 * WiseFitness Exercise Database
 * MET values from Compendium of Physical Activities (2011)
 * Muscle groups: chest, shoulders, biceps, triceps, forearms,
 *   core, lats, upper_back, lower_back, glutes, quads, hamstrings, calves
 */
import { matchCompendium } from './compendium.js';

export const MUSCLE_LABELS = {
  chest:      '胸',
  shoulders:  '肩',
  biceps:     '二頭',
  triceps:    '三頭',
  forearms:   '前臂',
  core:       '核心',
  lats:       '背闊肌',
  upper_back: '上背',
  lower_back: '下背',
  glutes:     '臀',
  quads:      '股四頭',
  hamstrings: '腿後腱',
  calves:     '小腿',
};

export const CATEGORIES = [
  { id: 'cardio',    label: '有氧', emoji: '🏃' },
  { id: 'chest',     label: '胸',   emoji: '💪' },
  { id: 'back',      label: '背',   emoji: '🔙' },
  { id: 'shoulders', label: '肩',   emoji: '🏋️' },
  { id: 'arms',      label: '手臂', emoji: '💪' },
  { id: 'legs',      label: '腿',   emoji: '🦵' },
  { id: 'core',      label: '核心', emoji: '🎯' },
];

// type: 'cardio' | 'strength'
// muscles.primary / secondary: array of muscle IDs
export const EXERCISES = [
  // ── 有氧 ─────────────────────────────────────────────────
  {
    id: 'walking', name: '步行', category: 'cardio', type: 'cardio', met: 3.5,
    muscles: { primary: ['quads', 'calves', 'glutes'], secondary: ['hamstrings', 'core'] },
  },
  {
    id: 'jogging', name: '慢跑', category: 'cardio', type: 'cardio', met: 7.0,
    muscles: { primary: ['quads', 'calves', 'hamstrings'], secondary: ['glutes', 'core'] },
  },
  {
    id: 'running', name: '跑步', category: 'cardio', type: 'cardio', met: 9.8,
    muscles: { primary: ['quads', 'calves', 'hamstrings', 'glutes'], secondary: ['core', 'lower_back'] },
  },
  {
    id: 'sprinting', name: '衝刺', category: 'cardio', type: 'cardio', met: 13.5,
    muscles: { primary: ['quads', 'hamstrings', 'glutes', 'calves'], secondary: ['core', 'lower_back'] },
  },
  {
    id: 'cycling', name: '騎腳踏車', category: 'cardio', type: 'cardio', met: 7.0,
    muscles: { primary: ['quads', 'calves'], secondary: ['hamstrings', 'glutes'] },
  },
  {
    id: 'swimming', name: '游泳', category: 'cardio', type: 'cardio', met: 7.0,
    muscles: {
      primary: ['lats', 'chest', 'shoulders'],
      secondary: ['triceps', 'core', 'quads', 'hamstrings', 'calves'],
    },
  },
  {
    id: 'jump_rope', name: '跳繩', category: 'cardio', type: 'cardio', met: 11.0,
    muscles: { primary: ['calves', 'quads'], secondary: ['shoulders', 'core'] },
  },
  {
    id: 'rowing_machine', name: '划船機', category: 'cardio', type: 'cardio', met: 7.0,
    muscles: { primary: ['lats', 'upper_back', 'core'], secondary: ['biceps', 'quads', 'hamstrings'] },
  },
  {
    id: 'elliptical', name: '橢圓機', category: 'cardio', type: 'cardio', met: 5.5,
    muscles: { primary: ['quads', 'hamstrings'], secondary: ['calves', 'core', 'glutes'] },
  },
  {
    id: 'stair_climbing', name: '爬樓梯', category: 'cardio', type: 'cardio', met: 8.0,
    muscles: { primary: ['quads', 'glutes', 'calves'], secondary: ['hamstrings', 'core'] },
  },
  {
    id: 'power_walking', name: '健走', category: 'cardio', type: 'cardio', met: 5.0,
    muscles: { primary: ['quads', 'calves', 'glutes'], secondary: ['hamstrings', 'core'] },
  },
  {
    id: 'hiking', name: '爬山', category: 'cardio', type: 'cardio', met: 6.0,
    muscles: { primary: ['quads', 'glutes', 'calves'], secondary: ['hamstrings', 'core', 'lower_back'] },
  },
  {
    id: 'hiit', name: 'HIIT', category: 'cardio', type: 'cardio', met: 10.0,
    muscles: {
      primary: ['quads', 'glutes', 'core'],
      secondary: ['hamstrings', 'calves', 'chest', 'shoulders'],
    },
  },
  {
    id: 'aerobics', name: '有氧操', category: 'cardio', type: 'cardio', met: 6.5,
    muscles: { primary: ['quads', 'core'], secondary: ['calves', 'shoulders'] },
  },
  {
    id: 'yoga', name: '瑜珈', category: 'cardio', type: 'cardio', met: 3.0,
    muscles: { primary: ['core', 'lower_back'], secondary: ['shoulders', 'quads', 'hamstrings'] },
  },
  {
    id: 'pilates', name: '皮拉提斯', category: 'cardio', type: 'cardio', met: 3.0,
    muscles: { primary: ['core', 'lower_back', 'glutes'], secondary: ['shoulders'] },
  },

  // ── 胸 ───────────────────────────────────────────────────
  {
    id: 'bench_press', name: '臥推', category: 'chest', type: 'strength', met: 5.0,
    muscles: { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  },
  {
    id: 'incline_press', name: '上斜臥推', category: 'chest', type: 'strength', met: 5.0,
    muscles: { primary: ['chest', 'shoulders'], secondary: ['triceps'] },
  },
  {
    id: 'decline_press', name: '下斜臥推', category: 'chest', type: 'strength', met: 5.0,
    muscles: { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  },
  {
    id: 'dumbbell_fly', name: '啞鈴飛鳥', category: 'chest', type: 'strength', met: 4.0,
    muscles: { primary: ['chest'], secondary: ['shoulders'] },
  },
  {
    id: 'pushup', name: '伏地挺身', category: 'chest', type: 'strength', met: 5.0,
    muscles: { primary: ['chest'], secondary: ['triceps', 'shoulders', 'core'] },
  },
  {
    id: 'dips', name: '雙槓撐體', category: 'chest', type: 'strength', met: 5.0,
    muscles: { primary: ['chest', 'triceps'], secondary: ['shoulders'] },
  },
  {
    id: 'cable_crossover', name: '繩索夾胸', category: 'chest', type: 'strength', met: 4.0,
    muscles: { primary: ['chest'], secondary: ['shoulders'] },
  },
  {
    id: 'db_bench_press', name: '啞鈴臥推', category: 'chest', type: 'strength', met: 5.0,
    muscles: { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  },
  {
    id: 'pec_deck', name: '蝴蝶機夾胸', category: 'chest', type: 'strength', met: 4.0,
    muscles: { primary: ['chest'], secondary: ['shoulders'] },
  },

  // ── 背 ───────────────────────────────────────────────────
  {
    id: 'pullup', name: '引體向上', category: 'back', type: 'strength', met: 5.5,
    muscles: { primary: ['lats', 'upper_back'], secondary: ['biceps', 'core'] },
  },
  {
    id: 'lat_pulldown', name: '下拉', category: 'back', type: 'strength', met: 4.5,
    muscles: { primary: ['lats'], secondary: ['biceps', 'upper_back'] },
  },
  {
    id: 'barbell_row', name: '槓鈴划船', category: 'back', type: 'strength', met: 5.0,
    muscles: { primary: ['upper_back', 'lats'], secondary: ['biceps', 'lower_back'] },
  },
  {
    id: 'dumbbell_row', name: '啞鈴划船', category: 'back', type: 'strength', met: 4.5,
    muscles: { primary: ['upper_back', 'lats'], secondary: ['biceps'] },
  },
  {
    id: 'deadlift', name: '硬舉', category: 'back', type: 'strength', met: 6.0,
    muscles: { primary: ['lower_back', 'glutes', 'hamstrings'], secondary: ['quads', 'lats', 'upper_back'] },
  },
  {
    id: 'good_morning', name: '早安運動', category: 'back', type: 'strength', met: 4.0,
    muscles: { primary: ['lower_back', 'hamstrings'], secondary: ['glutes'] },
  },
  {
    id: 'rear_delt_fly', name: '俯身側平舉', category: 'back', type: 'strength', met: 3.5,
    muscles: { primary: ['upper_back', 'shoulders'], secondary: ['lats'] },
  },
  {
    id: 'cable_row', name: '坐姿划船', category: 'back', type: 'strength', met: 4.5,
    muscles: { primary: ['upper_back', 'lats'], secondary: ['biceps', 'lower_back'] },
  },
  {
    id: 'tbar_row', name: 'T槓划船', category: 'back', type: 'strength', met: 5.0,
    muscles: { primary: ['upper_back', 'lats'], secondary: ['biceps', 'lower_back'] },
  },
  {
    id: 'face_pull', name: '臉拉', category: 'back', type: 'strength', met: 3.5,
    muscles: { primary: ['upper_back', 'shoulders'], secondary: [] },
  },

  // ── 肩 ───────────────────────────────────────────────────
  {
    id: 'overhead_press', name: '肩推', category: 'shoulders', type: 'strength', met: 5.0,
    muscles: { primary: ['shoulders'], secondary: ['triceps', 'upper_back'] },
  },
  {
    id: 'db_shoulder_press', name: '啞鈴肩推', category: 'shoulders', type: 'strength', met: 4.5,
    muscles: { primary: ['shoulders'], secondary: ['triceps'] },
  },
  {
    id: 'lateral_raise', name: '側平舉', category: 'shoulders', type: 'strength', met: 3.5,
    muscles: { primary: ['shoulders'], secondary: ['upper_back'] },
  },
  {
    id: 'front_raise', name: '前平舉', category: 'shoulders', type: 'strength', met: 3.5,
    muscles: { primary: ['shoulders'], secondary: ['chest'] },
  },
  {
    id: 'arnold_press', name: '阿諾德推舉', category: 'shoulders', type: 'strength', met: 5.0,
    muscles: { primary: ['shoulders'], secondary: ['triceps', 'upper_back'] },
  },
  {
    id: 'shrugs', name: '聳肩', category: 'shoulders', type: 'strength', met: 3.5,
    muscles: { primary: ['upper_back'], secondary: ['shoulders', 'forearms'] },
  },
  {
    id: 'upright_row', name: '直立划船', category: 'shoulders', type: 'strength', met: 4.0,
    muscles: { primary: ['shoulders'], secondary: ['upper_back', 'biceps'] },
  },

  // ── 手臂 ─────────────────────────────────────────────────
  {
    id: 'bicep_curl', name: '二頭彎舉', category: 'arms', type: 'strength', met: 4.0,
    muscles: { primary: ['biceps'], secondary: ['forearms'] },
  },
  {
    id: 'hammer_curl', name: '錘式彎舉', category: 'arms', type: 'strength', met: 4.0,
    muscles: { primary: ['biceps', 'forearms'], secondary: [] },
  },
  {
    id: 'tricep_pushdown', name: '三頭下壓', category: 'arms', type: 'strength', met: 4.0,
    muscles: { primary: ['triceps'], secondary: [] },
  },
  {
    id: 'overhead_tricep', name: '過頭三頭伸展', category: 'arms', type: 'strength', met: 4.0,
    muscles: { primary: ['triceps'], secondary: ['shoulders'] },
  },
  {
    id: 'closegrip_bench', name: '窄距臥推', category: 'arms', type: 'strength', met: 5.0,
    muscles: { primary: ['triceps', 'chest'], secondary: ['shoulders'] },
  },
  {
    id: 'reverse_curl', name: '反握彎舉', category: 'arms', type: 'strength', met: 3.5,
    muscles: { primary: ['forearms', 'biceps'], secondary: [] },
  },
  {
    id: 'preacher_curl', name: '牧師椅彎舉', category: 'arms', type: 'strength', met: 4.0,
    muscles: { primary: ['biceps'], secondary: ['forearms'] },
  },
  {
    id: 'barbell_curl', name: '槓鈴彎舉', category: 'arms', type: 'strength', met: 4.0,
    muscles: { primary: ['biceps'], secondary: ['forearms'] },
  },
  {
    id: 'concentration_curl', name: '集中彎舉', category: 'arms', type: 'strength', met: 3.5,
    muscles: { primary: ['biceps'], secondary: ['forearms'] },
  },
  {
    id: 'skull_crusher', name: '法式彎舉', category: 'arms', type: 'strength', met: 4.0,
    muscles: { primary: ['triceps'], secondary: [] },
  },

  // ── 腿 ───────────────────────────────────────────────────
  {
    id: 'squat', name: '深蹲', category: 'legs', type: 'strength', met: 6.0,
    muscles: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'lower_back', 'core'] },
  },
  {
    id: 'front_squat', name: '前蹲', category: 'legs', type: 'strength', met: 6.0,
    muscles: { primary: ['quads', 'core'], secondary: ['glutes', 'hamstrings'] },
  },
  {
    id: 'bulgarian_squat', name: '保加利亞分腿蹲', category: 'legs', type: 'strength', met: 5.5,
    muscles: { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  },
  {
    id: 'leg_press', name: '腿推', category: 'legs', type: 'strength', met: 5.0,
    muscles: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves'] },
  },
  {
    id: 'lunge', name: '弓步蹲', category: 'legs', type: 'strength', met: 5.0,
    muscles: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves'] },
  },
  {
    id: 'leg_curl', name: '腿彎舉', category: 'legs', type: 'strength', met: 4.0,
    muscles: { primary: ['hamstrings'], secondary: ['glutes', 'calves'] },
  },
  {
    id: 'leg_extension', name: '腿伸展', category: 'legs', type: 'strength', met: 4.0,
    muscles: { primary: ['quads'], secondary: [] },
  },
  {
    id: 'calf_raise', name: '小腿提踵', category: 'legs', type: 'strength', met: 3.5,
    muscles: { primary: ['calves'], secondary: [] },
  },
  {
    id: 'rdl', name: '羅馬尼亞硬舉', category: 'legs', type: 'strength', met: 5.5,
    muscles: { primary: ['hamstrings', 'glutes'], secondary: ['lower_back'] },
  },
  {
    id: 'sumo_deadlift', name: '相撲硬舉', category: 'legs', type: 'strength', met: 6.0,
    muscles: { primary: ['quads', 'glutes'], secondary: ['lower_back', 'hamstrings'] },
  },
  {
    id: 'step_up', name: '登台', category: 'legs', type: 'strength', met: 5.0,
    muscles: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves'] },
  },
  {
    id: 'hip_thrust', name: '臀推', category: 'legs', type: 'strength', met: 5.5,
    muscles: { primary: ['glutes'], secondary: ['hamstrings', 'lower_back'] },
  },
  {
    id: 'goblet_squat', name: '高腳杯深蹲', category: 'legs', type: 'strength', met: 5.5,
    muscles: { primary: ['quads', 'glutes'], secondary: ['core', 'hamstrings'] },
  },
  {
    id: 'hack_squat', name: '哈克深蹲', category: 'legs', type: 'strength', met: 6.0,
    muscles: { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  },

  // ── 核心 ─────────────────────────────────────────────────
  {
    id: 'situp', name: '仰臥起坐', category: 'core', type: 'strength', met: 5.5,
    muscles: { primary: ['core'], secondary: [] },
  },
  {
    id: 'crunch', name: '捲腹', category: 'core', type: 'strength', met: 4.5,
    muscles: { primary: ['core'], secondary: [] },
  },
  {
    id: 'plank', name: '棒式', category: 'core', type: 'strength', met: 4.0,
    muscles: { primary: ['core', 'lower_back'], secondary: ['shoulders'] },
  },
  {
    id: 'side_plank', name: '側棒式', category: 'core', type: 'strength', met: 4.0,
    muscles: { primary: ['core'], secondary: ['shoulders'] },
  },
  {
    id: 'russian_twist', name: '俄羅斯旋轉', category: 'core', type: 'strength', met: 5.0,
    muscles: { primary: ['core'], secondary: ['shoulders'] },
  },
  {
    id: 'hanging_leg_raise', name: '懸吊舉腿', category: 'core', type: 'strength', met: 5.0,
    muscles: { primary: ['core'], secondary: ['lats'] },
  },
  {
    id: 'back_extension', name: '背伸展', category: 'core', type: 'strength', met: 4.0,
    muscles: { primary: ['lower_back', 'glutes'], secondary: ['hamstrings'] },
  },
  {
    id: 'farmers_walk', name: '農夫走路', category: 'core', type: 'strength', met: 5.5,
    muscles: { primary: ['forearms', 'core'], secondary: ['lower_back', 'quads'] },
  },

  // ── Hammer Strength 機械 ─────────────────────────────────
  // 胸
  {
    id: 'hs_chest_press', name: 'HS 胸推', category: 'chest', type: 'strength', met: 5.0,
    muscles: { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  },
  {
    id: 'hs_incline_press', name: 'HS 上斜胸推', category: 'chest', type: 'strength', met: 5.0,
    muscles: { primary: ['chest', 'shoulders'], secondary: ['triceps'] },
  },
  {
    id: 'hs_decline_press', name: 'HS 下斜胸推', category: 'chest', type: 'strength', met: 5.0,
    muscles: { primary: ['chest'], secondary: ['triceps'] },
  },
  {
    id: 'hs_iso_chest_press', name: 'HS ISO 胸推', category: 'chest', type: 'strength', met: 5.0,
    muscles: { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  },
  // 背
  {
    id: 'hs_iso_row', name: 'HS ISO 划船', category: 'back', type: 'strength', met: 5.0,
    muscles: { primary: ['upper_back', 'lats'], secondary: ['biceps', 'lower_back'] },
  },
  {
    id: 'hs_high_row', name: 'HS 高位划船', category: 'back', type: 'strength', met: 5.0,
    muscles: { primary: ['upper_back', 'lats'], secondary: ['biceps'] },
  },
  {
    id: 'hs_low_row', name: 'HS 低位划船', category: 'back', type: 'strength', met: 5.0,
    muscles: { primary: ['lats', 'lower_back'], secondary: ['biceps', 'upper_back'] },
  },
  {
    id: 'hs_lat_pulldown', name: 'HS 下拉', category: 'back', type: 'strength', met: 4.5,
    muscles: { primary: ['lats'], secondary: ['biceps', 'upper_back'] },
  },
  {
    id: 'hs_pullover', name: 'HS 直臂下拉', category: 'back', type: 'strength', met: 4.5,
    muscles: { primary: ['lats'], secondary: ['chest', 'core'] },
  },
  // 肩
  {
    id: 'hs_shoulder_press', name: 'HS 肩推', category: 'shoulders', type: 'strength', met: 5.0,
    muscles: { primary: ['shoulders'], secondary: ['triceps', 'upper_back'] },
  },
  {
    id: 'hs_iso_shoulder_press', name: 'HS ISO 肩推', category: 'shoulders', type: 'strength', met: 5.0,
    muscles: { primary: ['shoulders'], secondary: ['triceps'] },
  },
  // 腿
  {
    id: 'hs_leg_press', name: 'HS 腿推', category: 'legs', type: 'strength', met: 5.0,
    muscles: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves'] },
  },
  {
    id: 'hs_seated_leg_curl', name: 'HS 坐姿腿彎舉', category: 'legs', type: 'strength', met: 4.0,
    muscles: { primary: ['hamstrings'], secondary: ['calves'] },
  },
  {
    id: 'hs_lying_leg_curl', name: 'HS 俯臥腿彎舉', category: 'legs', type: 'strength', met: 4.0,
    muscles: { primary: ['hamstrings'], secondary: ['calves', 'glutes'] },
  },
  {
    id: 'hs_leg_extension', name: 'HS 腿伸展', category: 'legs', type: 'strength', met: 4.0,
    muscles: { primary: ['quads'], secondary: [] },
  },
  {
    id: 'hs_hip_adductor', name: 'HS 內收肌', category: 'legs', type: 'strength', met: 3.5,
    muscles: { primary: ['quads'], secondary: ['glutes'] },
  },
  {
    id: 'hs_hip_abductor', name: 'HS 外展肌', category: 'legs', type: 'strength', met: 3.5,
    muscles: { primary: ['glutes'], secondary: ['quads'] },
  },
  // 手臂
  {
    id: 'hs_bicep_curl', name: 'HS 二頭彎舉', category: 'arms', type: 'strength', met: 4.0,
    muscles: { primary: ['biceps'], secondary: ['forearms'] },
  },
  {
    id: 'hs_tricep_press', name: 'HS 三頭推', category: 'arms', type: 'strength', met: 4.0,
    muscles: { primary: ['triceps'], secondary: ['shoulders'] },
  },
  {
    id: 'hs_dip', name: 'HS 撐體', category: 'arms', type: 'strength', met: 5.0,
    muscles: { primary: ['triceps', 'chest'], secondary: ['shoulders'] },
  },
];

/**
 * Common synonyms / alternate names (incl. English and 大陸用語) keyed by
 * exercise id. Used by matchExercise() so freeform names like 滑輪下拉、
 * 繩索下壓、臀橋、bench press still resolve to the right entry — which is
 * what drives the muscle heatmap and the MET value for calorie estimates.
 */
const EXERCISE_ALIASES = {
  // 胸
  bench_press:      '槓鈴臥推,平板臥推,平板推舉,卧推,bench press',
  incline_press:    '上斜胸推,上胸推,incline press,incline bench',
  decline_press:    '下斜胸推,decline press',
  dumbbell_fly:     '飛鳥,平板飛鳥,dumbbell fly,fly',
  pushup:           '俯臥撑,伏立挺身,push up,pushup',
  dips:             '雙槓,撐體,臂屈伸,dips,dip',
  cable_crossover:  '滑輪夾胸,繩索交叉,夾胸,cable crossover,cable fly',
  db_bench_press:   '啞鈴平板臥推,dumbbell bench press,dumbbell press',
  pec_deck:         '蝴蝶機,夾胸機,pec deck',
  // 背
  pullup:           '引體,拉單槓,單槓,pull up,pullup,chin up',
  lat_pulldown:     '滑輪下拉,高位下拉,坐姿下拉,背闊下拉,lat pulldown,pulldown',
  barbell_row:      '俯身划船,barbell row,bent over row',
  dumbbell_row:     '單臂划船,單手划船,dumbbell row',
  deadlift:         '硬拉,傳統硬舉,deadlift',
  cable_row:        '滑輪划船,坐姿滑輪划船,seated row,cable row',
  tbar_row:         'T槓,T-bar row,t bar row',
  face_pull:        'face pull,臉部拉引,面拉',
  good_morning:     'good morning,早安式',
  rear_delt_fly:    '反向飛鳥,後三角飛鳥,reverse fly,rear delt fly',
  // 肩
  overhead_press:   '推舉,肩上推舉,軍事推舉,站姿肩推,槓鈴肩推,overhead press,ohp,military press',
  db_shoulder_press:'啞鈴推舉,坐姿啞鈴肩推,dumbbell shoulder press',
  lateral_raise:    '啞鈴側平舉,側飛鳥,lateral raise,side raise',
  front_raise:      '啞鈴前平舉,front raise',
  arnold_press:     '阿諾推舉,arnold press',
  shrugs:           '槓鈴聳肩,啞鈴聳肩,shrug,shrugs',
  upright_row:      'upright row,直立上拉',
  // 手臂
  bicep_curl:       '彎舉,啞鈴彎舉,二頭肌彎舉,bicep curl,biceps curl,curl',
  hammer_curl:      '錘式,槌式彎舉,hammer curl',
  tricep_pushdown:  '繩索下壓,三頭肌下壓,滑輪下壓,下壓,tricep pushdown,pushdown',
  overhead_tricep:  '三頭伸展,法式推舉,過頭伸展,overhead tricep extension,tricep extension',
  closegrip_bench:  '窄握臥推,窄推,close grip bench',
  reverse_curl:     'reverse curl,反向彎舉',
  preacher_curl:    '牧師彎舉,preacher curl',
  barbell_curl:     '槓鈴二頭彎舉,barbell curl',
  concentration_curl: '集中二頭彎舉,concentration curl',
  skull_crusher:    '仰臥三頭伸展,碎顱者,skull crusher',
  // 腿
  squat:            '槓鈴深蹲,背蹲舉,back squat,squat',
  front_squat:      '前蹲舉,front squat',
  bulgarian_squat:  '保加利亞蹲,分腿蹲,後腳抬高蹲,bulgarian split squat,split squat',
  leg_press:        '腿舉,腿部推蹬,蹬腿,倒蹬,leg press',
  lunge:            '弓箭步,前弓步,行走弓步,lunge,lunges',
  leg_curl:         '腿後彎舉,腿部彎舉,leg curl',
  leg_extension:    '腿部伸展,腿屈伸,leg extension',
  calf_raise:       '提踵,舉踵,站姿提踵,calf raise',
  rdl:              'rdl,羅馬尼亞硬拉,直腿硬舉,romanian deadlift',
  sumo_deadlift:    '相撲硬拉,sumo deadlift',
  step_up:          '登階,踏板,step up',
  hip_thrust:       '臀橋,橋式,臀衝,hip thrust',
  goblet_squat:     'goblet squat',
  hack_squat:       'hack squat',
  // 核心
  situp:            'sit up,situp',
  crunch:           '腹部捲曲,捲腹運動,crunch,crunches',
  plank:            '平板支撐,棒式支撐,plank',
  side_plank:       '側平板,側棒,side plank',
  russian_twist:    '俄式轉體,russian twist',
  hanging_leg_raise:'舉腿,懸垂舉腿,leg raise,hanging leg raise',
  back_extension:   '羅馬椅,山羊挺身,back extension,hyperextension',
  farmers_walk:     '農夫行走,提壺行走,farmer walk,farmers walk,farmer carry',
};

const EX_STRIP_RE = /[\s\d０-９.,，、。()（）×*~＋+kg公斤磅組次分鐘的-]/g;
function normalizeExName(s) {
  return String(s || '').toLowerCase().replace(EX_STRIP_RE, '');
}

// Longest common contiguous substring length (0 if < 2)
function commonSubstrLen(a, b) {
  const maxLen = Math.min(a.length, b.length);
  for (let len = maxLen; len >= 2; len--) {
    for (let i = 0; i + len <= a.length; i++) {
      if (b.includes(a.slice(i, i + len))) return len;
    }
  }
  return 0;
}

/**
 * Match a freeform exercise name to the database. Scored:
 *   exact (name or alias) > containment (longer match wins) > shared
 *   substring >= 2 chars. Falls back to the Compendium activity list
 *   (球類/武術/戶外/日常活動) when nothing in EXERCISES fits.
 */
export function matchExercise(name) {
  const n = normalizeExName(name);
  if (!n) return null;

  let best = null;
  let bestScore = 0;
  for (const e of EXERCISES) {
    const candidates = [e.name, ...(EXERCISE_ALIASES[e.id]?.split(',') ?? [])]
      .map(normalizeExName)
      .filter(Boolean);
    for (const c of candidates) {
      let score = 0;
      if (c === n)                          score = 1000;
      else if (n.includes(c))               score = 100 + c.length * 2;
      else if (c.includes(n) && n.length >= 2) score = 100 + n.length * 2;
      else                                  score = commonSubstrLen(n, c);
      if (score > bestScore) { bestScore = score; best = e; }
    }
  }
  if (best) return best;
  return matchCompendium(name);
}

/**
 * Estimate calories burned for an exercise.
 *
 * - Cardio (or strength with no set data): time-based formula
 *     calories = MET × bodyweight(kg) × hours
 * - Strength with sets: the time-based baseline is scaled by an
 *   intensity multiplier derived from total tonnage (Σ reps×effective
 *   weight) relative to bodyweight, so changing reps, sets, or weight
 *   ALL move the result:
 *     · no duration entered → estimated as 3.5 min per set (work + rest)
 *     · empty/0 weight (bodyweight moves like 伏地挺身/引體向上) counts
 *       as ~60% of bodyweight per rep, so reps still matter
 *     · intensity = min(3.0, 0.75 + totalVolume / (bodyweight × 60))
 *       — the cap is high enough that normal sessions never clip
 */
export function estimateCalories({ met = 5, weightKg = 65, durationMin = 0, sets = [], type = 'strength' }) {
  const validSets = (sets || []).filter(s => (Number(s.reps) || 0) > 0);

  let mins = Number(durationMin) || 0;
  if (type !== 'cardio' && mins === 0 && validSets.length > 0) {
    mins = validSets.length * 3.5;
  }
  const base = (met || 5) * weightKg * (mins / 60);

  if (type === 'cardio' || validSets.length === 0) {
    return Math.round(base);
  }

  const totalVolume = validSets.reduce((sum, set) => {
    const reps = Number(set.reps) || 0;
    const w = Number(set.weight) || 0;
    return sum + reps * (w > 0 ? w : weightKg * 0.6);
  }, 0);
  const intensity = Math.min(3, 0.75 + totalVolume / (weightKg * 60));
  return Math.round(base * intensity);
}

/**
 * Calculate muscle intensities from a list of exercise log entries.
 * Returns { [muscleId]: number } where number is cumulative intensity.
 */
export function calcMuscleIntensities(exerciseList) {
  const intensities = {};

  for (const ex of exerciseList) {
    if (!ex.muscles) continue;
    const { primary = [], secondary = [] } = ex.muscles;

    let primaryScore = 0;
    let secondaryScore = 0;

    if (ex.type === 'cardio') {
      // Cardio: intensity based on duration (minutes)
      const mins = ex.duration || 0;
      primaryScore   = mins * 10;
      secondaryScore = mins * 5;
    } else {
      // Strength: intensity based on volume = Σ(reps × weight) across all sets
      if (ex.sets && ex.sets.length > 0) {
        const volume = ex.sets.reduce((s, set) => s + (set.reps || 0) * (set.weight || 0), 0);
        primaryScore   = volume;
        secondaryScore = volume * 0.5;
      } else {
        // Fallback: no sets recorded yet
        primaryScore   = 100;
        secondaryScore = 50;
      }
    }

    for (const m of primary)   intensities[m] = (intensities[m] || 0) + primaryScore;
    for (const m of secondary) intensities[m] = (intensities[m] || 0) + secondaryScore;
  }

  return intensities;
}

/** Map intensity number → color string (null = no color) */
export function intensityColor(value) {
  if (!value || value < 1) return null;
  if (value < 300)  return '#FEF08A'; // yellow-300
  if (value < 800)  return '#FB923C'; // orange-400
  return '#EF4444';                   // red-500
}
