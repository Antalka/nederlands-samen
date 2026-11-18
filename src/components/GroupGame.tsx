import { useCallback, useEffect, useRef, useState } from 'react';
import { Users, ArrowLeft, Trophy, Play, Copy, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { topics } from './Home';
import { createGame, joinGame, getGameState, startGame, advanceGame, submitGameAnswer, type GameState } from '../services/groupGame';

export function GroupGame({ nickname, onExit }: { nickname: string; onExit: () => void }) {
  const [codeInput, setCodeInput] = useState('');
  const [code, setCode] = useState('');
  const [topic, setTopic] = useState('mixed');
  const [count, setCount] = useState(10);
  const [game, setGame] = useState<GameState | null>(null);
  const [answer, setAnswer] = useState('');
  const [response, setResponse] = useState<{ correct: boolean; points: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(30);
  const previousIndex = useRef(-1);

  const refresh = useCallback(async () => {
    if (!code) return;
    try {
      const state = await getGameState(code);
      setGame(state);
      if (state.index !== previousIndex.current || state.status === 'finished') {
        previousIndex.current = state.index;
        setAnswer('');
        setResponse(null);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Nu se poate actualiza jocul.'); }
  }, [code]);

  useEffect(() => {
    if (!code) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    const channel = supabase.channel(`group-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_games' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_players' }, () => void refresh())
      .subscribe();
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [code, refresh]);

  useEffect(() => {
    if (!game?.startedAt || game.status !== 'playing') return;
    const update = () => setRemaining(Math.max(0, 30 - Math.floor((Date.now() - new Date(game.startedAt!).getTime()) / 1000)));
    update();
    const timer = window.setInterval(update, 500);
    return () => window.clearInterval(timer);
  }, [game?.startedAt, game?.status]);

  async function action(fn: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await fn(); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'A apărut o eroare.'); }
    finally { setBusy(false); }
  }
  const create = () => action(async () => { const newCode = await createGame(nickname, topic, count); setCode(newCode); });
  const join = () => action(async () => { const normalized = codeInput.trim(); await joinGame(normalized, nickname); setCode(normalized); });
  const submit = () => action(async () => {
    if (!answer.trim()) return;
    const result = await submitGameAnswer(code, answer);
    setResponse(result);
  });
  const next = () => action(() => advanceGame(code));

  return <main className="page group-game">
    <button className="back" onClick={onExit}><ArrowLeft size={17} /> Înapoi</button>
    <div className="practice-top"><div><span className="eyebrow">NEDERLANDS SAMEN</span><h1><Users size={30} /> Joc de grup 🎮</h1></div></div>
    {!code ? <div className="group-layout">
      <section className="panel group-box">
        <h2>Creează un joc</h2><p>Oricine poate organiza un joc și poate participa!</p>
        <label>Categoria</label>
        <select value={topic} onChange={e => setTopic(e.target.value)}><option value="mixed">Toate categoriile</option>{topics.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        <label>Numărul de întrebări</label><select value={count} onChange={e => setCount(Number(e.target.value))}><option value={5}>5</option><option value={10}>10</option><option value={15}>15</option><option value={20}>20</option></select>
        <button className="btn primary" disabled={busy} onClick={create}>Creează camera <Play size={17} /></button>
      </section>
      <section className="panel group-box"><h2>Intră într-un joc</h2><p>Introdu codul primit de la organizator.</p>
        <label>Codul camerei (6 cifre)</label><input inputMode="numeric" maxLength={6} placeholder="123456" value={codeInput} onChange={e => setCodeInput(e.target.value.replace(/\D/g, ''))} />
        <button className="btn primary" disabled={busy || codeInput.length !== 6} onClick={join}>Intră în cameră</button>
      </section>
    </div> : !game ? <div className="panel">Se conectează la camera {code}...</div> : <>
      <div className="panel group-room-header"><div><span className="eyebrow">CODUL CAMEREI</span><h2>{code}</h2></div><button className="btn ghost" onClick={() => void navigator.clipboard?.writeText(code)}><Copy size={16}/> Copiază</button></div>
      {game.status === 'lobby' && <section className="panel group-box"><h2>Sala de așteptare</h2><p>Trimite codul colegilor. Organizatorul poate juca împreună cu ceilalți.</p>
        <p>👥 {game.players.length} participanți</p>
        {game.isHost ? <button className="btn primary" disabled={busy} onClick={() => action(() => startGame(code))}>Începe jocul <Play size={17}/></button> : <p>Așteptăm ca organizatorul să înceapă jocul...</p>}
      </section>}
      {game.status === 'playing' && game.question && <section className="panel question group-box" key={game.index}>
        <div className="qmeta"><span className="pill lavender">Întrebarea {game.index + 1} / {game.count}</span><span className="pill">⏱ {remaining}s</span></div>
        <h2>{game.question.prompt}</h2>
        {game.question.type === 'choice' && game.question.options ? <div className="options">{game.question.options.map(option => <button key={option} className={answer === option ? 'selected' : ''} disabled={game.answered || busy || remaining === 0} onClick={() => setAnswer(option)}>{option}</button>)}</div> : <input className="answer" placeholder="Scrie răspunsul..." value={answer} disabled={game.answered || busy || remaining === 0} onChange={e => setAnswer(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !game.answered) void submit(); }} />}
        {game.answered ? <div className="feedback correct"><CheckCircle2 size={18} /> {response ? (response.correct ? `Corect! +${response.points} puncte` : 'Răspuns greșit. +0 puncte') : (game.lastCorrect ? 'Răspuns corect! 🎉' : 'Răspuns înregistrat.')}<p>Așteaptă următoarea întrebare.</p></div> : <button className="btn primary" disabled={busy || !answer.trim() || remaining === 0} onClick={submit}>Trimite răspunsul</button>}
        {game.isHost && <div className="group-next"><button className="btn ghost" disabled={busy || (remaining > 0 && !game.players.every(p => p.answered))} onClick={next}>{game.index + 1 === game.count ? 'Încheie jocul' : 'Următoarea întrebare'} →</button><small>Poți continua când toți au răspuns sau expiră timpul.</small></div>}
      </section>}
      {game.status === 'finished' && <section className="panel group-box"><h2><Trophy size={26}/> Clasament final 🏆</h2><p>Felicitări tuturor!</p><button className="btn primary" onClick={() => { setCode(''); setGame(null); previousIndex.current=-1; }}>Joc nou</button></section>}
      <section className="panel group-box"><h3>{game.status === 'finished' ? 'Rezultate' : 'Participanți și puncte'}</h3><ol className="group-players">{game.players.map((p,i) => <li key={`${p.nickname}-${i}`}><span>{i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{p.nickname}{p.isHost ? ' 👑' : ''}{game.status === 'playing' && p.answered ? ' ✓' : ''}</span><strong>{p.score} ⭐</strong></li>)}</ol></section>
    </>}
    {error && <div className="panel" role="alert" style={{ color: '#b73543', marginTop: 16 }}>{error}</div>}
  </main>;
}
