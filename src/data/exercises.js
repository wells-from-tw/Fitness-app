/**
 * WiseFitness Exercise Database
 * MET values from Compendium of Physical Activities (2011)
 * Muscle groups: chest, shoulders, biceps, triceps, forearms,
 *   core, lats, upper_back, lower_back, glutes, quads, hamstrings, calves
 */

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
];

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
