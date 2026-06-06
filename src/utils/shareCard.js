/**
 * Generate today's progress share card as a PNG data URL.
 * Drawn on an off-screen canvas at 2× DPR for retina quality.
 */
export async function generateShareCard({
  date,
  calories, goalCalories, burned,
  protein,  goalProtein,
  carbs,    goalCarbs,
  fat,      goalFat,
  waterCups, waterGoal,
  weight,
}) {
  const W = 375, H = 520;
  const DPR = 2;
  const canvas = document.createElement('canvas');
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  // ── background ──────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, W, H, 0);
  ctx.fill();

  // subtle top glow
  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 260);
  glow.addColorStop(0, 'rgba(99,102,241,0.25)');
  glow.addColorStop(1, 'rgba(99,102,241,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── header ───────────────────────────────────────────────────
  ctx.fillStyle = '#6366f1';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('Fitness', 24, 24);

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(date, W - 24, 28);
  ctx.textAlign = 'left';

  // ── calorie ring ─────────────────────────────────────────────
  const CX = W / 2, CY = 195, R = 88, SW = 14;
  const net = Math.max(calories - burned, 0);
  const pct = Math.min(net / goalCalories, 1);

  // track
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = SW;
  ctx.stroke();

  // burned arc (outer thin)
  if (burned > 0) {
    const burnedPct = Math.min(burned / goalCalories, 1);
    ctx.beginPath();
    ctx.arc(CX, CY, R + SW / 2 + 4, -Math.PI / 2, -Math.PI / 2 + burnedPct * Math.PI * 2);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // progress arc
  if (pct > 0) {
    const arcGrad = ctx.createLinearGradient(CX - R, CY, CX + R, CY);
    arcGrad.addColorStop(0, '#6366f1');
    arcGrad.addColorStop(1, '#a78bfa');
    ctx.beginPath();
    ctx.arc(CX, CY, R, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth = SW;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // center text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(net, CX, CY - 12);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('/ ' + goalCalories + ' kcal', CX, CY + 16);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('淨攝入', CX, CY + 36);

  // ── quick stats row ──────────────────────────────────────────
  const ROW1_Y = 305;
  drawStat(ctx, W * 0.25, ROW1_Y, '攝入', calories + ' kcal', '#a78bfa');
  drawStat(ctx, W * 0.75, ROW1_Y, '消耗', burned + ' kcal', '#f97316');

  // divider
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, 335);
  ctx.lineTo(W - 24, 335);
  ctx.stroke();

  // ── macros ───────────────────────────────────────────────────
  const MACRO_TOP = 352;
  const macros = [
    { label: '蛋白質', val: protein, goal: goalProtein, color: '#34d399' },
    { label: '碳水',   val: carbs,   goal: goalCarbs,   color: '#60a5fa' },
    { label: '脂肪',   val: fat,     goal: goalFat,     color: '#f472b6' },
  ];
  const BAR_X = 92, BAR_W = W - BAR_X - 70, BAR_H = 6, BAR_GAP = 26;

  macros.forEach(({ label, val, goal, color }, i) => {
    const y = MACRO_TOP + i * BAR_GAP;
    // label
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(label, 24, y + BAR_H / 2);
    // track
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, BAR_X, y, BAR_W, BAR_H, 3);
    ctx.fill();
    // fill
    const fillW = goal > 0 ? Math.min(val / goal, 1) * BAR_W : 0;
    ctx.fillStyle = color;
    roundRect(ctx, BAR_X, y, fillW, BAR_H, 3);
    ctx.fill();
    // value
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(Math.round(val) + 'g', W - 24, y + BAR_H / 2);
  });

  // divider
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, MACRO_TOP + 3 * BAR_GAP + 8);
  ctx.lineTo(W - 24, MACRO_TOP + 3 * BAR_GAP + 8);
  ctx.stroke();

  // ── water + weight row ───────────────────────────────────────
  const ROW2_Y = MACRO_TOP + 3 * BAR_GAP + 24;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // water
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('💧', W * 0.22, ROW2_Y);
  ctx.fillStyle = '#60a5fa';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(waterCups + '/' + waterGoal + ' 杯', W * 0.36, ROW2_Y);

  if (weight) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('⚖️', W * 0.62, ROW2_Y);
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(weight + ' kg', W * 0.76, ROW2_Y);
  }

  // ── footer ───────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Fitness · 今日進度', W / 2, H - 20);

  return canvas.toDataURL('image/png');
}

/**
 * Generate today's training share card as a PNG data URL.
 * @param {object}    opts
 * @param {string}    opts.date
 * @param {object[]}  opts.log
 * @param {number}    opts.totalBurned
 * @param {object}    opts.muscleIntensities
 * @param {object}    opts.muscleLabels
 * @param {function}  opts.intensityColor
 * @param {SVGElement} [opts.frontSvgEl]  - anterior SVG DOM node from react-body-highlighter
 * @param {SVGElement} [opts.backSvgEl]   - posterior SVG DOM node
 */
