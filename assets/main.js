/* ============================================================
   JuicyTTS marketing site interactions
   ============================================================ */

// ---- Hero animated waveform -------------------------------------
function drawHeroWave() {
  const canvas = document.getElementById('heroWave');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
  }
  resize();
  window.addEventListener('resize', () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    resize();
  });

  let t = 0;
  function frame() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const layers = [
      { amp: 0.55, freq: 0.012, speed: 0.018, color: 'rgba(57, 255, 136, 0.55)', lw: 1.6 },
      { amp: 0.38, freq: 0.020, speed: 0.026, color: 'rgba(167, 139, 250, 0.40)', lw: 1.2 },
      { amp: 0.30, freq: 0.008, speed: 0.012, color: 'rgba(217, 70, 239, 0.30)', lw: 1.0 },
    ];

    layers.forEach((l, i) => {
      ctx.beginPath();
      ctx.lineWidth = l.lw;
      ctx.strokeStyle = l.color;
      for (let x = 0; x < w; x += 2) {
        const env = Math.sin((x / w) * Math.PI); // taper edges
        const y = h / 2
          + Math.sin(x * l.freq + t * l.speed + i) * (h * 0.35) * l.amp * env
          + Math.sin(x * l.freq * 0.5 + t * l.speed * 1.4) * (h * 0.18) * l.amp * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    t += 1;
    requestAnimationFrame(frame);
  }
  frame();
}

// ---- Audition: synthetic preview clips --------------------------
// We render a per-voice "fake" waveform and play a short tone burst
// shaped to mimic speech cadence. This avoids shipping any real audio,
// which is what the user will replace with sample clips later.
const VOICES = [
  { name: 'Aria',     tag: 'warm · neutral',     dur: '0:08', seed: 31, base: 220 },
  { name: 'Kobold',   tag: 'gravel · dramatic',   dur: '0:11', seed: 7,  base: 130 },
  { name: 'Hikari',   tag: 'bright · cheerful',   dur: '0:09', seed: 19, base: 280 },
  { name: 'Solomon',  tag: 'narrator · calm',     dur: '0:13', seed: 47, base: 165 },
  { name: 'Nova',     tag: 'bright · energetic',  dur: '0:07', seed: 53, base: 250 },
  { name: 'Atlas',    tag: 'deep · steady',       dur: '0:12', seed: 89, base: 110 },
];

function makeWaveBars(seed, count = 60) {
  const rnd = mulberry32(seed);
  const bars = [];
  for (let i = 0; i < count; i++) {
    const env = Math.sin((i / count) * Math.PI); // taper edges
    const h = 4 + rnd() * 16 * env + Math.sin(i * 0.3) * 4 * env;
    bars.push(Math.max(2, h));
  }
  return bars;
}
function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildVoiceRows() {
  const host = document.getElementById('voiceRows');
  if (!host) return;
  VOICES.forEach((v, i) => {
    const row = document.createElement('div');
    row.className = 'voice-row';
    row.dataset.idx = i;

    const wave = makeWaveBars(v.seed);
    row.innerHTML = `
      <button class="play-btn" aria-label="Play ${v.name}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="play-icon">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="pause-icon" style="display:none">
          <path d="M6 4h4v16H6zM14 4h4v16h-4z"/>
        </svg>
      </button>
      <div class="voice-meta">
        <div class="voice-name">${v.name} <span class="voice-tag">${v.tag}</span></div>
        <div class="voice-wave">${wave.map(h => `<i style="height:${h}px"></i>`).join('')}</div>
      </div>
      <div class="voice-duration">${v.dur}</div>
    `;
    row.addEventListener('click', () => playVoice(i, row));
    host.appendChild(row);
  });
}

let audioCtx = null;
let currentSource = null;
let currentRow = null;

function getAudioCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  return audioCtx;
}

function playVoice(idx, row) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  // Stop previous
  if (currentSource) { try { currentSource.stop(); } catch (e) {} currentSource = null; }
  if (currentRow && currentRow !== row) clearRowPlaying(currentRow);

  // Toggle if same row
  if (currentRow === row) {
    clearRowPlaying(row);
    currentRow = null;
    return;
  }

  // Build a short formant-y synth that vaguely resembles speech cadence
  const v = VOICES[idx];
  const duration = 2.6;
  const now = ctx.currentTime;

  // Carrier (voice fundamental + 2 formants approximated as filtered saws)
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
  master.gain.setValueAtTime(0.18, now + duration - 0.3);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  master.connect(ctx.destination);

  function osc(freq, type, gain) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g).connect(master);
    return { o, g };
  }

  const base = v.base;
  const o1 = osc(base, 'sawtooth', 0.6);
  const o2 = osc(base * 2.01, 'triangle', 0.25);
  const o3 = osc(base * 3.05, 'sine', 0.10);

  // Pitch contour — syllable bumps
  const syllables = 6;
  for (let s = 0; s < syllables; s++) {
    const t = now + (duration / syllables) * s;
    const t2 = t + (duration / syllables) * 0.6;
    const mod = 1 + (Math.sin(s * 1.3) * 0.08);
    o1.o.frequency.setValueAtTime(base * mod, t);
    o1.o.frequency.exponentialRampToValueAtTime(base * mod * (0.92 + (s % 2) * 0.16), t2);
    o2.o.frequency.setValueAtTime(base * mod * 2.01, t);
    o2.o.frequency.exponentialRampToValueAtTime(base * mod * 2.01 * (0.92 + (s % 2) * 0.16), t2);

    // amplitude bump per syllable
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0, t);
    sg.gain.linearRampToValueAtTime(0.9, t + 0.04);
    sg.gain.linearRampToValueAtTime(0.2, t + (duration / syllables) - 0.04);
    // intentionally not connected — just to make timing match visually
  }

  // Low-pass to soften
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 1800;
  lp.Q.value = 0.6;
  master.disconnect();
  master.connect(lp).connect(ctx.destination);

  o1.o.start(now); o1.o.stop(now + duration);
  o2.o.start(now); o2.o.stop(now + duration);
  o3.o.start(now); o3.o.stop(now + duration);

  currentSource = o1.o;
  currentRow = row;
  setRowPlaying(row);

  o1.o.onended = () => {
    if (currentRow === row) {
      clearRowPlaying(row);
      currentRow = null;
      currentSource = null;
    }
  };
}

function setRowPlaying(row) {
  row.classList.add('playing');
  row.querySelector('.play-icon').style.display = 'none';
  row.querySelector('.pause-icon').style.display = 'block';
}
function clearRowPlaying(row) {
  row.classList.remove('playing');
  row.querySelector('.play-icon').style.display = 'block';
  row.querySelector('.pause-icon').style.display = 'none';
}

// ---- FAQ accordion ---------------------------------------------
function initFaq() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    q.addEventListener('click', () => item.classList.toggle('open'));
  });
}

// ---- Smooth-scroll for in-page nav -----------------------------
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          const top = target.getBoundingClientRect().top + window.pageYOffset - 60;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  });
}

// ---- Marquee text duplicate ------------------------------------
function initMarquee() {
  const track = document.querySelector('.marquee-track');
  if (!track) return;
  track.innerHTML = track.innerHTML + track.innerHTML;
}

// ---- Init -------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  drawHeroWave();
  buildVoiceRows();
  initFaq();
  initSmoothScroll();
  initMarquee();
});
