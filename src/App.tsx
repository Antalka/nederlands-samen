import { useEffect, useState } from 'react';
import { BookOpen, Home as HomeIcon, Users, UserRound, ArrowRight } from 'lucide-react';
import { Home, topics } from './components/Home';
import { Practice } from './components/Practice';
import { GroupGame } from './components/GroupGame';
import { getQuestions, getQuestionCount } from './services/questions';
import { load, save } from './services/storage';
import { signInAnonymously } from './services/auth';
import type { Progress, PracticeMode, Topic, PublicQuestion, Attempt } from './types';
type Page = 'home' | 'practice' | 'group';
export default function App() {
  const [progress, setProgress] = useState<Progress>(load);
  const [draft, setDraft] = useState('');
  const [page, setPage] = useState<Page>('home');
  const [mode, setMode] = useState<PracticeMode>('mixed');
  const [topic, setTopic] = useState<Topic>('general');
  const [session, setSession] = useState(0);
  const [questionList, setQuestionList] = useState<PublicQuestion[]>([]);
  const [topicCounts, setTopicCounts] = useState<Partial<Record<Topic, number>>>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  useEffect(() => save(progress), [progress]);
  useEffect(() => {
    if (!sessionReady || page !== 'home') return;
    let cancelled = false;
    Promise.all(topics.map(async ({ id }) => ({ id, count: await getQuestionCount({ topic: id }) })))
      .then((items) => {
        if (!cancelled) setTopicCounts(Object.fromEntries(items.map(({ id, count }) => [id, count])));
      })
      .catch((error) => console.error('Question counts failed:', error));
    return () => { cancelled = true; };
  }, [sessionReady, page]);

  // Kizárólag publikus kérdésadatokat töltünk le. Helyes válasz sosem kerül a böngészőbe.
  useEffect(() => {
    if (page !== 'practice' || !sessionReady) return;
    let cancelled = false;
    async function fetchPracticeQuestions() {
      setQuestionsLoading(true);
      setQuestionsError(null);
      setQuestionList([]);
      try {
        const filter = mode === 'situations' ? { topic: 'situations' as Topic }
          : mode === 'topic' ? { topic } : {};
        // A teljes kategóriából választunk 15 különböző kérdést,
        // nem egy véletlenszerű, de egymást követő 15-ös blokkot.
        const count = await getQuestionCount(filter);
        if (count === 0) {
          if (!cancelled) setQuestionList([]);
          return;
        }
        const allQuestions: PublicQuestion[] = [];
        for (let offset = 0; offset < count; offset += 100) {
          const batch = await getQuestions({ ...filter, limit: 100, offset });
          allQuestions.push(...batch);
          if (batch.length === 0) break;
        }
        // Fisher–Yates: egyenletes véletlenszerű sorrend, ismétlés nélkül.
        for (let i = allQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
        }
        if (!cancelled) setQuestionList(allQuestions.slice(0, 15));
      } catch (error) {
        console.error('Question loading failed:', error);
        if (!cancelled) setQuestionsError('Nu am putut încărca întrebările din baza de date. Încearcă din nou.');
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    }
    void fetchPracticeQuestions();
    return () => { cancelled = true; };
  }, [page, session, sessionReady, mode, topic]);
  async function handleNicknameSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nickname = draft.trim().slice(0, 32);

    if (!nickname || authLoading) {
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      await signInAnonymously();

      setProgress((previous) => ({
        ...previous,
        name: nickname,
      }));
    } catch (error) {
      console.error('Anonymous authentication failed:', error);

      setAuthError('Nu am putut realiza conectarea. Te rugăm să încerci din nou.');
    } finally {
      setAuthLoading(false);
    }
  }
  useEffect(() => {
    let cancelled = false;

    async function initializeSession() {
      try {
        await signInAnonymously();

        if (!cancelled) {
          setSessionReady(true);
        }
      } catch (error) {
        console.error('Session initialization failed:', error);

        if (!cancelled) {
          setSessionError(
            'Nu am putut realiza conexiunea. Verifică internetul și încearcă din nou.',
          );
        }
      }
    }

    initializeSession();

    return () => {
      cancelled = true;
    };
  }, []);
  function start(m: PracticeMode, t?: Topic) {
    setMode(m);
    if (t) setTopic(t);
    setSession((x) => x + 1);
    setQuestionsError(null);
    setQuestionList([]);
    setPage('practice');
    window.scrollTo(0, 0);
  }
  function onAttempt(a: Attempt) {
    setProgress((p) => ({ ...p, attempts: [...p.attempts, a] }));
  }
  if (!sessionReady) {
    return <div className="welcome"><div className="welcome-card" role="status">{sessionError ?? 'Se conectează...'}</div></div>;
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
          <form onSubmit={handleNicknameSubmit}>
            <input
              autoFocus
              placeholder="Numele tău"
              value={draft}
              maxLength={32}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="btn primary" type="submit" disabled={!draft.trim() || authLoading}>
              {authLoading ? (
                'Se conectează...'
              ) : (
                <>
                  Hai să începem <ArrowRight size={18} />
                </>
              )}
            </button>
            {authError && (
              <p role="alert" style={{ color: '#c0392b' }}>
                {authError}
              </p>
            )}
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
          <Home progress={progress} topicCounts={topicCounts} onStart={start} onGroup={() => setPage('group')} />
        ) : page === 'practice' ? (
          questionsLoading ? (
            <main className="page"><div className="panel" role="status">Se încarcă întrebările din baza de date...</div></main>
          ) : questionsError ? (
            <main className="page"><div className="panel" role="alert"><p>{questionsError}</p><button className="btn primary" onClick={() => setSession((v) => v + 1)}>Reîncearcă</button></div></main>
          ) : <Practice
            key={session}
            list={questionList}
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
          <GroupGame nickname={progress.name} onExit={() => setPage('home')} />
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
