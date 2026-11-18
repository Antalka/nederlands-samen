import {
  ArrowRight,
  BookOpen,
  Layers3,
  MessagesSquare,
  Users,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import type { Topic, Progress } from '../types';
export const topics: {
  id: Topic;
  label: string;
  detail: string;
  emoji: string;
}[] = [
  {
    id: 'negation',
    label: 'Niet & geen',
    detail: 'Negația explicată simplu',
    emoji: '🚫',
  },
  {
    id: 'modal',
    label: 'Verbe modale',
    detail: 'Kunnen, moeten, willen, mogen',
    emoji: '💬',
  },
  {
    id: 'verbs',
    label: 'Verbe uzuale',
    detail: 'Zijn, hebben, gaan și altele',
    emoji: '📝',
  },
  {
    id: 'vocab',
    label: 'Vocabular',
    detail: 'Cuvinte utile în fiecare zi',
    emoji: '📚',
  },
  {
    id: 'order',
    label: 'Ordinea cuvintelor',
    detail: 'Construiește propoziții',
    emoji: '🧩',
  },
  {
    id: 'translation',
    label: 'Traducere',
    detail: 'Română → neerlandeză',
    emoji: '🌍',
  },
  {
    id: 'general',
    label: 'Gramatică mixtă',
    detail: 'Recapitulare A1–A2',
    emoji: '🎯',
  },
];
interface Props {
  progress: Progress;
  onStart: (mode: 'mixed' | 'topic' | 'situations', topic?: Topic) => void;
  onGroup: () => void;
  topicCounts: Partial<Record<Topic, number>>;
}
export function Home({ progress, onStart, onGroup, topicCounts }: Props) {
  const points = progress.attempts.reduce((n, a) => n + a.score, 0);
  return (
    <main className="page">
      <div className="hero">
        <span className="eyebrow">🇳🇱 ÎNVĂȚĂM ÎMPREUNĂ</span>
        <h1>Bună, {progress.name}! 👋</h1>
        <p>Un pas mic în fiecare zi te duce mai aproape de olandeză. Ești gata să exersezi?</p>
        <button className="btn primary" onClick={() => onStart('mixed')}>
          Începe exercițiile <ArrowRight size={18} />
        </button>
        <div className="hero-emoji">🌷</div>
      </div>
      <div className="stats">
        <div>
          <strong>{progress.attempts.length}</strong>
          <span>Răspunsuri date</span>
        </div>
        <div>
          <strong>{points}</strong>
          <span>Puncte adunate</span>
        </div>
        <div>
          <strong>{progress.attempts.filter((a) => a.score >= 80).length}</strong>
          <span>Răspunsuri reușite</span>
        </div>
      </div>
      <div className="section-heading">
        <div>
          <span className="eyebrow">ALEGE CUM ÎNVEȚI</span>
          <h2>Ce exersăm astăzi?</h2>
        </div>
      </div>
      <div className="mode-grid">
        <button className="mode-card" onClick={() => onStart('mixed')}>
          <div className="mode-icon purple">
            <Layers3 />
          </div>
          <h3>Exersează mixt</h3>
          <p>Întrebări variate pentru o provocare nouă.</p>
          <span>
            Începe <ArrowRight size={16} />
          </span>
        </button>
        <button
          className="mode-card"
          onClick={() => document.getElementById('topics')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <div className="mode-icon peach">
            <BookOpen />
          </div>
          <h3>Exersează pe teme</h3>
          <p>Alege exact regula pe care vrei să o înțelegi.</p>
          <span>
            Vezi temele <ArrowRight size={16} />
          </span>
        </button>
        <button className="mode-card" onClick={() => onStart('situations')}>
          <div className="mode-icon mint">
            <MessagesSquare />
          </div>
          <h3>Situații din viața reală</h3>
          <p>La magazin, la medic, la serviciu și în oraș.</p>
          <span>
            Exersează <ArrowRight size={16} />
          </span>
        </button>
      </div>
      <div className="section-heading" id="topics">
        <div>
          <span className="eyebrow">ÎNVAȚĂ ÎN RITMUL TĂU</span>
          <h2>Teme de practică</h2>
        </div>
        <span className="soft-tag">
          <GraduationCap size={16} /> A1–A2
        </span>
      </div>
      <div className="topics-grid">
        {topics.map((t) => (
          <button key={t.id} className="topic-card" onClick={() => onStart('topic', t.id)}>
            <span className="topic-emoji">{t.emoji}</span>
            <div>
              <strong>{t.label}</strong>
              <small>{t.detail}</small>
            </div>
            <span className="topic-count" title="Exerciții disponibile">
              <BookOpen size={13} /> {topicCounts[t.id] ?? '…'}
            </span>
            <ArrowRight size={18} />
          </button>
        ))}
      </div>
      <div className="group-banner">
        <div className="mode-icon purple">
          <Users />
        </div>
        <div>
          <h3>
            Învățăm împreună! <span className="soon">Binnenkort beschikbaar</span>
          </h3>
          <p>În curând: camere de joc, provocări și clasament live.</p>
        </div>
        <button className="btn ghost" onClick={onGroup}>
          Detalii <ArrowRight size={16} />
        </button>
      </div>
      <p className="footerline">
        <Sparkles size={15} /> Nederlands Samen · Învață cu încredere, pas cu pas.
      </p>
    </main>
  );
}
