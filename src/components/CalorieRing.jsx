export default function CalorieRing({ consumed, burned = 0, goal }) {
  const net       = Math.max(0, consumed - burned);
  const remaining = Math.max(0, goal - net);
  const overLimit = net > goal;
  const pct       = Math.min(net / goal, 1);
  const fillPct   = pct * 100;

  const size = 210;

  const fillGradient = overLimit
    ? 'linear-gradient(to top, #7f1d1d, #dc2626, #f87171)'
    : 'linear-gradient(to top, #7c2d12 0%, #ea580c 35%, #f97316 65%, #fbbf24 88%, #fef08a 100%)';

  const waveColor1 = overLimit ? '#f87171' : '#fef08a';
  const waveColor2 = overLimit ? '#ef4444' : '#f97316';

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Circle */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#111',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: fillPct > 5
            ? `0 0 32px ${overLimit ? 'rgba(239,68,68,0.35)' : 'rgba(249,115,22,0.3)'}`
            : 'none',
        }}
      >
        {/* Flame fill */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${Math.max(fillPct, 1.5)}%`,
            background: fillGradient,
            transition: 'height 0.8s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Wave at flame tip */}
          <svg
            style={{ position: 'absolute', top: -28, left: 0, width: '100%', height: 30, willChange: 'transform' }}
            viewBox="0 0 210 30"
            preserveAspectRatio="none"
          >
            <path
              style={{ animation: 'flame-wave1 1.8s ease-in-out infinite', willChange: 'transform', transformOrigin: 'center' }}
              fill={waveColor1}
              fillOpacity="0.9"
              d="M0,20 Q26,2 52,18 Q78,32 104,15 Q130,2 156,18 Q182,32 210,15 L210,30 L0,30 Z"
            />
            <path
              style={{ animation: 'flame-wave2 2.3s ease-in-out infinite', willChange: 'transform', transformOrigin: 'center' }}
              fill={waveColor2}
              fillOpacity="0.7"
              d="M0,16 Q35,4 70,20 Q105,32 140,14 Q175,2 210,18 L210,30 L0,30 Z"
            />
          </svg>
        </div>

        {/* Number overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            className="animate-calorie-pulse"
            style={{
              fontSize: 46,
              fontWeight: 700,
              letterSpacing: '-2px',
              lineHeight: 1,
              color: fillPct > 48 ? '#fff' : '#f8f8f8',
              textShadow: fillPct > 15 ? '0 2px 10px rgba(0,0,0,0.6)' : 'none',
            }}
          >
            {overLimit ? `+${net - goal}` : remaining}
          </span>
          <span
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginTop: 6,
              color: fillPct > 48 ? 'rgba(255,255,255,0.65)' : 'rgba(160,160,160,0.8)',
            }}
          >
            {overLimit ? '超出' : '剩餘 kcal'}
          </span>
        </div>

        {/* % badge */}
        <div style={{ position: 'absolute', top: 14, right: 18 }}>
          <span style={{ fontSize: 11, color: fillPct > 70 ? 'rgba(255,255,255,0.5)' : 'rgba(120,120,120,0.7)', fontWeight: 600 }}>
            {Math.round(fillPct)}%
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex w-full justify-between px-1">
        <StatBadge label="攝取"  value={consumed}           color="text-gray-800 dark:text-gray-100" />
        {burned > 0 && <StatBadge label="消耗" value={`-${burned}`} color="text-orange-400" />}
        <StatBadge label="目標"  value={goal}               color="text-gray-400 dark:text-gray-600" />
        <StatBadge label="剩餘"  value={remaining}          color={overLimit ? 'text-red-400' : 'text-gray-600 dark:text-gray-400'} />
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-base font-semibold ${color}`}>{value}</span>
      <span className="text-[11px] text-gray-400 dark:text-gray-600 tracking-wide">{label}</span>
    </div>
  );
}
