export type Cell = ' ' | 'W' | 'B' | 'H';
export type Player = 'W' | 'B';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Board = Cell[]; // 7x7 as 1D array length 49

export type GameState = {
  board: Board;
  size: number; // 7
  visibleSize: number; // 5
  currentPlayer: Player;
  captured: { W: number; B: number };
  pW: number[];
  pB: number[];
  hole: number; // single index
  prevBoardState?: string[] | null; // for ko-like rule
};

export type Move = { index: number; dir: Direction };

export type LegalMoves = Map<number, Set<Direction>>; // key = index

export function createInitialState(): GameState {
  const size = 7;
  const visibleSize = 5;
  const N = size * size;
  const board: Board = Array(N).fill(' ' as Cell);
  const pW = [8, 9, 10, 11, 12];
  const pB = [36, 37, 38, 39, 40];
  const hole = 24;
  for (const i of pW) board[i] = 'W';
  for (const i of pB) board[i] = 'B';
  board[hole] = 'H';
  return {
    board,
    size,
    visibleSize,
    currentPlayer: 'W',
    captured: { W: 0, B: 0 },
    pW: pW.slice(),
    pB: pB.slice(),
    hole,
    prevBoardState: null,
  };
}

export function getLegalMoves(game: GameState): LegalMoves {
  const res: LegalMoves = new Map();
  const dirs: Direction[] = ['up', 'down', 'left', 'right'];
  const pieces = (game.currentPlayer === 'W' ? game.pW : game.pB).concat([game.hole]);
  const seen = new Set<number>();
  for (const idx of pieces) {
    if (seen.has(idx)) continue;
    seen.add(idx);
    const ch = game.board[idx];
    if (!['W', 'B', 'H'].includes(ch)) continue;
    const allowed = new Set<Direction>();
    for (const d of dirs) {
      if (validMove(game, idx, d)) allowed.add(d);
    }
    if (allowed.size > 0) res.set(idx, allowed);
  }
  return res;
}

export function applyMove(game: GameState, move: Move): GameState {
  if (!validMove(game, move.index, move.dir)) return game;
  const next = deepClone(game);
  const before = next.board.slice();
  const ok = applyImmediate(next, move.index, move.dir);
  if (!ok) return game;
  next.prevBoardState = before;
  next.currentPlayer = next.currentPlayer === 'W' ? 'B' : 'W';
  return next;
}

export function getWinner(game: GameState): Player | null {
  if (game.captured.W >= 2) return 'W';
  if (game.captured.B >= 2) return 'B';
  return null;
}

// ---- Helpers for UI / AI ----
export function wouldSelfDrop(game: GameState, index: number, dir: Direction): boolean {
  const mover = game.board[index];
  if (mover !== 'W' && mover !== 'B') return false;
  const { chain, stopKind } = scanChainUntil(game, index, dir);
  if (stopKind === 'ring' || stopKind === 'offboard') {
    const tailCh = game.board[chain[chain.length - 1]];
    return tailCh === mover;
  }
  if (stopKind === 'hole') {
    const fallCh = game.board[chain[chain.length - 1]];
    return fallCh === mover;
  }
  return false;
}

export function listLegalMovesFor(game: GameState, side: Player): Move[] {
  const dirs: Direction[] = ['up', 'down', 'left', 'right'];
  const pieces = (side === 'W' ? game.pW : game.pB).concat([game.hole]);
  const res: Move[] = [];
  const seen = new Set<number>();
  for (const idx of pieces) {
    if (seen.has(idx)) continue;
    seen.add(idx);
    const ch = game.board[idx];
    if (!['W','B','H'].includes(ch)) continue;
    for (const d of dirs) {
      // simulate as if currentPlayer == side
      const tmp = deepClone(game);
      tmp.currentPlayer = side;
      if (validMove(tmp, idx, d)) res.push({ index: idx, dir: d });
    }
  }
  return res;
}

