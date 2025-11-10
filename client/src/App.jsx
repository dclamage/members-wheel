import { useEffect, useMemo, useState } from 'react';
import api from './api.js';
import WheelSelector from './components/WheelSelector.jsx';
import WheelDisplay from './components/WheelDisplay.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import './App.css';

const App = () => {
  const [wheels, setWheels] = useState([]);
  const [selectedWheelId, setSelectedWheelId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminToken, setAdminToken] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedToken = window.localStorage.getItem('members-wheel-admin-token');
    if (storedToken) {
      setAdminToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (adminToken) {
      window.localStorage.setItem('members-wheel-admin-token', adminToken);
    } else {
      window.localStorage.removeItem('members-wheel-admin-token');
    }
  }, [adminToken]);

  const fetchWheels = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/wheels');
      setWheels(data);
      if (data.length && !data.some((wheel) => wheel.id === selectedWheelId)) {
        setSelectedWheelId(data[0].id);
      }
    } catch (err) {
      setError('Failed to load wheels. Please try again.');
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWheels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedWheel = useMemo(
    () => wheels.find((wheel) => wheel.id === selectedWheelId) || null,
    [wheels, selectedWheelId],
  );

  const handleWheelCreated = (wheel) => {
    setWheels((prev) => [...prev, wheel]);
    setSelectedWheelId(wheel.id);
  };

  const handleEntriesAdded = (wheelId, newEntries) => {
    setWheels((prev) =>
      prev.map((wheel) =>
        wheel.id === wheelId
          ? {
              ...wheel,
              entries: [...wheel.entries, ...newEntries],
            }
          : wheel,
      ),
    );
  };

  const handleEntryDeleted = (wheelId, entryId) => {
    setWheels((prev) =>
      prev.map((wheel) =>
        wheel.id === wheelId
          ? {
              ...wheel,
              entries: wheel.entries.filter((entry) => entry.id !== entryId),
            }
          : wheel,
      ),
    );
  };

  const handleWheelUpdated = (updatedWheel) => {
    setWheels((prev) => prev.map((wheel) => (wheel.id === updatedWheel.id ? updatedWheel : wheel)));
    if (selectedWheelId === updatedWheel.id) {
      setSelectedWheelId(updatedWheel.id);
    }
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1>Members Wheel</h1>
        <p className="app__subtitle">
          Spin a fair wheel of rewards while celebrating contributors. Configure once, share with
          everyone.
        </p>
      </header>
      <main className="app__main">
        <section className="app__content">
          {loading ? (
            <div className="app__state">Loading wheels…</div>
          ) : error ? (
            <div className="app__state app__state--error">{error}</div>
          ) : (
            <>
              <WheelSelector
                wheels={wheels}
                selectedWheelId={selectedWheelId}
                onSelect={setSelectedWheelId}
              />
              <WheelDisplay
                wheel={selectedWheel}
                adminToken={adminToken}
                onEntryDeleted={handleEntryDeleted}
              />
            </>
          )}
        </section>
        <aside className="app__sidebar">
          <AdminPanel
            adminToken={adminToken}
            onTokenChange={setAdminToken}
            onWheelCreated={handleWheelCreated}
            onEntriesAdded={handleEntriesAdded}
            onWheelUpdated={handleWheelUpdated}
            wheels={wheels}
          />
        </aside>
      </main>
    </div>
  );
};

export default App;
