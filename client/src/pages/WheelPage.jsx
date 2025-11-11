import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import WheelDisplay from '../components/WheelDisplay.jsx';
import { useAppContext } from '../contexts/AppContext.js';
import './WheelPage.css';

const WheelPage = () => {
  const { wheelSlug } = useParams();
  const { wheels, loading, loadError, adminSession, handleEntryDeleted } = useAppContext();

  const wheel = useMemo(() => wheels.find((item) => item.slug === wheelSlug) ?? null, [
    wheels,
    wheelSlug,
  ]);

  const activeEntries = useMemo(
    () => (wheel?.entries || []).filter((entry) => !entry.disabled),
    [wheel],
  );

  if (loading) {
    return <div className="wheel-page__state">Loading wheel…</div>;
  }

  if (loadError) {
    return <div className="wheel-page__state wheel-page__state--error">{loadError}</div>;
  }

  if (!wheel) {
    return (
      <div className="wheel-page__state">
        <p>We couldn&apos;t find that wheel.</p>
        <Link to="/" className="wheel-page__back-link">
          Return to all wheels
        </Link>
      </div>
    );
  }

  return (
    <section className="wheel-page">
      <header className="wheel-page__header">
        <div>
          <h2>{wheel.name}</h2>
          <p>
            {activeEntries.length} entr{activeEntries.length === 1 ? 'y' : 'ies'} available to spin. Share this
            page so anyone can celebrate the team in real time.
          </p>
        </div>
        <div className="wheel-page__meta">
          <span>Total entries: {activeEntries.length}</span>
        </div>
      </header>
      <div className="wheel-page__content">
        <WheelDisplay
          wheel={wheel}
          adminSessionId={adminSession?.sessionId}
          onEntryDeleted={handleEntryDeleted}
        />
      </div>
    </section>
  );
};

export default WheelPage;
