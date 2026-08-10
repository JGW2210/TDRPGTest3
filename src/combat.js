// The combat engine (Round 11). A fight is a zoomed-in papercraft DIORAMA
// staged over the encounter hex: two 3x3 boards face each other — the foe
// patrols its own nine squares, the magician dances on theirs — while the
// camera drops into an over-the-shoulder view.
//
// Turns are scheduled by SPEED: both sides fill an initiative meter; whoever
// brims, acts. The player's attack is a three-step challenge — pick a target
// square on the foe's board (attack patterns from items widen the footprint),
// SPELL the magical word against the clock, then land an Undertale-style
// timing bar. The foe's turn telegraphs danger squares (amber, tracking),
// locks them red, and gives the player a 0.3-0.8s react window (ring-scaled)
// to move off with WASD — melee bites one square, ranged shots run two
// squares toward the camera. Deep-ring foes also throw control-hexes:
// reversed keys, scrambled keys, or a locked lane that only a PERFECT strike
// clears. Statuses (burn / freeze / slow) ride on imbued attacks, and the
// single RELIC slot fires on Q when its kill-charge is full.

import * as THREE from 'three';
import { SPELL_WORDS } from './config.js';
import { magicianCanvas, makePaperFigure } from './sprites.js';

const INK = 0x1f1a36;

// attack patterns: which enemy-board cells a strike at cell i covers.
// row 0 = the foe's back rank; row 2 faces the player.
export const PATTERNS = {
  single: (i) => [i],
  twin: (i) => {
    const r = (i / 3) | 0, c = i % 3;
    return c === 1 ? [i] : [i, r * 3 + (2 - c)];
  },
  pierce: (i) => {
    const r = (i / 3) | 0;
    return r === 0 ? [i] : [i, i - 3];
  },
  sweep: (i) => {
    const r = (i / 3) | 0;
    return [r * 3, r * 3 + 1, r * 3 + 2];
  },
  cross: (i) => {
    const r = (i / 3) | 0, c = i % 3;
    const out = [i];
    if (r > 0) out.push(i - 3);
    if (r < 2) out.push(i + 3);
    if (c > 0) out.push(i - 1);
    if (c < 2) out.push(i + 1);
    return out;
  },
  scatter: (i, rand = Math.random) => {
    const r = (i / 3) | 0, c = i % 3;
    const adj = [];
    if (r > 0) adj.push(i - 3);
    if (r < 2) adj.push(i + 3);
    if (c > 0) adj.push(i - 1);
    if (c < 2) adj.push(i + 1);
    return [i, adj[(rand() * adj.length) | 0]].filter((x) => x !== undefined);
  },
};

const CELL = 2.6;         // board cell pitch
const BOARD_Z = 6.8;      // each board's center, either side of the stage
const METER_MAX = 100;

export class Combat {
  // deps: { scene, controls, run, cui, hooks }
  //   run  — main's run state (stats, relic, halves live there)
  //   cui  — the combat UI surface (ui.js combat methods)
  //   hooks — { damagePlayer(halves, note)->'shield'|'charm'|'hit'|'dead',
  //             healPlayer(halves), onVictory(result), onDefeat(),
  //             announce(t, s), flash(text), onRelicUsed() }
  constructor({ scene, controls, run, cui, hooks }) {
    this.scene = scene;
    this.controls = controls;
    this.run = run;
    this.cui = cui;
    this.hooks = hooks;
    this.active = false;
    this.phase = 'off';
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    addEventListener('keydown', (e) => this._onKey(e));
  }

  // ------------------------------------------------------------ lifecycle
  start({ enemy, worldPos, biome, boss = false }) {
    if (this.active) return;
    this.active = true;
    this.enemy = enemy;
    this.boss = boss;
    this.biome = biome;
    this.t = 0;
    this.phase = 'idle';
    this.phaseT = 0;
    this.playerMeter = 55;   // the ambusher opens with tempo...
    this.enemyMeter = boss ? 35 : 20;
    this.playerCell = 7;     // center of the near rank
    this.enemyCell = enemy.patrol[enemy.patrolIdx % enemy.patrol.length];
    this.damageTaken = 0;
    this.shield = this.run.stats.shield;
    this.glassStepUsed = false;
    this.overclock = false;
    this.clarity = false;
    this.purged = false;
    this.eclipseTurns = 0;
    this.debuffs = [];       // {kind:'reverse'|'random'|'lanelock', until, lane}
    this.keymap = { a: 'left', d: 'right', w: 'up', s: 'down' };
    this.scrambleAt = 0;
    this.strikes = [];
    this.dash = null;
    this.pendingEcho = null;
    this._buildStage(worldPos, biome);
    this.cui.combatShow(true);
    this.cui.foePanel(enemy);
    this.cui.foeHp(1, '');
    this.cui.combatHint('');
    this.cui.combatBanner(boss ? enemy.name : `a ${enemy.name.toLowerCase()} bares itself`, 'speed fills the meters ᛫ WASD moves you');
    this._refreshDebuffUi();
  }

