import { useState } from 'react';
import Model from 'react-body-highlighter';

// Map our exercise.js muscle IDs → react-body-highlighter muscle names
const FRONT_MUSCLES = {
  chest:      'chest',
  shoulders:  'front-deltoids',
  biceps:     'biceps',
  triceps:    'triceps',
  forearms:   'forearm',
  core:       'abs',
  quads:      'quadriceps',
  calves:     'calves',
};

const BACK_MUSCLES = {
  shoulders:   'back-deltoids',
  triceps:     'triceps',
  forearms:    'forearm',
  upper_back:  'trapezius',
  lats:        'upper-back',
  lower_back:  'lower-back',
  glutes:      'gluteal',
  hamstrings:  'hamstring',
  calves:      'calves',
};

// Intensity value → 1/2/3 (selects from HIGHLIGHTED_COLORS)
function toFrequency(value) {
  if (!value || value < 1) return 0;
  if (value < 300) return 1;
  if (value < 800) return 2;
  return 3;
}

function buildData(muscleIntensities, muscleMap) {
  return Object.entries(muscleIntensities)
    .map(([muscle, value]) => {
      const rbhName = muscleMap[muscle];
      const freq = toFrequency(value);
      if (!rbhName || freq === 0) return null;
      return { name: muscle, muscles: [rbhName], frequency: freq };
    })
    .filter(Boolean);
}

const COLORS = ['#FEF08A', '#FB923C', '#EF4444'];
const BODY_COLOR = '#E5E7EB';

export default function MuscleHeatmap({ muscleIntensities = {} }) {
  const [flipped, setFlipped] = useState(false);

  const frontData = buildData(muscleIntensities, FRONT_MUSCLES);
  const backData  = buildData(muscleIntensities, BACK_MUSCLES);

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={() => setFlipped(v => !v)}
        className="text-xs font-semibold px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        {flipped ? '← 正面' : '背面 →'}
      </button>

      <div style={{ perspective: '900px', width: 160, height: 390 }}>
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s cubic-bezier(0.4,0.2,0.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Model
              data={frontData}
              type="anterior"
              bodyColor={BODY_COLOR}
              highlightedColors={COLORS}
              style={{ width: 140 }}
            />
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Model
              data={backData}
              type="posterior"
              bodyColor={BODY_COLOR}
              highlightedColors={COLORS}
              style={{ width: 140 }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm border border-gray-200" style={{ background: BODY_COLOR }} />未訓練
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#FEF08A' }} />低
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#FB923C' }} />中
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#EF4444' }} />高
        </span>
      </div>
    </div>
  );
}