export async function generateTrainingCard({
  date, log, totalBurned, muscleIntensities, muscleLabels, intensityColor,
  frontSvgEl, backSvgEl,
}) {
  const W = 375, H = 580, DPR = 2;
  const canvas = document.createElement('canvas');
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  // background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0c0a09');
  bg.addColorStop(1, '#1c1008');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // glow
  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 240);
  glow.addColorStop(0, 'rgba(249,115,22,0.2)');
  glow.addColorStop(1, 'rgba(249,115,22,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── header ───────────────────────────────────────────────────
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('Fitness', 24, 22);

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(date, W - 24, 26);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(249,115,22,0.18)';
  roundRect(ctx, 24, 52, 100, 24, 12);
  ctx.fill();
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏋️ 今日訓練', 34, 64);

  // ── top stats ────────────────────────────────────────────────
  const totalDuration = log.reduce((s, e) => s + (e.duration || 0), 0);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(totalBurned, W / 2, 122);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('kcal 消耗', W / 2, 158);

  drawStat(ctx, W * 0.25, 186, '運動項目', log.length + ' 項', '#fb923c');
  drawStat(ctx, W * 0.75, 186, '總時間', totalDuration + ' 分鐘', '#fbbf24');

  // divider
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(24, 214); ctx.lineTo(W - 24, 214); ctx.stroke();

  // ── split: exercise list (left) + heatmaps (right) ──────────
  const SPLIT_TOP = 224;
  const HMAP_W    = 76;   // each heatmap SVG width
  const HMAP_H    = 152;  // each heatmap SVG height (1:2 ratio)
  const HMAP_GAP  = 8;
  const RIGHT_X   = W - 24 - HMAP_W * 2 - HMAP_GAP; // x start of right block
  const LIST_W    = RIGHT_X - 24 - 8;                 // width available for exercise list

  // heatmap label
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
  const heatLabelY = SPLIT_TOP;
  ctx.fillText('正面', RIGHT_X + HMAP_W / 2, heatLabelY);
  ctx.fillText('背面', RIGHT_X + HMAP_W + HMAP_GAP + HMAP_W / 2, heatLabelY);

  const SVG_Y = SPLIT_TOP + 14;

  // draw front heatmap
  if (frontSvgEl) {
    try {
      const img = await svgToImage(frontSvgEl, HMAP_W, HMAP_H);
      ctx.drawImage(img, RIGHT_X, SVG_Y, HMAP_W, HMAP_H);
    } catch (e) { /* skip if serialization fails */ }
  }

  // draw back heatmap
  if (backSvgEl) {
    try {
      const img = await svgToImage(backSvgEl, HMAP_W, HMAP_H);
      ctx.drawImage(img, RIGHT_X + HMAP_W + HMAP_GAP, SVG_Y, HMAP_W, HMAP_H);
    } catch (e) { /* skip */ }
  }

  // exercise list
  const ITEM_H = 34, shown = log.slice(0, 5);
  shown.forEach((entry, i) => {
    const y = SPLIT_TOP + i * ITEM_H;
    ctx.fillStyle = 'rgba(249,115,22,0.09)';
    roundRect(ctx, 24, y, LIST_W, ITEM_H - 4, 7);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    const nameLabel = entry.type === 'strength' && entry.sets?.length
      ? `${entry.name}  ${entry.sets.length}組`
      : `${entry.name}  ${entry.duration ?? 0}分`;
    // truncate if needed
    const maxW = LIST_W - 56;
    let dispName = nameLabel;
    while (ctx.measureText(dispName).width > maxW && dispName.length > 4) {
      dispName = dispName.slice(0, -1);
    }
    ctx.fillText(dispName, 32, y + (ITEM_H - 4) / 2);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('-' + entry.calories, 24 + LIST_W - 4, y + (ITEM_H - 4) / 2);
  });
  if (log.length > 5) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`+${log.length - 5} 項…`, 28, SPLIT_TOP + 5 * ITEM_H + 10);
  }

  // ── muscle chips ─────────────────────────────────────────────
  const CHIP_TOP = SVG_Y + HMAP_H + 18;
  const workedMuscles = Object.entries(muscleIntensities)
    .filter(([, v]) => v && v >= 1)
    .sort((a, b) => b[1] - a[1]);

  if (workedMuscles.length > 0) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('訓練肌群', 24, CHIP_TOP + 8);

    let cx = 76, cy = CHIP_TOP;
    const chipH = 21;
    workedMuscles.forEach(([muscle, val]) => {
      const label = muscleLabels[muscle] ?? muscle;
      const color = intensityColor(val) ?? '#FB923C';
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
      const tw = ctx.measureText(label).width;
      const chipW = tw + 14;
      if (cx + chipW > W - 24) { cx = 76; cy += chipH + 5; }
      ctx.fillStyle = color + '2e';
      roundRect(ctx, cx, cy, chipW, chipH, chipH / 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx + chipW / 2, cy + chipH / 2);
      cx += chipW + 5;
    });
  }

  // ── footer ───────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Fitness · 今日訓練', W / 2, H - 18);

  return canvas.toDataURL('image/png');
}

// ── helpers ──────────────────────────────────────────────────

/** Serialize an SVG DOM element to an HTMLImageElement for drawImage */
function svgToImage(svgEl, w, h) {
  return new Promise((resolve, reject) => {
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', w);
    clone.setAttribute('height', h);
    const str  = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([str], { type: 'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function drawStat(ctx, x, y, label, value, color) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(value, x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(label, x, y + 22);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
