import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import api from '../api.js';
import WheelVisualizer from './WheelVisualizer.jsx';
import './WheelDisplay.css';

const groupEntriesByPerson = (entries) => {
  const groups = new Map();
  entries.forEach((entry) => {
    const key = entry.person?.name || 'Unknown';
    if (!groups.has(key)) {
      groups.set(key, { person: entry.person, entries: [] });
    }
    groups.get(key).entries.push(entry);
  });
  return Array.from(groups.values()).map((group) => ({
    person: group.person,
    entries: group.entries,
    count: group.entries.length,
  }));
};

const WheelDisplay = ({ wheel, adminSessionId, onEntryDeleted }) => {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const timeoutRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  useEffect(() => {
    setRotation(0);
    setSpinning(false);
    setResult(null);
    setError('');
  }, [wheel?.id]);

  useEffect(() => {
    setError('');
  }, [adminSessionId]);

  const activeEntries = useMemo(
    () => (wheel?.entries || []).filter((entry) => !entry.disabled),
    [wheel],
  );

  const groupedEntries = useMemo(() => groupEntriesByPerson(activeEntries), [activeEntries]);

  const handleSpin = () => {
    if (!wheel || !activeEntries.length || spinning) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * activeEntries.length);
    const selectedEntry = activeEntries[randomIndex];
    const entryAngle = 360 / activeEntries.length;
    const offset = 360 - (randomIndex * entryAngle + entryAngle / 2);
    const extraSpins = Math.floor(Math.random() * 3) + 4; // Randomize spins for variety
    const duration = (wheel.spinDurationSeconds || 5) * 1000;

    clearTimeout(timeoutRef.current);
    setError('');
    setResult(null);
    setSpinning(true);

    setRotation((prevRotation) => prevRotation + extraSpins * 360 + offset);

    timeoutRef.current = setTimeout(() => {
      setSpinning(false);
      setResult(selectedEntry);
    }, duration);
  };

  const handleDeleteEntry = async (entryId) => {
    if (!adminSessionId) {
      setError('Sign in as an admin to manage entries.');
      return;
    }

    try {
      await api.delete(`/wheels/${wheel.id}/entries/${entryId}`, {
        headers: {
          'x-admin-session': adminSessionId,
        },
      });
      if (result?.id === entryId) {
        setResult(null);
      }
      onEntryDeleted(wheel.id, entryId);
      setError('');
    } catch (err) {
      setError('Failed to delete entry. Check your admin session and try again.');
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  if (!wheel) {
    return <p className="wheel-display__empty">Select a wheel to begin.</p>;
  }

  return (
    <div className="wheel-display">
      <div className="wheel-display__visual">
        <WheelVisualizer
          entries={activeEntries}
          rotation={rotation}
          spinDuration={wheel.spinDurationSeconds || 5}
          spinning={spinning}
        />
        <button
          type="button"
          className="wheel-display__spin-button"
          onClick={handleSpin}
          disabled={!activeEntries.length || spinning}
        >
          {spinning ? 'Spinning…' : 'Spin the Wheel'}
        </button>
        <p className="wheel-display__meta">Spin duration: {wheel.spinDurationSeconds || 5} seconds</p>
        {result ? (
          <div className="wheel-display__result">
            <h3>Result</h3>
            <p className="wheel-display__result-entry">{result.label}</p>
            <p className="wheel-display__result-person">Credited to {result.person?.name}</p>
          </div>
        ) : (
          <div className="wheel-display__result wheel-display__result--placeholder">
            Spin the wheel to reveal a result.
          </div>
        )}
        {error && <p className="wheel-display__error">{error}</p>}
      </div>
      <div className="wheel-display__entries">
        <h3>Entries</h3>
        {activeEntries.length === 0 ? (
          <p className="wheel-display__empty">No entries yet. Add some using the admin tools.</p>
        ) : (
          <div className="wheel-display__entries-list">
            {groupedEntries.map((group) => (
              <div
                key={group.person?.id ?? group.person?.name ?? `person-${group.entries[0].id}`}
                className="wheel-display__person-group"
              >
                <div className="wheel-display__person-heading">
                  <h4>{group.person?.name}</h4>
                  <span className="wheel-display__badge">{group.count}</span>
                </div>
                <ul>
                  {group.entries.map((entry) => (
                    <li key={entry.id}>
                      <span>{entry.label}</span>
                      {adminSessionId && (
                        <button
                          type="button"
                          className="wheel-display__entry-delete"
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={spinning}
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

WheelDisplay.propTypes = {
  wheel: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    spinDurationSeconds: PropTypes.number,
    entries: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        label: PropTypes.string.isRequired,
        person: PropTypes.shape({
          id: PropTypes.number,
          name: PropTypes.string,
        }),
      }),
    ),
  }),
  adminSessionId: PropTypes.string,
  onEntryDeleted: PropTypes.func.isRequired,
};

WheelDisplay.defaultProps = {
  wheel: null,
  adminSessionId: '',
};

export default WheelDisplay;