export function evaluate(game: GameState): number {
  // Positive is good for B (AI), negative good for W (player)
  const weights = { captures: 200.0, material: 120.0, mobility: 3.5, hole_center: 0.5 };
  let score = 0;
  score += weights.captures * (game.captured.B - game.captured.W);
  score += weights.material * (game.pB.length - game.pW.length);
  const movesB = listLegalMovesFor(game, 'B').length;
  const movesW = listLegalMovesFor(game, 'W').length;
  score += weights.mobility * (movesB - movesW);
  const center = Math.floor((game.size * game.size) / 2);
  const h = game.hole;
  const r1 = Math.floor(h / game.size), c1 = h % game.size;
  const r2 = Math.floor(center / game.size), c2 = center % game.size;
  const manhattan = Math.abs(r1 - r2) + Math.abs(c1 - c2);
  score += weights.hole_center * (8 - manhattan);
  return score;
}

export function minimax(game: GameState, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  const winner = getWinner(game);
  if (depth === 0 || winner) return evaluate(game);
  if (maximizing) {
    let best = -Infinity;
    const moves = listLegalMovesFor(game, 'B');
    if (moves.length === 0) return evaluate(game);
    for (const mv of moves) {
      const snap = deepClone(game);
      snap.currentPlayer = 'B';
      const ok = applyImmediate(snap, mv.index, mv.dir);
      if (!ok) continue;
      snap.prevBoardState = game.board.slice();
      snap.currentPlayer = 'W';
      const val = minimax(snap, depth - 1, alpha, beta, false);
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    const moves = listLegalMovesFor(game, 'W');
    if (moves.length === 0) return evaluate(game);
    for (const mv of moves) {
      const snap = deepClone(game);
      snap.currentPlayer = 'W';
      const ok = applyImmediate(snap, mv.index, mv.dir);
      if (!ok) continue;
      snap.prevBoardState = game.board.slice();
      snap.currentPlayer = 'B';
      const val = minimax(snap, depth - 1, alpha, beta, true);
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function aiBestMove(game: GameState, depth = 3): Move | null {
  let bestVal = -Infinity;
  let best: Move | null = null;
  const moves = listLegalMovesFor(game, 'B');
  for (const mv of moves.sort(() => Math.random() - 0.5)) {
    const snap = deepClone(game);
    snap.currentPlayer = 'B';
    const ok = applyImmediate(snap, mv.index, mv.dir);
    if (!ok) continue;
    snap.prevBoardState = game.board.slice();
    snap.currentPlayer = 'W';
    const val = minimax(snap, Math.max(0, depth - 1), -Infinity, Infinity, false);
    if (val > bestVal) {
      bestVal = val;
      best = mv;
    }
  }
  return best;
}

export function aiMove(game: GameState, depth = 3): GameState {
  if (game.currentPlayer !== 'B') return game;
  const mv = aiBestMove(game, depth);
  if (!mv) return game;
  const next = applyMove(game, mv);
  return next;
}

// ---- Animation steps ----
export type AnimationStep =
  | { kind: 'move'; src: number; dst: number }
  | { kind: 'clear'; src: number }
  | { kind: 'capture'; at: number; creditTo: Player };

export function buildAnimation(game: GameState, pieceIdx: number, direction: Direction): AnimationStep[] | null {
  const mover = game.board[pieceIdx];
  if (!['W','B','H'].includes(mover)) return null;
  const { chain, stopKind, stopIdx } = scanChainUntil(game, pieceIdx, direction);
  const steps: AnimationStep[] = [];

  if (stopKind === 'empty') {
    // move tail -> empty, then each piece follows
    let prev = stopIdx!;
    for (let i = chain.length - 1; i >= 0; i--) {
      const src = chain[i];
      steps.push({ kind: 'move', src, dst: prev });
      prev = src;
    }
    return steps;
  }

  if (stopKind === 'ring' || stopKind === 'offboard') {
    const tail = chain[chain.length - 1];
    const tailCh = game.board[tail];
    if (mover === 'H' || tailCh === 'H') return null;
    const selfDrop = (tailCh === mover);
    const creditTo: Player = selfDrop ? (game.currentPlayer === 'W' ? 'B' : 'W') : game.currentPlayer;
    steps.push({ kind: 'capture', at: tail, creditTo });
    for (let i = chain.length - 1; i >= 1; i--) {
      const src = chain[i - 1];
      const dst = chain[i];
      steps.push({ kind: 'move', src, dst });
    }
    steps.push({ kind: 'clear', src: chain[0] });
    return steps;
  }

  if (stopKind === 'hole') {
    const fall = chain[chain.length - 1];
    const fallCh = game.board[fall];
    if (mover === 'H' || fallCh === 'H') return null;
    const selfDrop = (fallCh === mover);
    const creditTo: Player = selfDrop ? (game.currentPlayer === 'W' ? 'B' : 'W') : game.currentPlayer;
    steps.push({ kind: 'capture', at: fall, creditTo });
    for (let i = chain.length - 2; i >= 0; i--) {
      const src = chain[i];
      const dst = nextIndex(game, src, direction);
      if (dst == null) return null;
      steps.push({ kind: 'move', src, dst });
    }
    steps.push({ kind: 'clear', src: chain[0] });
    return steps;
  }

  return null;
}

export function applyAnimationStep(game: GameState, step: AnimationStep): GameState {
  const g = deepClone(game);
  if (step.kind === 'move') {
    // single safe move
    if (!movePieceSafe(g, step.src, step.dst)) return game;
    return g;
  }
  if (step.kind === 'clear') {
    if (g.board[step.src] !== ' ') {
      g.board[step.src] = ' ';
      g.pW = g.pW.filter(x => x !== step.src);
      g.pB = g.pB.filter(x => x !== step.src);
      if (g.hole === step.src) g.hole = step.src; // no-op, hole should not be cleared here normally
    }
    return g;
  }
  if (step.kind === 'capture') {
    removePieceAt(g, step.at, step.creditTo);
    return g;
  }
  return game;
}

function validMove(game: GameState, pieceIdx: number, direction: Direction): boolean {
  const mover = game.board[pieceIdx];
  if (!['W', 'B', 'H'].includes(mover)) return false;
  const { chain, stopKind, stopIdx } = scanChainUntil(game, pieceIdx, direction);

  // Hole rules
  if (mover === 'H') {
    if (stopKind === 'empty') {
      // hole cannot push pieces; only move into adjacent empty
      if (chain.length > 1) return false;
      return true;
    }
    // cannot cause captures by ring/offboard/hole
    return false;
  }

  // Offboard or ring capture: allow self-drop
  if (stopKind === 'offboard' || stopKind === 'ring') {
    const tailCh = game.board[chain[chain.length - 1]];
    if (tailCh === 'H' || tailCh === ' ') return false;
  }

  // Hole-fall capture
  if (stopKind === 'hole') {
    const fallCh = game.board[chain[chain.length - 1]];
    if (fallCh !== 'W' && fallCh !== 'B') return false;
  }

  // Ko-like: forbid returning to previous full-board state
  const snap = deepClone(game);
  const ok = applyImmediate(snap, pieceIdx, direction);
  if (!ok) return false;
  const newState = snap.board;
  if (game.prevBoardState && arraysEqual(newState, game.prevBoardState)) {
    return false;
  }
  return true;
}

function applyImmediate(game: GameState, pieceIdx: number, direction: Direction): boolean {
  const mover = game.board[pieceIdx];
  const { chain, stopKind, stopIdx } = scanChainUntil(game, pieceIdx, direction);
  if (!['W', 'B', 'H'].includes(mover)) return false;

  if (stopKind === 'empty') {
    // slide into empty
    let prev = stopIdx!;
    for (let i = chain.length - 1; i >= 0; i--) {
      const src = chain[i];
      if (!movePieceSafe(game, src, prev)) return false;
      prev = src;
    }
    return true;
  }

  if (stopKind === 'ring' || stopKind === 'offboard') {
    const tail = chain[chain.length - 1];
    const tailCh = game.board[tail];
    if (mover === 'H' || tailCh === 'H') return false;
    // credit capture
    const selfDrop = (tailCh === mover);
    const creditTo: Player = selfDrop ? (game.currentPlayer === 'W' ? 'B' : 'W') : game.currentPlayer;
    removePieceAt(game, tail, creditTo);
    for (let i = chain.length - 1; i >= 1; i--) {
      const src = chain[i - 1];
      const dst = chain[i];
      if (!movePieceSafe(game, src, dst)) return false;
    }
    // clear original
    game.board[chain[0]] = ' ';
    updateListsAfterClear(game, chain[0]);
    return true;
  }

  if (stopKind === 'hole') {
    const fall = chain[chain.length - 1];
    const fallCh = game.board[fall];
    if (mover === 'H' || fallCh === 'H') return false;
    const selfDrop = (fallCh === mover);
    const creditTo: Player = selfDrop ? (game.currentPlayer === 'W' ? 'B' : 'W') : game.currentPlayer;
    removePieceAt(game, fall, creditTo);
    for (let i = chain.length - 2; i >= 0; i--) {
      const src = chain[i];
      const dst = nextIndex(game, src, direction);
      if (dst == null) return false;
      if (!movePieceSafe(game, src, dst)) return false;
    }
    // clear original
    game.board[chain[0]] = ' ';
    updateListsAfterClear(game, chain[0]);
    return true;
  }

  return false;
}

export function scanChainUntil(game: GameState, startIdx: number, direction: Direction): { chain: number[]; stopKind: 'offboard'|'ring'|'empty'|'hole'; stopIdx: number | null } {
  const chain: number[] = [startIdx];
  let cur = nextIndex(game, startIdx, direction);
  while (true) {
    if (cur == null) return { chain, stopKind: 'offboard', stopIdx: null };
    if (isInOuterRing(game, cur)) return { chain, stopKind: 'ring', stopIdx: cur };
    const cell = game.board[cur];
    if (cell === ' ') return { chain, stopKind: 'empty', stopIdx: cur };
    if (cell === 'H') return { chain, stopKind: 'hole', stopIdx: cur };
    chain.push(cur);
    cur = nextIndex(game, cur, direction);
  }
}

function nextIndex(game: GameState, cur: number, direction: Direction): number | null {
  const size = game.size;
  if (direction === 'left') {
    if (cur % size === 0) return null;
    return cur - 1;
  }
  if (direction === 'right') {
    if (cur % size === size - 1) return null;
    return cur + 1;
  }
  if (direction === 'up') {
    const nxt = cur - size;
    return nxt >= 0 ? nxt : null;
  }
  if (direction === 'down') {
    const nxt = cur + size;
    return nxt < size * size ? nxt : null;
  }
  return null;
}

function isInOuterRing(game: GameState, idx: number): boolean {
  const size = game.size;
  const vis = game.visibleSize;
  const r = Math.floor(idx / size);
  const c = idx % size;
  const offset = (size - vis) >> 1;
  const sr = r - offset;
  const sc = c - offset;
  const inVisible = sr >= 0 && sr < vis && sc >= 0 && sc < vis;
  return !inVisible;
}

function movePieceSafe(game: GameState, src: number, dst: number): boolean {
  if (src === dst) return true;
  const ch = game.board[src];
  if (ch === ' ') return false;
  if (game.board[dst] !== ' ') return false;
  game.board[dst] = ch;
  game.board[src] = ' ';
  if (ch === 'W') game.pW = game.pW.map(x => (x === src ? dst : x));
  else if (ch === 'B') game.pB = game.pB.map(x => (x === src ? dst : x));
  else if (ch === 'H') game.hole = dst;
  return true;
}

function removePieceAt(game: GameState, idx: number, creditTo: Player) {
  const ch = game.board[idx];
  if (ch === 'W') {
    game.pW = game.pW.filter(x => x !== idx);
    if (creditTo === 'B') game.captured.B += 1;
  } else if (ch === 'B') {
    game.pB = game.pB.filter(x => x !== idx);
    if (creditTo === 'W') game.captured.W += 1;
  }
  game.board[idx] = ' ';
}

function updateListsAfterClear(game: GameState, src: number) {
  const ch = ' ';
  // if clearing src, ensure lists don't retain src
  game.pW = game.pW.filter(x => x !== src);
  game.pB = game.pB.filter(x => x !== src);
  if (game.hole === src) {
    // shouldn't happen in our moves, but guard
    game.hole = game.hole;
  }
}

function arraysEqual(a: string[] | Board, b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function deepClone(g: GameState): GameState {
  return {
    board: g.board.slice(),
    size: g.size,
    visibleSize: g.visibleSize,
    currentPlayer: g.currentPlayer,
    captured: { W: g.captured.W, B: g.captured.B },
    pW: g.pW.slice(),
    pB: g.pB.slice(),
    hole: g.hole,
    prevBoardState: g.prevBoardState ? g.prevBoardState.slice() : null,
  };
}

function delta(dir: Direction) {
  switch (dir) {
    case 'up': return { dr: -1, dc: 0 } as const;
    case 'down': return { dr: 1, dc: 0 } as const;
    case 'left': return { dr: 0, dc: -1 } as const;
    case 'right': return { dr: 0, dc: 1 } as const;
  }
}

