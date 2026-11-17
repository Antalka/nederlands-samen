import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Home as HomeIcon, Users, UserRound, ArrowRight } from 'lucide-react';
import { Home, topics } from './components/Home';
import { Practice } from './components/Practice';
import { questions } from './data/questions';
import { load, save } from './services/storage';
import type { Progress, PracticeMode, Topic, Question, Attempt } from './types';
type Page = 'home' | 'practice' | 'group';
export default function App() {
  const [progress, setProgress] = useState<Progress>(load);
  const [draft, setDraft] = useState('');
  const [page, setPage] = useState<Page>('home');
  const [mode, setMode] = useState<PracticeMode>('mixed');
  const [topic, setTopic] = useState<Topic>('general');
  const [session, setSession] = useState(0);
  useEffect(() => save(progress), [progress]);
  const list = useMemo(() => {
    let pool = questions.filter((q) =>
      mode === 'situations'
        ? q.topic === 'situations'
        : mode === 'topic'
          ? q.topic === topic
          : true,
    );
    if (mode === 'mixed') {
      pool = [...pool].sort(
        (a, b) =>
          ((a.id.charCodeAt(0) * 17 + a.id.length * 13 + session * 31) % 101) -
          ((b.id.charCodeAt(0) * 17 + b.id.length * 13 + session * 31) % 101),
      );
      return pool.slice(0, 15);
    }
    return pool;
  }, [mode, topic, session]);
  function start(m: PracticeMode, t?: Topic) {
    setMode(m);
    if (t) setTopic(t);
    setSession((x) => x + 1);
    setPage('practice');
    window.scrollTo(0, 0);
  }
  function onAttempt(a: Attempt) {
    setProgress((p) => ({ ...p, attempts: [...p.attempts, a] }));
  }
  if (!progress.name.trim())
    return (
      <div className="welcome">
        <div className="welcome-card">
          <div className="brand-icon">
            NS<span>✦</span>
          </div>
          <div className="welcome-flower">🌷</div>
          <span className="eyebrow">BINE AI VENIT</span>
          <h1>
            Welkom bij
            <br />
            Nederlands Samen!
          </h1>
          <p>Învățăm neerlandeza împreună, pas cu pas. Cum te numești?</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) setProgress((p) => ({ ...p, name: draft.trim().slice(0, 32) }));
            }}
          >
            <input
              autoFocus
              placeholder="Numele tău"
              value={draft}
              maxLength={32}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="btn primary" disabled={!draft.trim()}>
              Hai să începem <ArrowRight size={18} />
            </button>
          </form>
          <small>Fără cont și fără parolă. Progresul rămâne în acest browser.</small>
        </div>
      </div>
    );
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            NS<span>✦</span>
          </div>
          <div>
            <strong>Nederlands Samen</strong>
            <small>Învățăm împreună 🇳🇱</small>
          </div>
        </div>
        <div className="nav-label">MENIU</div>
        <nav>
          <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>
            <HomeIcon size={19} /> Acasă
          </button>
          <button className={page === 'practice' ? 'active' : ''} onClick={() => start('mixed')}>
            <BookOpen size={19} /> Exersează
          </button>
          <button className={page === 'group' ? 'active' : ''} onClick={() => setPage('group')}>
            <Users size={19} /> Joc de grup
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">
            <UserRound size={18} />
          </div>
          <div>
            <strong>{progress.name}</strong>
            <small>Continuă să înveți 💜</small>
          </div>
          <button title="Schimbă numele" onClick={() => setProgress((p) => ({ ...p, name: '' }))}>
            ✎
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>🇳🇱 Nederlands Samen</span>
          <span className="user-chip">👋 {progress.name}</span>
        </header>
        {page === 'home' ? (
          <Home progress={progress} onStart={start} onGroup={() => setPage('group')} />
        ) : page === 'practice' ? (
          <Practice
            key={session}
            list={list as Question[]}
            title={
              mode === 'mixed'
                ? 'EXERCIȚII MIXTE'
                : mode === 'situations'
                  ? 'SITUAȚII REALE'
                  : topics.find((t) => t.id === topic)?.label || 'EXERCIȚII'
            }
            onExit={() => setPage('home')}
            onAttempt={onAttempt}
          />
        ) : (
          <main className="page">
            <button className="back" onClick={() => setPage('home')}>
              ← Înapoi
            </button>
            <div className="panel group-coming">
              <div className="huge">🎮</div>
              <span className="eyebrow">BINNENKORT BESCHIKBAAR</span>
              <h1>Jocul de grup vine în curând!</h1>
              <p>
                Vom putea intra cu un cod de cameră, răspunde împreună și urmări clasamentul în timp
                real. Pentru demo, încearcă exercițiile individuale.
              </p>
              <button className="btn primary" onClick={() => start('mixed')}>
                Exersează acum <ArrowRight size={18} />
              </button>
            </div>
          </main>
        )}
        <div className="mobile-nav">
          <button onClick={() => setPage('home')}>
            <HomeIcon size={19} />
            Acasă
          </button>
          <button onClick={() => start('mixed')}>
            <BookOpen size={19} />
            Exersează
          </button>
          <button onClick={() => setPage('group')}>
            <Users size={19} />
            Grup
          </button>
        </div>
      </div>
    </div>
  );
}
