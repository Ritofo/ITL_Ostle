"use client";

import { useMemo, useState } from 'react';
import GameBoard from '../components/GameBoard';
import { createInitialState, type GameState, applyMove, type Direction, getLegalMoves, getWinner, wouldSelfDrop, aiBestMove, buildAnimation, applyAnimationStep } from '../lib/ostle';

export default function Page() {
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiDepth] = useState(3);
  const [pending, setPending] = useState<{ idx: number; dir: Direction } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [animating, setAnimating] = useState(false);

  const winner = useMemo(() => getWinner(game), [game]);
  const legalMoves = useMemo(() => getLegalMoves(game), [game]);

  return (
    <main className="container">
      <h1>オストル</h1>
      <p className="subtitle">ブラウザで遊べる簡易実装（試作版）</p>

      <div className="panel">
        <div>
          <div className="status">
            手番: <span className={game.currentPlayer === 'W' ? 'a' : 'b'}>{game.currentPlayer}</span>
          </div>
          {winner && (
            <div className="winner">勝者: <span className={winner === 'W' ? 'a' : 'b'}>{winner}</span></div>
          )}
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <label style={{fontSize:14,color:'#9ca3af'}}>
            <input type="checkbox" checked={aiEnabled} onChange={e=>setAiEnabled(e.target.checked)} /> AI対戦
          </label>
          <button className="reset" onClick={() => { setGame(createInitialState()); setPending(null); setLogs([]); }}>リセット</button>
        </div>
      </div>

      <GameBoard
        game={game}
        legalMoves={legalMoves}
        onMove={(idx, dir: Direction) => {
          if (animating || getWinner(game)) return;
          // 自己落ちの二度押し確認
          const needConfirm = wouldSelfDrop(game, idx, dir);
          if (needConfirm) {
            if (pending && pending.idx === idx && pending.dir === dir) {
              setPending(null);
            } else {
              setPending({ idx, dir });
              setLogs(l=>["自分の駒が落ちます。同じ方向をもう一度で実行", ...l].slice(0,30));
              return;
            }
          }
          // アニメーション実行
          const steps = buildAnimation(game, idx, dir);
          if (!steps || steps.length === 0) return;
          setAnimating(true);
          setLogs(l=>[`${game.currentPlayer} ${idx} ${dir}`, ...l].slice(0,30));
          let i = 0;
          const run = (cur: GameState) => {
            if (i >= steps.length) {
              // 最終確定: prev保存と手番入替
              const after = applyMove(cur, { index: idx, dir });
              setGame(after);
              setAnimating(false);
              // AI手番ならAIもアニメーション
              setTimeout(() => {
                const winner = getWinner(after);
                if (!winner && aiEnabled && after.currentPlayer === 'B') {
                  const mv = aiBestMove(after, aiDepth);
                  if (!mv) return;
                  const ast = buildAnimation(after, mv.index, mv.dir);
                  if (!ast) return;
                  setAnimating(true);
                  setLogs(l=>[`AI ${mv.index} ${mv.dir}`, ...l].slice(0,30));
                  let j = 0;
                  const runAi = (state: GameState) => {
                    if (j >= ast.length) {
                      const final = applyMove(state, mv);
                      setGame(final);
                      setAnimating(false);
                      return;
                    }
                    const ns = applyAnimationStep(state, ast[j]);
                    j++;
                    setGame(ns);
                    setTimeout(() => runAi(ns), 180);
                  };
                  runAi(after);
                }
              }, 120);
              return;
            }
            const ns = applyAnimationStep(cur, steps[i]);
            i++;
            setGame(ns);
            setTimeout(() => run(ns), 180);
          };
          run(game);
        }}
      />

      {pending && (
        <div style={{marginTop:8, color:'#fca5a5'}}>確認: 自己落ちになります。もう一度同じ方向で実行します。</div>
      )}

      <details className="help">
        <summary>遊び方（Python版仕様・簡易）</summary>
        <ul>
          <li>7×7の内部5×5が盤面。外周は捕獲リング扱い。</li>
          <li>駒は W/B と 穴 H。両陣営とも自駒と穴を動かせます。</li>
          <li>押し込みで外周または穴に相手を落とすと取得。自己落ちは相手に加点。</li>
          <li>穴は押せず、捕獲にも使えません。隣の空きにのみ移動可。</li>
          <li>直前の盤面への完全回帰は禁止（コウ様のルール）。</li>
          <li>先に2取得した側の勝ち。</li>
        </ul>
      </details>

      <div style={{marginTop:16}}>
        <div style={{color:'#9ca3af', marginBottom:6}}>ログ</div>
        <ul style={{listStyle:'none', padding:0, margin:0}}>
          {logs.slice(0,10).map((t,i)=>(<li key={i} style={{color:'#e5e7eb', fontSize:14}}>{t}</li>))}
        </ul>
      </div>
    </main>
  );
}


