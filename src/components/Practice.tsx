import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb } from 'lucide-react';
import type { Question, Attempt } from '../types';
import { evaluate, type Evaluation } from '../services/evaluate';
interface Props {
  list: Question[];
  onExit: () => void;
  onAttempt: (a: Attempt) => void;
  title: string;
}
export function Practice({ list, onExit, onAttempt, title }: Props) {
  const [index, setIndex] = useState(0),
    [answer, setAnswer] = useState(''),
    [hint, setHint] = useState(false),
    [result, setResult] = useState<Evaluation | null>(null),
    [total, setTotal] = useState(0);
  const q = list[index];
  if (!q)
    return (
      <section className="panel">
        Nu există întrebări pentru această categorie. <button onClick={onExit}>Înapoi</button>
      </section>
    );
  function submit() {
    if (!answer.trim() || result) return;
    const r = evaluate(q, answer);
    setResult(r);
    setTotal((v) => v + r.score);
    onAttempt({
      questionId: q.id,
      score: r.score,
      answer,
      at: new Date().toISOString(),
    });
  }
  function next() {
    if (index === list.length - 1) {
      onExit();
      return;
    }
    setIndex((i) => i + 1);
    setAnswer('');
    setHint(false);
    setResult(null);
  }
  return (
    <main className="page">
      <button className="back" onClick={onExit}>
        <ArrowLeft size={17} /> Înapoi la acasă
      </button>
      <div className="practice-top">
        <div>
          <span className="eyebrow">{title}</span>
          <h1>Hai să exersăm! ✨</h1>
        </div>
        <span className="pill">
          {index + 1} / {list.length}
        </span>
      </div>
      <div className="progressbar">
        <span style={{ width: `${((index + 1) / list.length) * 100}%` }} />
      </div>
      <div className="panel question">
        <div className="qmeta">
          <span className="pill lavender">
            {q.level} ·{' '}
            {q.type === 'choice'
              ? 'Alege răspunsul'
              : q.type === 'order'
                ? 'Ordinea cuvintelor'
                : 'Scrie răspunsul'}
          </span>
          <span>⭐ {total} puncte</span>
        </div>
        <h2>{q.prompt}</h2>
        {q.type === 'choice' && q.options ? (
          <div className="options">
            {q.options.map((o, i) => (
              <button
                key={i}
                className={answer === o ? 'selected' : ''}
                disabled={!!result}
                onClick={() => setAnswer(o)}
              >
                {o}
              </button>
            ))}
          </div>
        ) : (
          <input
            className="answer"
            placeholder="Scrie răspunsul aici..."
            value={answer}
            disabled={!!result}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        )}
        {hint && (
          <div className="hint">
            <Lightbulb size={18} />
            {q.hint}
          </div>
        )}
        {result && (
          <div className={`feedback ${result.status}`}>
            <strong>
              {result.status === 'correct'
                ? 'Excelent! Răspuns corect! 🎉'
                : result.status === 'spelling'
                  ? 'Aproape perfect! Verifică ortografia.'
                  : result.status === 'partial'
                    ? 'Bună încercare! Ai câteva elemente corecte.'
                    : 'Mai încercăm! Așa învățăm. 💜'}{' '}
              · {result.score} puncte
            </strong>
            <p>
              <b>Răspuns recomandat:</b> {result.suggested}
            </p>
            <p>{q.explanation}</p>
          </div>
        )}
        <div className="actions">
          <button className="btn ghost" onClick={() => setHint((v) => !v)} disabled={!!result}>
            <Lightbulb size={17} /> Indiciu
          </button>
          {!result ? (
            <button className="btn primary" onClick={submit} disabled={!answer.trim()}>
              <CheckCircle2 size={17} /> Verifică
            </button>
          ) : (
            <button className="btn primary" onClick={next}>
              {index === list.length - 1 ? 'Termină' : 'Următoarea'} <ArrowRight size={17} />
            </button>
          )}
        </div>
      </div>
      <p className="smallnote">
        Răspunsurile libere sunt evaluate prin reguli simple; formulările alternative pot necesita
        verificare umană.
      </p>
    </main>
  );
}
