// Breadth-first pathfinding over the global hex map. Uniform step cost;
// blocked hexes (stormwalls, sealed secret paths) are impassable until unlocked.

import * as Hx from './hexmath.js';

export function findPath(hexes, fromKey, toKey, maxExpand = 40000) {
  if (fromKey === toKey) return [fromKey];
  if (!hexes.has(fromKey) || !hexes.has(toKey)) return null;
  const target = hexes.get(toKey);
  if (target.blocked) return null;

  const cameFrom = new Map([[fromKey, null]]);
  let frontier = [fromKey];
  let expanded = 0;

  while (frontier.length && expanded < maxExpand) {
    const next = [];
    for (const cur of frontier) {
      const h = hexes.get(cur);
      for (const d of Hx.DIRS) {
        const nk = Hx.key(h.q + d[0], h.r + d[1]);
        if (cameFrom.has(nk)) continue;
        const nh = hexes.get(nk);
        if (!nh || nh.blocked) continue;
        cameFrom.set(nk, cur);
        if (nk === toKey) {
          const path = [nk];
          let back = cur;
          while (back) { path.push(back); back = cameFrom.get(back); }
          return path.reverse();
        }
        next.push(nk);
        expanded++;
      }
    }
    frontier = next;
  }
  return null;
}
