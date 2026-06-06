/**
 * Mifflin-St Jeor BMR formula (more accurate than Harris-Benedict)
 * weight: kg, height: cm, age: years
 */
export function calcBMR(gender, weight, height, age) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

export function calcTDEE(bmr, activity) {
  return Math.round(bmr * activity);
}

export function calcBMI(weight, height) {
  const m = height / 100;
  return +(weight / (m * m)).toFixed(1);
}

export function bmiLabel(bmi) {
  if (bmi < 18.5) return { label: '體重過輕', color: 'text-blue-500',   bg: 'bg-blue-50'   };
  if (bmi < 24)   return { label: '正常體重', color: 'text-green-500',  bg: 'bg-green-50'  };
  if (bmi < 27)   return { label: '過重',     color: 'text-amber-500',  bg: 'bg-amber-50'  };
  if (bmi < 30)   return { label: '輕度肥胖', color: 'text-orange-500', bg: 'bg-orange-50' };
  return                  { label: '中重度肥胖', color: 'text-red-500', bg: 'bg-red-50'    };
}

export const ACTIVITY_LEVELS = [
  { value: 1.2,   label: '久坐',     desc: '幾乎不運動'       },
  { value: 1.375, label: '輕度活動', desc: '每週 1–3 天'      },
  { value: 1.55,  label: '中度活動', desc: '每週 3–5 天'      },
  { value: 1.725, label: '高度活動', desc: '每週 6–7 天'      },
  { value: 1.9,   label: '極度活動', desc: '體力勞動或每天訓練' },
];
