// Non-modular floating UI: no panels, only aetherial text. Announcements use
// Twin-Tongue deciphering — runes shimmer into letters as the wisp translates.

import { toRunes } from './config.js';

const el = (id) => document.getElementById(id);

let announceTimer = null;
let decodeTimer = null;

export const ui = {
  setLocation(text) {
    el('locline').textContent = text;
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

  fadeHintLater(ms = 14000) {
    setTimeout(() => el('hint').classList.add('faded'), ms);
  },

  showHint() {
    el('hint').classList.remove('faded');
  },
};
