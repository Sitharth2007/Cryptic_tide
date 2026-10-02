import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient';

const OPTIONS = ['A', 'B', 'C', 'D'];

function TimerBar({ deadline }) {
  const [remaining, setRemaining] = useState(10);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!deadline) return;
    const dl = new Date(deadline).getTime();
    const total = 10;

    function tick() {
      const now = Date.now();
      const secs = Math.max(0, Math.ceil((dl - now) / 1000));
      setRemaining(secs);
      if (secs <= 0) clearInterval(intervalRef.current);
    }

    tick();
    intervalRef.current = setInterval(tick, 250);
    return () => clearInterval(intervalRef.current);
  }, [deadline]);

  const pct = (remaining / 10) * 100;
  const colorClass = remaining > 5 ? 'timer-safe' : remaining > 2 ? 'timer-caution' : 'timer-danger';
  const barColor = remaining > 5
    ? 'linear-gradient(90deg, var(--ocean-teal), var(--gold-bright))'
    : remaining > 2
    ? 'linear-gradient(90deg, var(--gold-warm), var(--gold-amber))'
    : 'linear-gradient(90deg, var(--gold-fire), #dc2626)';

  return (
    <div style={{ textAlign: 'center' }}>
      <div className={`timer-display ${colorClass}`}>{String(remaining).padStart(2, '0')}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'rgba(255,248,231,0.4)', marginTop: '0.2rem', textTransform: 'uppercase' }}>
        seconds remaining
      </div>
      <div className="timer-bar" style={{ marginTop: '0.75rem', maxWidth: 160, margin: '0.75rem auto 0' }}>
        <div className="timer-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

export default function QuizPage() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null); // { result, points }
  const [showFeedback, setShowFeedback] = useState(false);
  const feedbackTimer = useRef(null);

  const fetchCurrentQuestion = useCallback(async () => {
    try {
      const data = await api.get('/api/participant/current-question');
      if (data.quiz_complete) {
        navigate('/participant/completed');
        return;
      }
      setQuestion(data.question);
      setSelected(null);
      setFeedback(null);
      setShowFeedback(false);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Start quiz and fetch first question
  useEffect(() => {
    api.post('/api/participant/start')
      .then(() => fetchCurrentQuestion())
      .catch(err => {
        // If already started, just get current question
        fetchCurrentQuestion();
      });
  }, []);

  // Auto-advance when timer expires (cosmetic — server enforces)
  useEffect(() => {
    if (!question?.deadline) return;
    const dl = new Date(question.deadline).getTime();
    const msLeft = dl - Date.now() + 500; // +500ms grace for server
    if (msLeft <= 0) return;

    const t = setTimeout(() => {
      if (!submitting && !showFeedback) {
        handleSubmit('SKIP', true);
      }
    }, msLeft);

    return () => clearTimeout(t);
  }, [question]);

  async function handleSubmit(answer, isTimeout = false) {
    if (submitting || showFeedback || !question) return;
    setSubmitting(true);
    setSelected(answer);

    try {
      const res = await api.post('/api/participant/answer', {
        question_id: question.id,
        selected_answer: answer,
      });

      setFeedback({ result: res.result, points: res.points });
      setShowFeedback(true);

      if (res.quiz_complete) {
        setTimeout(() => navigate('/participant/completed'), 1200);
        return;
      }

      // Short visual feedback pause, then load next question
      feedbackTimer.current = setTimeout(() => {
        if (res.next_question) {
          setQuestion(res.next_question);
          setSelected(null);
          setFeedback(null);
          setShowFeedback(false);
          setSubmitting(false);
        } else {
          fetchCurrentQuestion();
          setSubmitting(false);
        }
      }, 800);

    } catch (err) {
      if (err.message.includes('already recorded')) {
        fetchCurrentQuestion();
      } else {
        setError(err.message);
      }
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="ocean-bg page-center" style={{ flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" style={{ width: 48, height: 48 }} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.1em', color: 'var(--gold-bright)' }}>
          LOADING QUESTION...
        </p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="ocean-bg page-center" style={{ textAlign: 'center' }}>
        <div className="spinner" />
        <p style={{ marginTop: '1rem', color: 'rgba(255,248,231,0.5)' }}>Preparing your voyage...</p>
      </div>
    );
  }

  const questionNum = question.question_displayed_number || question.question_number;
  const totalQ = question.total_questions || 25;
  const progress = ((questionNum - 1) / totalQ) * 100;

  const resultColors = {
    CORRECT: 'var(--ocean-aqua)',
    WRONG: '#f87171',
    SKIPPED: 'var(--gold-amber)',
    TIMEOUT: 'var(--gold-amber)',
  };
  const resultIcons = { CORRECT: '✓ Correct!', WRONG: '✗ Wrong', SKIPPED: '— Skipped', TIMEOUT: '⏱ Timeout' };

  return (
    <div className="ocean-bg" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 680, zIndex: 1 }}>
        {/* Top bar */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--gold-warm)', textTransform: 'uppercase' }}>
                CYBERHUB · ROUND 1 — THE FIRST VOYAGE
              </span>
            </div>
            <span className="badge badge-teal" style={{ fontFamily: 'var(--font-mono)' }}>
              {questionNum} / {totalQ}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Main card */}
        <div className="parchment-card animate-fade-in" style={{ marginBottom: '1rem' }}>
          {/* Category + Timer row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{question.category}</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'rgba(255,248,231,0.35)', textTransform: 'uppercase', marginTop: '0.5rem' }}>
                Question {questionNum}
              </div>
            </div>
            <TimerBar deadline={question.deadline} />
          </div>

          {/* Question text */}
          <div style={{ fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--parchment)', marginBottom: '1.75rem', fontWeight: 500 }}>
            {question.question_text}
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {OPTIONS.map(opt => {
              const optText = question[`option_${opt.toLowerCase()}`];
              const isSelected = selected === opt;
              const isDisabled = submitting || showFeedback;

              return (
                <button
                  key={opt}
                  id={`option-${opt}`}
                  className={`option-btn ${isSelected ? 'selected' : ''}`}
                  disabled={isDisabled}
                  onClick={() => handleSubmit(opt)}
                  style={{
                    opacity: isDisabled && !isSelected ? 0.6 : 1,
                  }}
                >
                  <span className="option-label">{opt}.</span>
                  <span>{optText}</span>
                </button>
              );
            })}
          </div>

          {/* Skip button */}
          {!showFeedback && (
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button
                className="btn btn-outline btn-sm"
                disabled={submitting}
                onClick={() => handleSubmit('SKIP')}
                id="skip-btn"
              >
                Skip (−10)
              </button>
            </div>
          )}

          {/* Feedback flash */}
          {showFeedback && feedback && (
            <div className="animate-fade-in" style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: `${resultColors[feedback.result]}1A`,
              border: `1px solid ${resultColors[feedback.result]}40`,
              borderRadius: 'var(--r-md)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: resultColors[feedback.result], letterSpacing: '0.05em' }}>
                {resultIcons[feedback.result]}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: resultColors[feedback.result] }}>
                {feedback.points > 0 ? '+' : ''}{feedback.points} pts
              </span>
            </div>
          )}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Note */}
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em', color: 'rgba(255,248,231,0.25)', marginTop: '0.75rem' }}>
          SERVER-AUTHORITATIVE TIMER · DO NOT REFRESH
        </p>
      </div>
    </div>
  );
}
