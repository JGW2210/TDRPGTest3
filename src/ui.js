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

  // the stardust pouch (Round 12): coin for the bazaar pedestals
  renderStardust(n) {
    const s = el('stardust');
    s.textContent = n > 0 ? `✦ ${n}` : '';
    s.classList.toggle('show', n > 0);
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

  // Text and position are decoupled: moveHover runs on EVERY pointermove
  // (a cheap transform write) so the label glides with the cursor, while
  // hover (text + raycast) may be throttled without any jumpiness.
  hover(text, x, y) {
    const h = el('hover');
    h.textContent = text;
    if (x !== undefined) this.moveHover(x, y);
    h.classList.add('show');
  },

  moveHover(x, y) {
    el('hover').style.transform = `translate3d(${x + 16}px, ${y + 12}px, 0)`;
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

  // The teleport prompt: no destination list — the chart itself is the
  // picker (violet-lit bodies on the current orbit are clickable).
  showTeleportPrompt(sub, onCancel) {
    el('tpanel-list').innerHTML = '';
    el('tpanel-sub').textContent = sub;
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

  // ================= Round 11: combat, items, relic, stats =================

  combatShow(on) {
    el('combat').classList.toggle('show', on);
    el('chartbtn').style.visibility = on ? 'hidden' : 'visible';
    if (!on) {
      el('cbanner').classList.remove('show');
      el('cdebuffs').textContent = '';
      el('chint').textContent = '';
    }
  },

  combatBanner(title, sub = '', holdMs = 2600) {
    const box = el('cbanner');
    el('cbanner-title').textContent = title;
    el('cbanner-sub').textContent = sub;
    box.classList.add('show');
    clearTimeout(this._cbannerTimer);
    this._cbannerTimer = setTimeout(() => box.classList.remove('show'), holdMs);
  },

  combatHint(text) {
    el('chint').textContent = text;
  },

  foePanel(enemy) {
    el('foe-name').textContent = enemy.name;
    el('foe-title').textContent = enemy.title ?? (enemy.elite ? 'a challenger of the void' : '');
    el('foe').style.display = 'block';
  },

  foeHp(frac, statusText = '') {
    el('foehp-fill').style.width = `${Math.max(0, frac) * 100}%`;
    el('foe-status').textContent = statusText;
  },

  hideFoe() {
    el('foe').style.display = 'none';
  },

  debuffs(list) {
    el('cdebuffs').textContent = list.length ? `⊘ ${list.join(' ᛫ ')} ⊘` : '';
  },

  // ---- the spell word ----
  spellShow(word) {
    const w = el('spellword');
    w.innerHTML = word.split('').map((c) => `<span>${c}</span>`).join('');
    el('spelltimer-fill').style.width = '100%';
    el('spellbox').classList.add('show');
  },

  spellProgress(typed, timeFrac, err) {
    const spans = el('spellword').children;
    for (let i = 0; i < spans.length; i++) spans[i].classList.toggle('done', i < typed);
    el('spelltimer-fill').style.width = `${Math.max(0, timeFrac) * 100}%`;
    if (err) {
      const w = el('spellword');
      w.classList.remove('err');
      void w.offsetWidth;
      w.classList.add('err');
    }
  },

  spellHide() {
    el('spellbox').classList.remove('show');
  },

  // ---- the timing bar ----
  barShow(perfectHalf, goodHalf) {
    el('timebar-perfect').style.width = `${perfectHalf * 2 * 100}%`;
    el('timebar-good').style.width = `${goodHalf * 2 * 100}%`;
    el('timebar-cursor').style.left = '0%';
    el('timebar-result').className = '';
    el('timebar').classList.add('show');
  },

  barCursor(t) {
    el('timebar-cursor').style.left = `${t * 100}%`;
  },

  barResult(cls) {
    const r = el('timebar-result');
    r.textContent = cls === 'perfect' ? '✦ perfect ✦' : cls === 'good' ? 'clean' : cls === 'glance' ? 'glancing' : 'missed';
    r.className = `show ${cls}`;
    clearTimeout(this._barHideTimer);
    this._barHideTimer = setTimeout(() => this.barHide(), 700);
  },

  barHide() {
    el('timebar').classList.remove('show');
  },

  // ---- item card (drops are always optional; bazaar sales add a note) ----
  itemCard({ name, tier, desc, dataUrl, note = '', takeLabel = '✦ take it ✦', leaveLabel = 'leave it' }, onTake, onLeave) {
    el('item-img').src = dataUrl;
    el('item-tier').textContent = tier === 'superrare' ? 'super rare' : tier;
    el('item-tier').className = tier;
    el('item-name').textContent = name;
    el('item-desc').textContent = desc;
    el('item-note').textContent = note;
    el('item-note').classList.toggle('show', !!note);
    el('item-take').textContent = takeLabel;
    el('item-leave').textContent = leaveLabel;
    el('item-take').onclick = () => { this.hideItemCard(); onTake(); };
    el('item-leave').onclick = () => { this.hideItemCard(); onLeave(); };
    el('itemcard').classList.add('show');
    this.itemCardOpen = true;
  },

  hideItemCard() {
    el('itemcard').classList.remove('show');
    this.itemCardOpen = false;
  },

  // ---- relic slot ----
  relicSlot(relic) {
    const box = el('relicslot');
    if (!relic) {
      box.classList.remove('show');
      return;
    }
    box.classList.add('show');
    el('relic-img').src = relic.dataUrl;
    const ready = relic.charge >= relic.cd;
    box.classList.toggle('ready', ready);
    el('relic-cd').textContent = ready ? 'Q ᛫ ready' : `${relic.charge}/${relic.cd}`;
    box.title = `${relic.name} — ${relic.desc}`;
  },

  // ---- boss intro splash ----
  bossIntro(name, title) {
    el('bossintro-name').textContent = name;
    el('bossintro-title').textContent = title;
    el('bossintro').classList.add('show');
  },

  hideBossIntro() {
    el('bossintro').classList.remove('show');
  },

  // ---- floating choice (fight or walk away) ----
  choice(text, options) {
    el('choice-text').textContent = text;
    const box = el('choice-opts');
    box.innerHTML = '';
    for (const opt of options) {
      const b = document.createElement('div');
      b.className = 'ibtn';
      b.textContent = opt.label;
      b.onclick = () => { this.hideChoice(); opt.cb(); };
      box.appendChild(b);
    }
    el('choice').classList.add('show');
    this.choiceOpen = true;
  },

  hideChoice() {
    el('choice').classList.remove('show');
    this.choiceOpen = false;
  },

  // ---- the stats line ----
  statsLine(stats, itemCount) {
    el('statsline').textContent =
      `atk ${stats.atk.toFixed(2)} ᛫ spd ${stats.spd.toFixed(1)} ᛫ sight ${stats.sight.toFixed(0)} ᛫ fore ${stats.foresight.toFixed(0)}`
      + (itemCount ? ` ᛫ ${itemCount} curio${itemCount > 1 ? 's' : ''}` : '');
  },
};
