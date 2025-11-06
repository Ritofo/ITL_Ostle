"use client";

import type { Direction, GameState, LegalMoves } from "../lib/ostle";

type Props = {
  game: GameState;
  legalMoves: LegalMoves;
  onMove: (index: number, dir: Direction) => void;
};

export default function GameBoard({ game, legalMoves, onMove }: Props) {
  const vis = game.visibleSize;
  const size = game.size;
  const offset = ((size - vis) >> 1) * size + ((size - vis) >> 1);
  const cells: Array<{ idx: number; ch: string }>[] = [];
  for (let r = 0; r < vis; r++) {
    const row: Array<{ idx: number; ch: string }> = [];
    for (let c = 0; c < vis; c++) {
      const idx = offset + r * size + c;
      row.push({ idx, ch: game.board[idx] });
    }
    cells.push(row);
  }

  return (
    <div className="board">
      <div className="grid">
        {cells.map((row, r) => (
          row.map(({ idx, ch }, c) => {
            const lm = legalMoves.get(idx);
            const selectable = !!lm && lm.size > 0;
            return (
              <div className="cell" key={`${idx}`}>
                {ch !== ' ' && (
                  ch === 'H' ? (
                    <div className={`piece ${selectable ? 'selectable' : ''}`} style={{ borderRadius: '50%', background: '#1f2937' }} />
                  ) : (
                    <div className={`piece ${ch === 'W' ? 'a' : 'b'} ${selectable ? 'selectable' : ''}`}></div>
                  )
                )}
                {selectable && (
                  <div className="controls">
                    {lm?.has('up') && (
                      <button className="ctrl up" aria-label="up" onClick={() => onMove(idx, 'up')}>▲</button>
                    )}
                    {lm?.has('down') && (
                      <button className="ctrl down" aria-label="down" onClick={() => onMove(idx, 'down')}>▼</button>
                    )}
                    {lm?.has('left') && (
                      <button className="ctrl left" aria-label="left" onClick={() => onMove(idx, 'left')}>◀</button>
                    )}
                    {lm?.has('right') && (
                      <button className="ctrl right" aria-label="right" onClick={() => onMove(idx, 'right')}>▶</button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
}