  end(victory) {
    this.active = false;
    this.phase = 'off';
    this.cui.combatShow(false);
    this.cui.spellHide();
    this.cui.barHide();
    this.cui.hideFoe();
    if (this.stage) {
      this.scene.remove(this.stage);
      this.stage.traverse((o) => {
        o.geometry?.dispose?.();
        if (o.material?.map && o.material.map.isCanvasTexture) o.material.map.dispose();
        o.material?.dispose?.();
      });
      this.stage = null;
    }
    void victory;
  }

  // ------------------------------------------------------------ the stage
  _buildStage(worldPos, biome) {
    const g = new THREE.Group();
    g.position.copy(worldPos);
    g.rotation.y = this.controls.yaw; // face the current camera bearing
    this.stageYaw = this.controls.yaw;

    // papercraft footing: a torn disc in the biome's isle colors
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(12.5, 13.2, 0.7, 22),
      new THREE.MeshStandardMaterial({ color: biome.island.top, flatShading: true })
    );
    disc.position.y = -0.55;
    g.add(disc);
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(12.9, 13.4, 0.25, 22),
      new THREE.MeshBasicMaterial({ color: INK })
    );
    rim.position.y = -0.95;
    g.add(rim);

    // a paper backdrop arc behind the foe: cut peaks in the biome's colors
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i - 3) * 0.28; // behind the enemy board (local -Z)
      const h = 3.2 + Math.abs(3 - i) * -0.4 + (i % 2) * 1.1 + 2.4;
      const peak = new THREE.Mesh(
        new THREE.ConeGeometry(1.7 + (i % 3) * 0.5, h, 4),
        new THREE.MeshStandardMaterial({
          color: i % 2 ? biome.island.top2 : biome.island.side, flatShading: true,
        })
      );
      peak.position.set(Math.sin(a) * 11.2, h / 2 - 0.4, Math.cos(a) * 11.2);
      peak.rotation.y = (i * Math.PI) / 3.5;
      g.add(peak);
    }

    // the two boards
    this.tiles = { p: [], e: [] };
    this.overlays = { p: [], e: [] };
    this.tileHitboxes = [];
    const tileGeo = new THREE.BoxGeometry(CELL * 0.86, 0.5, CELL * 0.86);
    const overGeo = new THREE.PlaneGeometry(CELL * 0.8, CELL * 0.8).rotateX(-Math.PI / 2);
    // the foe's ranks run a shade darker than the player's, but stay readable
    const foeTile = new THREE.Color(biome.island.side).lerp(new THREE.Color(biome.island.top2), 0.5);
    for (const side of ['p', 'e']) {
      for (let i = 0; i < 9; i++) {
        const tile = new THREE.Mesh(tileGeo, new THREE.MeshStandardMaterial({
          color: side === 'p' ? biome.island.top2 : foeTile,
          flatShading: true,
        }));
        const pos = this._cellLocal(side, i);
        tile.position.set(pos.x, 0.25, pos.z);
        g.add(tile);
        this.tiles[side].push(tile);
        const over = new THREE.Mesh(overGeo, new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0,
          depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        over.position.set(pos.x, 0.56, pos.z);
        over.renderOrder = 5;
        g.add(over);
        this.overlays[side].push(over);
        if (side === 'e') {
          const hit = new THREE.Mesh(
            new THREE.BoxGeometry(CELL, 2, CELL),
            new THREE.MeshBasicMaterial()
          );
          hit.visible = false;
          hit.position.set(pos.x, 1, pos.z);
          hit.userData.cell = i;
          g.add(hit);
          this.tileHitboxes.push(hit);
        }
      }
    }

    // figures
    this.playerFig = makePaperFigure(magicianCanvas(), { height: 3.4, glow: 0xffe9c4, glowScale: 1.4 });
    const pp = this._cellLocal('p', this.playerCell);
    this.playerFig.position.set(pp.x, 0.5, pp.z);
    g.add(this.playerFig);

    this.enemyFig = makePaperFigure(this.enemy.canvas, {
      height: this.boss ? 5.6 : 3.4, glow: this.enemy.glow, glowScale: 1.5,
    });
    const ep = this._cellLocal('e', this.enemyCell);
    this.enemyFig.position.set(ep.x, 0.5, ep.z);
    g.add(this.enemyFig);

    const lamp = new THREE.PointLight(0xffe9c4, 90, 60, 1.6);
    lamp.position.set(0, 12, 4);
    g.add(lamp);

    this.scene.add(g);
    this.stage = g;
  }

  _cellLocal(side, i) {
    const r = (i / 3) | 0, c = i % 3;
    const x = (c - 1) * CELL;
    // player board: row 0 faces the foe; enemy board: row 2 faces the player
    const z = side === 'p'
      ? BOARD_Z + (r - 1) * CELL
      : -BOARD_Z + (r - 1) * CELL;
    return { x, z };
  }

  _cellWorld(side, i, out = new THREE.Vector3()) {
    const l = this._cellLocal(side, i);
    out.set(l.x, 0.6, l.z).applyMatrix4(this.stage.matrixWorld);
    return out;
  }

  // ------------------------------------------------------------ input
  _mapKey(key) {
    const k = key.toLowerCase();
    const arrows = { arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down' };
    if (arrows[k]) return this._applyDebuffMap(arrows[k]);
    if (this.keymap[k]) return this._applyDebuffMap(this.keymap[k]);
    return null;
  }

  _applyDebuffMap(dir) {
    if (this.debuffs.some((d) => d.kind === 'reverse')) {
      dir = { left: 'right', right: 'left', up: 'down', down: 'up' }[dir];
    }
    const rnd = this.debuffs.find((d) => d.kind === 'random');
    if (rnd) dir = rnd.map[dir];
    return dir;
  }

  _onKey(e) {
    if (!this.active) return;
    const k = e.key;
    if (k === ' ' || k.startsWith('Arrow')) e.preventDefault();

    if (this.phase === 'spell') {
      if (/^[a-zA-Z]$/.test(k)) this._spellType(k.toUpperCase());
      return;
    }
    if (this.phase === 'bar') {
      if (k === ' ' || k === 'Enter') this._barLock();
      return;
    }
    if (k === 'q' || k === 'Q') { this._useRelic(); return; }

    const dir = this._mapKey(k);
    if (this.phase === 'target') {
      if (dir) this._moveCursor(dir);
      if (k === ' ' || k === 'Enter') this._confirmTarget();
      return;
    }
    // free movement while idling and through the whole enemy turn
    if ((this.phase === 'idle' || this.phase === 'enemyTurn') && dir) {
      this._movePlayer(dir);
    }
  }

  onClick(x, y, camera) {
    if (!this.active) return true;
    if (this.phase === 'target') {
      this.pointer.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, camera);
      const hits = this.raycaster.intersectObjects(this.tileHitboxes, false);
      if (hits.length) {
        const cell = hits[0].object.userData.cell;
        if (cell === this.targetCell) this._confirmTarget();
        else this.targetCell = cell;
      } else {
        this._confirmTarget();
      }
    } else if (this.phase === 'bar') {
      this._barLock();
    }
    return true; // combat swallows all clicks
  }

  _movePlayer(dir) {
    const r = (this.playerCell / 3) | 0, c = this.playerCell % 3;
    let nr = r, nc = c;
    if (dir === 'left') nc = Math.max(0, c - 1);
    if (dir === 'right') nc = Math.min(2, c + 1);
    if (dir === 'up') nr = Math.max(0, r - 1);   // toward the foe
    if (dir === 'down') nr = Math.min(2, r + 1); // toward the camera
    const lock = this.debuffs.find((d) => d.kind === 'lanelock');
    if (lock && nc === lock.lane) {
      this.hooks.flash('⊘ the lane is hexed shut ᛫ land a PERFECT strike to break it');
      return;
    }
    const next = nr * 3 + nc;
    if (next === this.playerCell) return;
    this.playerCell = next;
    const p = this._cellLocal('p', next);
    this.playerFig.position.set(p.x, 0.5, p.z);
    // a snappy paper hop
    this.playerFig.scale.set(0.88, 1.14, 1);
  }

  _moveCursor(dir) {
    const r = (this.targetCell / 3) | 0, c = this.targetCell % 3;
    let nr = r, nc = c;
    if (dir === 'left') nc = Math.max(0, c - 1);
    if (dir === 'right') nc = Math.min(2, c + 1);
    if (dir === 'up') nr = Math.max(0, r - 1);
    if (dir === 'down') nr = Math.min(2, r + 1);
    this.targetCell = nr * 3 + nc;
  }

  // ------------------------------------------------------------ player turn
  _beginPlayerTurn() {
    this.phase = 'target';
    this.phaseT = 0;
    this.targetCell = this.enemyCell;
    this.cui.combatBanner('YOUR TURN', 'pick a square ᛫ space or click to commit');
    this.cui.combatHint('WASD aims ᛫ SPACE commits');
  }

  _confirmTarget() {
    // the challenge begins: the word first
    this.lockedTarget = this.targetCell;
    this.lockedCells = this._patternCells(this.targetCell);
    if (this.run.stats.flags.autoSpell) {
      this.spell = { score: 1, done: true };
      this._beginBar();
      return;
    }
    this.phase = 'spell';
    this.phaseT = 0;
    const ring = this.enemy.ring;
    const tier = this.boss
      ? (this.enemy.boundary >= 2 ? 'long' : 'medium')
      : ring <= 1 ? 'short' : ring <= 3 ? 'medium' : 'long';
    let word = SPELL_WORDS[tier][(Math.random() * SPELL_WORDS[tier].length) | 0];
    if (this.run.stats.flags.scholar && word.length > 3) word = word.slice(0, -1);
    const perChar = Math.max(0.4, 0.62 - 0.045 * ring) * this.run.stats.spellTime;
    this.spell = {
      word, typed: 0, deadline: word.length * perChar, total: word.length * perChar,
      score: 0, done: false,
    };
    this.cui.spellShow(word);
    this.cui.combatHint('type the word — quickly');
  }

  _spellType(ch) {
    const sp = this.spell;
    if (!sp || sp.done) return;
    if (sp.word[sp.typed] === ch) {
      sp.typed++;
      this.cui.spellProgress(sp.typed, Math.max(0, sp.deadline) / sp.total, false);
      if (sp.typed >= sp.word.length) {
        sp.done = true;
        const frac = sp.deadline / sp.total;
        sp.score = 1 + (frac > 0.5 ? 0.25 : 0);
        sp.swift = frac > 0.5;
        this.cui.spellHide();
        this._beginBar();
      }
    } else {
      sp.deadline -= 0.18; // a stumble costs breath
      this.cui.spellProgress(sp.typed, Math.max(0, sp.deadline) / sp.total, true);
    }
  }

  _beginBar() {
    this.phase = 'bar';
    this.phaseT = 0;
    const ring = this.enemy.ring;
    const w = this.run.stats.barWidth;
    this.bar = {
      t: 0,
      dur: Math.max(0.62, 0.92 - 0.05 * ring),
      perfect: 0.055 * w,
      good: 0.15 * w,
      locked: false,
    };
    this.cui.barShow(this.bar.perfect, this.bar.good);
    this.cui.combatHint('SPACE on the center ᛫ perfect strikes break lane-hexes');
  }

  _barLock() {
    const b = this.bar;
    if (!b || b.locked) return;
    b.locked = true;
    const off = Math.abs(b.t - 0.5);
    let mult, cls;
    if (off <= b.perfect) { mult = 1.6; cls = 'perfect'; } else if (off <= b.good) { mult = 1.0; cls = 'good'; } else { mult = 0.5; cls = 'glance'; }
    if (this.run.stats.flags.minGood && mult < 1.0) { mult = 1.0; cls = 'good'; }
    this.cui.barResult(cls);
    this._resolveAttack(mult, cls);
  }

  _barTimeout() {
    const b = this.bar;
    if (!b || b.locked) return;
    b.locked = true;
    let mult = 0.15, cls = 'miss';
    if (this.run.stats.flags.minGood) { mult = 1.0; cls = 'good'; }
    this.cui.barResult(cls);
    this._resolveAttack(mult, cls);
  }

  _patternCells(i) {
    const fn = PATTERNS[this.run.stats.pattern] ?? PATTERNS.single;
    return fn(i);
  }

  _resolveAttack(barMult, barCls) {
    this.phase = 'resolve';
    this.phaseT = 0;
    // a planned sidestep: a dodger takes its next patrol step the moment
    // the strike commits — predictable, if you've read its habits
    if (this.enemy.dodges) {
      this.enemy.patrolIdx = (this.enemy.patrolIdx + 1) % this.enemy.patrol.length;
      this.enemyCell = this.enemy.patrol[this.enemy.patrolIdx];
      const ep = this._cellLocal('e', this.enemyCell);
      this.enemyFig.position.set(ep.x, 0.5, ep.z);
    }
    const cells = this._patternCells(this.lockedTarget);
    const hit = cells.includes(this.enemyCell);
    const spellScore = this.spell.score || 0.45;
    const crit = Math.random() < this.run.stats.crit;
    let dmg = this.run.stats.atk * spellScore * barMult * (crit ? 1.5 : 1);
    dmg = Math.round(dmg * 10) / 10;
    this.lastResult = { hit, dmg, barCls, crit, cells, swift: !!this.spell.swift, perfect: barCls === 'perfect' };

    if (hit && dmg > 0) {
      this._damageEnemy(dmg);
      this._burstAtCell('e', this.enemyCell, crit ? 0xfff6b0 : 0x9fd8ff);
      // imbues ride a landed strike
      const st = this.enemy.statuses;
      if (Math.random() < this.run.stats.burn) st.burn = Math.min(3, st.burn + 1);
      if (Math.random() < this.run.stats.freeze) st.freezeTurns = Math.min(2, st.freezeTurns + 1);
      if (Math.random() < this.run.stats.slow) st.slowTurns = Math.min(3, st.slowTurns + 2);
      if (barCls === 'perfect' && this.run.stats.flags.doubleTap) {
        this.pendingEcho = { at: this.t + 0.28, dmg: Math.round(dmg * 5) / 10 };
      }
      this.cui.combatBanner(
        crit ? `CRIT ᛫ ${dmg}` : barCls === 'perfect' ? `PERFECT ᛫ ${dmg}` : `${dmg}`,
        this._statusText()
      );
    } else if (!hit) {
      this.cui.combatBanner('IT SLIPS ASIDE', 'read its habits — it steps when you strike');
    }
    // a perfect strike shatters any lane-hex
    if (barCls === 'perfect') {
      const had = this.debuffs.some((d) => d.kind === 'lanelock');
      this.debuffs = this.debuffs.filter((d) => d.kind !== 'lanelock');
      if (had) this.hooks.flash('✦ the hexed lane swings open ✦');
      this._refreshDebuffUi();
    }
    this.hooks.onStrike?.(this.lastResult);
  }

  _damageEnemy(dmg) {
    this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
    this.cui.foeHp(this.enemy.hp / this.enemy.maxHp, this._statusText());
    this.enemyFig.userData.sprite.material.color.setHex(0xff8f8f);
    this._enemyFlashUntil = this.t + 0.12;
    if (this.enemy.hp <= 0) this._victory();
  }

  _statusText() {
    const st = this.enemy.statuses;
    const bits = [];
    if (st.burn > 0) bits.push(`burn ×${st.burn}`);
    if (st.freezeTurns > 0) bits.push('frozen');
    if (st.slowTurns > 0) bits.push('slowed');
    if (this.eclipseTurns > 0) bits.push('eclipsed');
    return bits.join(' ᛫ ');
  }

  // ------------------------------------------------------------ enemy turn
  _beginEnemyTurn() {
    const st = this.enemy.statuses;
    // burn gnaws first — it can finish a fight on its own
    if (st.burn > 0) {
      this._damageEnemy(0.5 * st.burn);
      st.burn -= 1;
      if (!this.active || this.phase === 'reward' || this.enemy.hp <= 0) return;
    }
    if (st.freezeTurns > 0) {
      st.freezeTurns -= 1;
      this.enemyMeter = 0;
      this.cui.combatBanner('FROZEN', 'the foe forgets its turn');
      this.cui.foeHp(this.enemy.hp / this.enemy.maxHp, this._statusText());
      return; // stays in idle
    }
    this.phase = 'enemyTurn';
    this.phaseT = 0;
    this.cui.combatBanner('THEIR TURN', 'move! danger squares lock red, then bite');
    this.cui.combatHint('WASD ᛫ amber tracks you ᛫ red is committed');

    // maybe open with a control-hex
    if (this.enemy.debuffs.length && !this.purged && Math.random() < 0.45) {
      this._castDebuff(this.enemy.debuffs[(Math.random() * this.enemy.debuffs.length) | 0]);
    }

    // the strike timeline: cells are chosen when each strike LOCKS
    let count = this.enemy.strikes;
    if (this.eclipseTurns > 0) count = Math.max(1, Math.ceil(count / 2));
    const ring = this.enemy.ring;
    const interval = Math.max(0.95, 1.5 - ring * 0.1);
    const react = this._reactWindow();
    this.strikes = [];
    for (let i = 0; i < count; i++) {
      let type;
      if (this.boss) {
        const cycle = this.enemy.boundary >= 2
          ? ['melee', 'ranged', 'sweep', 'cross']
          : this.enemy.boundary >= 1 ? ['melee', 'ranged', 'sweep'] : ['melee', 'ranged', 'melee'];
        type = cycle[i % cycle.length];
      } else {
        type = Math.random() < this.enemy.ranged ? 'ranged' : 'melee';
      }
      this.strikes.push({
        type,
        lockAt: 1.0 + i * (interval + react),
        react,
        cells: null, // chosen at lock
        struck: false,
        secondStruck: false,
      });
    }
    this.turnEndsAt = 1.0 + count * (interval + react) + 0.7;
  }

  _reactWindow() {
    const ring = this.enemy.ring;
    let w = Math.max(0.3, Math.min(0.8, 0.8 - 0.115 * ring));
    w += this.run.stats.dodge;
    if (this.clarity) w += 0.25;
    return w;
  }

  _revealLead() {
    // how early the amber warning shows: about a second, longer with sight
    let lead = 0.55 + 0.28 * this.run.stats.sight;
    if (this.clarity) lead += 0.6;
    return Math.min(2, Math.max(0.45, lead));
  }

  // danger cells for a strike, chased live until lock freezes them
  _strikeCells(s) {
    const r = (this.playerCell / 3) | 0, c = this.playerCell % 3;
    if (s.type === 'melee') return [this.playerCell];
    if (s.type === 'ranged') {
      // two squares running toward the camera down the player's lane
      const r0 = Math.min(r, 1);
      return [r0 * 3 + c, (r0 + 1) * 3 + c];
    }
    if (s.type === 'sweep') return [r * 3, r * 3 + 1, r * 3 + 2];
    // cross: the player's square and its neighbors
    return PATTERNS.cross(this.playerCell);
  }

  _castDebuff(kind) {
    if (kind === 'lanelock' && this.run.stats.flags.mirrorWard) {
      this.enemy.statuses.slowTurns = Math.min(3, this.enemy.statuses.slowTurns + 1);
      this.hooks.flash('ᛉ ✦ the lane-hex rebounds off your mirror-oath ✦');
      return;
    }
    const durMul = this.run.stats.flags.calmMind ? 0.5 : 1;
    if (kind === 'reverse') {
      this.debuffs = this.debuffs.filter((d) => d.kind !== 'reverse');
      this.debuffs.push({ kind: 'reverse', until: this.t + 6 * durMul });
      this.hooks.flash('⊘ your hands are HEXED ᛫ the keys run backwards');
    } else if (kind === 'random') {
      const dirs = ['left', 'right', 'up', 'down'];
      const shuffled = dirs.slice().sort(() => Math.random() - 0.5);
      const map = {};
      dirs.forEach((d, i) => { map[d] = shuffled[i]; });
      this.debuffs = this.debuffs.filter((d) => d.kind !== 'random');
      this.debuffs.push({ kind: 'random', until: this.t + 6 * durMul, map, reshuffleAt: this.t + 1.5 });
      this.hooks.flash('⊘ the keys are SCRAMBLED ᛫ nothing is where it was');
    } else if (kind === 'lanelock') {
      const c = this.playerCell % 3;
      const lanes = [0, 1, 2].filter((l) => l !== c && !this.debuffs.some((d) => d.kind === 'lanelock' && d.lane === l));
      if (!lanes.length) return;
      this.debuffs.push({ kind: 'lanelock', until: Infinity, lane: lanes[(Math.random() * lanes.length) | 0] });
      this.hooks.flash('⊘ a lane SLAMS SHUT ᛫ only a perfect strike reopens it');
    }
    this._refreshDebuffUi();
  }

  _refreshDebuffUi() {
    this.cui.debuffs(this.debuffs.map((d) =>
      d.kind === 'reverse' ? 'keys reversed'
        : d.kind === 'random' ? 'keys scrambled'
          : `lane ${['left', 'middle', 'right'][d.lane]} hexed`));
  }

  _strikeImpact(cells) {
    for (const cell of cells) this._burstAtCell('p', cell, 0xff8f8f);
    if (!cells.includes(this.playerCell)) return;
    if (this.run.stats.flags.glassStep && !this.glassStepUsed) {
      this.glassStepUsed = true;
      this.hooks.flash('✦ you are simply not there ✦');
      return;
    }
    if (this.shield > 0) {
      this.shield -= 1;
      this.hooks.flash(`✦ the fold holds ✦ ${this.shield} shield${this.shield === 1 ? '' : 's'} left`);
      return;
    }
    this.damageTaken += 1;
    const outcome = this.hooks.damagePlayer(this.enemy.atk, `✦ the ${this.enemy.name.toLowerCase()} strikes true ✦`);
    if (this.run.stats.thorns > 0 && outcome !== 'dead') {
      this._damageEnemy(Math.round(this.run.stats.thorns * 10) / 10);
    }
    if (outcome === 'dead') this._defeat();
  }

  _burstAtCell(side, cell, color) {
    const over = this.overlays[side][cell];
    over.material.color.setHex(color);
    over.material.opacity = 0.9;
    over.userData.flashDecay = 3.2;
  }

  // ------------------------------------------------------------ relic
  _useRelic() {
    const r = this.run.relic;
    if (!r) { this.hooks.flash('⊘ no relic rides your belt'); return; }
    if (r.charge < r.def.cd) {
      this.hooks.flash(`⊘ the relic sleeps ᛫ ${r.def.cd - r.charge} more fall${r.def.cd - r.charge === 1 ? '' : 's'} to wake it`);
      return;
    }
    if (this.phase === 'reward' || this.phase === 'off') return;
    r.charge = 0;
    this.hooks.onRelicUsed?.();
    const use = r.def.use;
    this.hooks.flash(`✦ ${r.def.name.toUpperCase()} ✦`);
    if (use === 'nova') {
      this._damageEnemy(Math.round((3 + this.run.stats.atk * 1.5) * 10) / 10);
      this._burstAtCell('e', this.enemyCell, 0xffe9c4);
    } else if (use === 'stasis') {
      this.enemy.statuses.freezeTurns += 1;
    } else if (use === 'mend') {
      this.hooks.healPlayer(4);
    } else if (use === 'aegis') {
      this.shield += 3;
    } else if (use === 'overclock') {
      this.overclock = true;
    } else if (use === 'clarity') {
      this.clarity = true;
    } else if (use === 'purge') {
      this.debuffs = [];
      this.purged = true;
      this._refreshDebuffUi();
    } else if (use === 'stormcall') {
      this._damageEnemy(2);
      this.enemy.statuses.slowTurns = Math.min(3, this.enemy.statuses.slowTurns + 2);
    } else if (use === 'timeslip') {
      if (this.phase === 'idle') this._beginPlayerTurn();
      else this.playerMeter = METER_MAX;
    } else if (use === 'ignite') {
      this.enemy.statuses.burn = 3;
    } else if (use === 'transmute') {
      this.run.transmute = true;
    } else if (use === 'eclipse') {
      this.eclipseTurns = 2;
    }
    if (this.active) this.cui.foeHp(this.enemy.hp / this.enemy.maxHp, this._statusText());
  }

  // ------------------------------------------------------------ outcomes
  _victory() {
    if (this.phase === 'reward') return;
    this.phase = 'reward';
    this.strikes = [];
    this.cui.spellHide();
    this.cui.barHide();
    this.enemyFig.userData.sprite.material.rotation = 0.35; // keels over
    this.hooks.onVictory({
      enemy: this.enemy,
      boss: this.boss,
      flawless: this.damageTaken === 0,
      swift: !!this.lastResult?.swift,
      perfect: !!this.lastResult?.perfect,
    });
  }

  _defeat() {
    this.strikes = [];
    this.end(false);
    this.hooks.onDefeat();
  }

  // called by main once rewards wrap up
  finish() {
    this.end(true);
  }

  // ------------------------------------------------------------ frame
  update(dt, camera) {
    if (!this.active) return;
    this.t += dt;
    this.phaseT += dt;

    // debuff timers
    const before = this.debuffs.length;
    this.debuffs = this.debuffs.filter((d) => this.t < d.until);
    if (this.debuffs.length !== before) this._refreshDebuffUi();
    const rnd = this.debuffs.find((d) => d.kind === 'random');
    if (rnd && this.t > rnd.reshuffleAt) {
      rnd.reshuffleAt = this.t + 1.5;
      const dirs = ['left', 'right', 'up', 'down'];
      const shuffled = dirs.slice().sort(() => Math.random() - 0.5);
      dirs.forEach((d, i) => { rnd.map[d] = shuffled[i]; });
    }

    // meters
    if (this.phase === 'idle') {
      const pspd = this.run.stats.spd * (this.overclock ? 2 : 1);
      let espd = this.enemy.spd;
      if (this.enemy.statuses.slowTurns > 0) espd *= 0.55;
      this.playerMeter += pspd * 9 * dt;
      this.enemyMeter += espd * 9 * dt;
      if (this.playerMeter >= METER_MAX && this.playerMeter >= this.enemyMeter) {
        this.playerMeter = 0;
        this._beginPlayerTurn();
      } else if (this.enemyMeter >= METER_MAX) {
        this.enemyMeter = 0;
        this._beginEnemyTurn();
      }
    }

    // spell clock
    if (this.phase === 'spell' && this.spell && !this.spell.done) {
      this.spell.deadline -= dt;
      this.cui.spellProgress(this.spell.typed, Math.max(0, this.spell.deadline) / this.spell.total, false);
      if (this.spell.deadline <= 0) {
        this.spell.done = true;
        this.spell.score = 0.45; // the word fizzles half-said
        this.cui.spellHide();
        this.hooks.flash('the word dies on your tongue ᛫ the cast weakens');
        this._beginBar();
      }
    }

    // timing bar sweep
    if (this.phase === 'bar' && this.bar && !this.bar.locked) {
      this.bar.t += dt / this.bar.dur;
      this.cui.barCursor(Math.min(1, this.bar.t));
      if (this.bar.t >= 1) this._barTimeout();
    }

    // resolve pause → back to the meters
    if (this.phase === 'resolve' && this.phaseT > 0.85) {
      if (this.pendingEcho && this.t >= this.pendingEcho.at) {
        this._damageEnemy(this.pendingEcho.dmg);
        this._burstAtCell('e', this.enemyCell, 0xffd27a);
        this.pendingEcho = null;
      }
      if (this.phase !== 'reward') this.phase = 'idle';
    }

    // the enemy's strike timeline
    if (this.phase === 'enemyTurn') {
      for (const s of this.strikes) {
        if (!s.cells && this.phaseT >= s.lockAt) {
          s.cells = this._strikeCells(s); // frozen red
          s.impactAt = s.lockAt + s.react;
          if (s.type === 'melee' || s.type === 'sweep') {
            this.dash = { until: this.t + s.react + 0.2, cell: s.cells[0] };
          }
        }
        if (s.cells && !s.struck && this.phaseT >= s.impactAt) {
          s.struck = true;
          this._strikeImpact(s.type === 'ranged' ? [s.cells[0]] : s.cells);
          if (!this.active) return;
        }
        // ranged shots roll toward the camera: the near square lands late
        if (s.type === 'ranged' && s.struck && !s.secondStruck && this.phaseT >= s.impactAt + 0.22) {
          s.secondStruck = true;
          this._strikeImpact([s.cells[1]]);
          if (!this.active) return;
        }
      }
      if (this.phaseT >= this.turnEndsAt) {
        // the patrol advances — periodic, readable
        this.enemy.patrolIdx = (this.enemy.patrolIdx + 1) % this.enemy.patrol.length;
        this.enemyCell = this.enemy.patrol[this.enemy.patrolIdx];
        if (this.enemy.statuses.slowTurns > 0) this.enemy.statuses.slowTurns -= 1;
        if (this.eclipseTurns > 0) this.eclipseTurns -= 1;
        this.strikes = [];
        this.phase = 'idle';
        this.cui.combatHint('');
      }
    }

    this._updateVisuals(dt);
    this._updateCamera(dt);
    void camera;
  }

  _updateVisuals(dt) {
    // figures ease back to their cells (and the paper hop relaxes)
    this.playerFig.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-dt * 12));
    const ep = this._cellLocal('e', this.enemyCell);
    let ex = ep.x, ez = ep.z;
    if (this.dash && this.t < this.dash.until) {
      // the foe lunges into the lane it bites
      const dp = this._cellLocal('p', this.dash.cell);
      ex = ex * 0.35 + dp.x * 0.65;
      ez = ez * 0.35 + (dp.z - CELL * 2.2) * 0.65;
    }
    this.enemyFig.position.x += (ex - this.enemyFig.position.x) * Math.min(1, dt * 10);
    this.enemyFig.position.z += (ez - this.enemyFig.position.z) * Math.min(1, dt * 10);
    this.enemyFig.position.y = 0.5 + Math.sin(this.t * 2.2) * 0.12;
    if (this._enemyFlashUntil && this.t > this._enemyFlashUntil) {
      this.enemyFig.userData.sprite.material.color.setHex(0xffffff);
      this._enemyFlashUntil = 0;
    }

    // overlays: start from nothing every frame, then paint states
    for (const side of ['p', 'e']) {
      for (const o of this.overlays[side]) {
        if (o.userData.flashDecay) {
          o.material.opacity = Math.max(0, o.material.opacity - dt * o.userData.flashDecay);
          if (o.material.opacity <= 0) o.userData.flashDecay = 0;
        } else {
          o.material.opacity = 0;
        }
      }
    }
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 7);

    // lane-hex lattice on the player board
    for (const d of this.debuffs) {
      if (d.kind !== 'lanelock') continue;
      for (let r = 0; r < 3; r++) {
        const o = this.overlays.p[r * 3 + d.lane];
        o.material.color.setHex(0x8a76e6);
        o.material.opacity = Math.max(o.material.opacity, 0.3 + pulse * 0.12);
      }
    }

    if (this.phase === 'target') {
      for (const c of this._patternCells(this.targetCell)) {
        const o = this.overlays.e[c];
        o.material.color.setHex(0x9fd8ff);
        o.material.opacity = Math.max(o.material.opacity, c === this.targetCell ? 0.4 + pulse * 0.25 : 0.28);
      }
      // foresight: where the foe will stand when the strike lands
      const fs = this.run.stats.foresight;
      if (fs >= 1) {
        const predicted = this.enemy.dodges
          ? this.enemy.patrol[(this.enemy.patrolIdx + 1) % this.enemy.patrol.length]
          : this.enemyCell;
        const o = this.overlays.e[predicted];
        o.material.color.setHex(0x8cf5a6);
        o.material.opacity = Math.max(o.material.opacity, 0.35);
        if (fs >= 2) {
          const after = this.enemy.patrol[(this.enemy.patrolIdx + (this.enemy.dodges ? 2 : 1)) % this.enemy.patrol.length];
          const o2 = this.overlays.e[after];
          o2.material.color.setHex(0x8cf5a6);
          o2.material.opacity = Math.max(o2.material.opacity, 0.16);
        }
        if (fs >= 3) {
          for (const c of this.enemy.patrol) {
            const o3 = this.overlays.e[c];
            o3.material.color.setHex(0x8cf5a6);
            o3.material.opacity = Math.max(o3.material.opacity, 0.08);
          }
        }
      }
    }

    if (this.phase === 'enemyTurn') {
      const lead = this._revealLead();
      const echo = this.run.stats.flags.echoVision;
      for (const s of this.strikes) {
        if (s.struck && (s.type !== 'ranged' || s.secondStruck)) continue;
        if (s.cells) {
          // committed: red, frozen
          for (const c of s.cells) {
            const o = this.overlays.p[c];
            o.material.color.setHex(0xff5f6d);
            o.material.opacity = Math.max(o.material.opacity, 0.6 + pulse * 0.2);
          }
        } else if (echo || this.phaseT >= s.lockAt - lead) {
          // tracking warning: amber chases the player's square
          for (const c of this._strikeCells(s)) {
            const o = this.overlays.p[c];
            o.material.color.setHex(0xffc46b);
            o.material.opacity = Math.max(o.material.opacity, 0.16 + pulse * 0.14
              + (echo && this.phaseT < s.lockAt - lead ? -0.06 : 0));
          }
        }
      }
    }
  }

  _updateCamera(dt) {
    const c = this.controls;
    c._focusTo = null;
    const center = new THREE.Vector3(0, 0, 1.6).applyMatrix4(this.stage.matrixWorld);
    c.target.lerp(center, 1 - Math.exp(-dt * 4));
    const wantDist = this.boss ? 33 : 27;
    c.dist += (wantDist - c.dist) * Math.min(1, dt * 2.6);
    c.pitch += (0.62 - c.pitch) * Math.min(1, dt * 2.6);
    let dy = this.stageYaw - c.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    c.yaw += dy * Math.min(1, dt * 2.6);
  }

  // dev/debug: force outcomes for smoke tests
  debugWin() { this._damageEnemy(this.enemy.hp); }
  debugState() {
    return {
      phase: this.phase, playerCell: this.playerCell, enemyCell: this.enemyCell,
      enemyHp: this.enemy?.hp, meters: [this.playerMeter, this.enemyMeter],
      debuffs: this.debuffs.map((d) => d.kind),
    };
  }
}
