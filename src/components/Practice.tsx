import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb } from 'lucide-react';
import type { PublicQuestion, Attempt } from '../types';
import { checkAnswer, type AnswerResult } from '../services/answers';
import { getHint } from '../services/hints';
interface Props {
  list: PublicQuestion[];
  onExit: () => void;
  onAttempt: (a: Attempt) => void;
  title: string;
}
export function Practice({ list, onExit, onAttempt, title }: Props) {
  const [index, setIndex] = useState(0),
    [answer, setAnswer] = useState(''),
    [hint, setHint] = useState<string | null>(null),
    [hintLoading, setHintLoading] = useState(false),
    [hintError, setHintError] = useState<string | null>(null),
    [result, setResult] = useState<AnswerResult | null>(null),
    [submitting, setSubmitting] = useState(false),
    [submitError, setSubmitError] = useState<string | null>(null),
    [total, setTotal] = useState(0);
  const q = list[index];
  if (!q)
    return (
      <section className="panel">
        Nu există întrebări pentru această categorie. <button onClick={onExit}>Înapoi</button>
      </section>
    );
  async function submit() {
    if (!answer.trim() || result || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await checkAnswer(q.id, answer);
      setResult(response);
      setTotal((v) => v + response.score);
      onAttempt({ questionId: q.id, score: response.score, answer, at: new Date().toISOString() });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'A apărut o eroare.');
    } finally {
      setSubmitting(false);
    }
  }
  async function revealHint() {
    if (hintLoading || hint !== null || result) return;
    const questionId = q.id;
    setHintLoading(true);
    setHintError(null);
    try {
      const text = await getHint(questionId);
      // Ha időközben más kérdésre léptünk, ne jelenjen meg az előző segítség.
      if (list[index]?.id === questionId) setHint(text || 'Nu există încă un indiciu pentru această întrebare.');
    } catch (error) {
      setHintError(error instanceof Error ? error.message : 'Indiciul nu a putut fi încărcat.');
    } finally {
      setHintLoading(false);
    }
  }
  function next() {
    if (index === list.length - 1) {
      onExit();
      return;
    }
    setIndex((i) => i + 1);
    setAnswer('');
    setHint(null);
    setHintError(null);
    setResult(null);
    setSubmitError(null);
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
                disabled={!!result || submitting}
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
            disabled={!!result || submitting}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        )}
        {hint !== null && (
          <div className="hint">
            <Lightbulb size={18} />
            {hint}
          </div>
        )}
        {result && (
          <div className={`feedback ${result.correct ? 'correct' : 'incorrect'}`}>
            <strong>{result.correct ? 'Excelent! Răspuns corect! 🎉' : 'Mai încercăm! Așa învățăm. 💜'} · {result.score} puncte</strong>
            {result.suggested && <p><b>Răspuns recomandat:</b> {result.suggested}</p>}
            <p>{result.explanation}</p>
          </div>
        )}
        {hintError && <p role="alert" style={{ color: '#c0392b' }}>{hintError}</p>}
        {submitError && <p role="alert" style={{ color: '#c0392b' }}>{submitError}</p>}
        <div className="actions">
          <button className="btn ghost" onClick={revealHint} disabled={!!result || hint !== null || hintLoading || submitting}>
            <Lightbulb size={17} /> {hintLoading ? 'Se încarcă...' : 'Indiciu'}
          </button>
          {!result ? (
            <button className="btn primary" onClick={submit} disabled={!answer.trim() || submitting}>
              <CheckCircle2 size={17} /> {submitting ? 'Se verifică...' : 'Verifică'}
            </button>
          ) : (
            <button className="btn primary" onClick={next}>
              {index === list.length - 1 ? 'Termină' : 'Următoarea'} <ArrowRight size={17} />
            </button>
          )}
        </div>
      </div>
      <p className="smallnote">
        Poți cere un indiciu înainte de a răspunde. Verificarea se face în siguranță pe server.
      </p>
    </main>
  );
}
