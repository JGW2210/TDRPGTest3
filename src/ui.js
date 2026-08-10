// Non-modular floating UI: no panels, only aetherial text. Announcements use
// Twin-Tongue deciphering — runes shimmer into letters as the wisp translates.

import { toRunes } from './config.js';

const el = (id) => document.getElementById(id);

let announceTimer = null;
let decodeTimer = null;

// Papercraft heart halves: one SVG heart split down the middle, each half
// filled or hollow. Slight per-heart tilt keeps the row hand-cut.
const HEART_L = 'M12 20.5 C 5.6 14.6 1.6 10.4 1.6 6.9 C 1.6 4.1 3.8 1.8 6.6 1.8 C 8.9 1.8 11 3.3 12 5.4 Z';
const HEART_R = 'M12 20.5 C 18.4 14.6 22.4 10.4 22.4 6.9 C 22.4 4.1 20.2 1.8 17.4 1.8 C 15.1 1.8 13 3.3 12 5.4 Z';

function heartSvg(left, right) {
  const half = (d, on) =>
    `<path d="${d}" fill="${on ? '#ff8fa8' : 'rgba(244,236,216,0.10)'}" stroke="#1f1a36" stroke-width="1.6" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 24 22">${half(HEART_L, left)}${half(HEART_R, right)}</svg>`;
}

export const ui = {
  setLocation(text) {
    el('locline').textContent = text;
  },

  // ---- hearts, damage & death ----
  renderHearts(halves, maxHalves) {
    const box = el('hearts');
    let html = '';
    for (let i = 0; i < Math.ceil(maxHalves / 2); i++) {
      const l = halves > i * 2, r = halves > i * 2 + 1;
      html += `<span class="heart${l || r ? '' : ' empty'}" style="transform:rotate(${i % 2 ? 4 : -3}deg)">${heartSvg(l, r)}</span>`;
    }
    box.innerHTML = html;
  },

  // ward-charm indicator beside the hearts
  renderCharm(n) {
    const c = el('charm');
    c.textContent = n > 0 ? 'ᛉ' : '';
    c.classList.toggle('show', n > 0);
  },

  // the cartographer's standing errand, under the location line
  setBounty(text) {
    const b = el('bounty');
    b.textContent = text;
    b.classList.toggle('show', !!text);
  },

  hurt() {
    const v = el('hurtflash');
    v.classList.remove('show');
    void v.offsetWidth; // restart the flash animation
    v.classList.add('show');
    const box = el('hearts');
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');
  },

  deathFade() {
    el('deathfade').classList.add('show');
  },

  announce(title, sub = '', holdMs = 4200) {
    const box = el('announce');
    const titleEl = el('announce-title');
    const subEl = el('announce-sub');
    clearTimeout(announceTimer);
    clearInterval(decodeTimer);

    // decode animation: runes resolve into letters left to right
    const chars = title.split('');
    let progress = 0;
    const steps = 22;
    titleEl.textContent = toRunes(title);
    subEl.textContent = sub;
    box.classList.add('show');
    decodeTimer = setInterval(() => {
      progress++;
      const p = progress / steps;
      titleEl.textContent = chars
        .map((c, i) => (i / chars.length < p ? c : toRunes(c)))
        .join('');
      if (progress >= steps) clearInterval(decodeTimer);
    }, 55);

    announceTimer = setTimeout(() => box.classList.remove('show'), holdMs);
  },

  // Cutscene dialogue: one floating line at a time, advanced by click.
  // The line shimmers in as runes resolving into letters, Twin-Tongue style.
  dialogue(text) {
    const box = el('dialogue');
    const textEl = el('dialogue-text');
    clearInterval(this._dialogueTimer);
    const chars = text.split('');
    let progress = 0;
    const steps = 16;
    textEl.textContent = toRunes(text);
    box.classList.add('show');
    this._dialogueTimer = setInterval(() => {
      progress++;
      const p = progress / steps;
      textEl.textContent = chars
        .map((c, i) => (i / chars.length < p ? c : toRunes(c)))
        .join('');
      if (progress >= steps) clearInterval(this._dialogueTimer);
    }, 45);
  },

  hideDialogue() {
    clearInterval(this._dialogueTimer);
    el('dialogue').classList.remove('show');
  },

  hover(text, x, y) {
    const h = el('hover');
    h.textContent = text;
    h.style.left = x + 'px';
    h.style.top = y + 'px';
    h.classList.add('show');
  },

  hideHover() {
    el('hover').classList.remove('show');
  },

  setSeed(seed, title) {
    el('seedline').textContent = `${toRunes(title)} ᛫ seed ${seed}`;
  },

  // ---- star chart toggle + teleport panel ----
  setChartActive(on) {
    el('chartbtn').classList.toggle('active', on);
  },

  onChartClick(fn) {
    el('chartbtn').addEventListener('click', fn);
  },

  // dests: [{ name, sub }] — onPick(index); onCancel() when 'stay' is chosen
  showTeleport(dests, onPick, onCancel) {
    const list = el('tpanel-list');
    list.innerHTML = '';
    if (!dests.length) {
      const none = document.createElement('div');
      none.className = 'tp-none';
      none.textContent = 'no islands charted on this orbit yet';
      list.appendChild(none);
    }
    dests.forEach((d, i) => {
      const row = document.createElement('div');
      row.className = 'tp-dest';
      row.textContent = d.name;
      row.addEventListener('click', () => onPick(i));
      list.appendChild(row);
    });
    el('tpanel-cancel').onclick = () => onCancel();
    el('tpanel').classList.add('show');
  },

  hideTeleport() {
    el('tpanel').classList.remove('show');
  },

  fadeHintLater(ms = 14000) {
    setTimeout(() => el('hint').classList.add('faded'), ms);
  },

  showHint() {
    el('hint').classList.remove('faded');
  },
};
