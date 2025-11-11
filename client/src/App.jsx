import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import api from './api.js';
import { AppContext } from './contexts/AppContext.js';
import HomePage from './pages/HomePage.jsx';
import WheelPage from './pages/WheelPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import './App.css';

const SESSION_STORAGE_KEY = 'members-wheel-admin-session';
const ADMIN_SESSION_REFRESH_BUFFER_MS = 1000 * 60 * 60 * 24; // 1 day
const MIN_REFRESH_INTERVAL_MS = 1000 * 60 * 5; // 5 minutes
const MIN_SESSION_HEADROOM_MS = 1000 * 60 * 5; // 5 minutes

const slugify = (name) =>
  (name || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const withSlug = (wheel, existing = []) => {
  const usedSlugs = new Set(existing.map((item) => item.slug));
  const baseSlug = slugify(wheel.name) || `wheel-${wheel.id}`;
  let slug = baseSlug;
  if (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${wheel.id}`;
  }
  return {
    ...wheel,
    slug,
  };
};

const assignSlugsToList = (items) => {
  const prepared = [];
  items.forEach((item) => {
    prepared.push(withSlug(item, prepared));
  });
  return prepared;
};

const buildNavClassName = ({ isActive }) =>
  `app__nav-link${isActive ? ' app__nav-link--active' : ''}`;

const App = () => {
  const [wheels, setWheels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [adminSession, setAdminSessionState] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const fetchWheels = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/wheels');
      setWheels(assignSlugsToList(data));
    } catch (error) {
      setLoadError('Failed to load wheels. Please try again.');
      // eslint-disable-next-line no-console
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWheels();
  }, [fetchWheels]);

  const persistSession = useCallback((session) => {
    setAdminSessionState(session);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }, []);

  const clearAdminSession = useCallback(() => {
    setAdminSessionState(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  const refreshSessionFromServer = useCallback(
    async (sessionId) => {
      const { data } = await api.post(
        '/admin/session/refresh',
        {},
        {
          headers: { 'x-admin-session': sessionId },
        },
      );
      persistSession(data);
    },
    [persistSession],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      setSessionChecked(true);
      return;
    }

    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      setSessionChecked(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (!parsed?.sessionId || !parsed?.expiresAt) {
        clearAdminSession();
        setSessionChecked(true);
        return;
      }

      const expiresAt = new Date(parsed.expiresAt).getTime();
      if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
        clearAdminSession();
        setSessionChecked(true);
        return;
      }

      refreshSessionFromServer(parsed.sessionId)
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Failed to refresh stored admin session', error);
          clearAdminSession();
        })
        .finally(() => {
          setSessionChecked(true);
        });
    } catch (error) {
      clearAdminSession();
      setSessionChecked(true);
    }
  }, [clearAdminSession, refreshSessionFromServer]);

  useEffect(() => {
    if (!adminSession) {
      return undefined;
    }

    if (typeof window === 'undefined') {
      return undefined;
    }

    const expiresAt = new Date(adminSession.expiresAt).getTime();
    if (Number.isNaN(expiresAt)) {
      return undefined;
    }

    const nowTime = Date.now();
    const timeUntilExpiry = expiresAt - nowTime;

    if (timeUntilExpiry <= 0) {
      clearAdminSession();
      return undefined;
    }

    let delay;
    if (timeUntilExpiry > ADMIN_SESSION_REFRESH_BUFFER_MS) {
      delay = timeUntilExpiry - ADMIN_SESSION_REFRESH_BUFFER_MS;
    } else {
      delay = Math.max(timeUntilExpiry - MIN_SESSION_HEADROOM_MS, MIN_REFRESH_INTERVAL_MS, 0);
    }

    const latestAllowed = Math.max(timeUntilExpiry - MIN_SESSION_HEADROOM_MS, 0);
    delay = Math.min(delay, latestAllowed);

    if (delay <= 0) {
      refreshSessionFromServer(adminSession.sessionId).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to refresh admin session automatically', error);
        clearAdminSession();
      });
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      refreshSessionFromServer(adminSession.sessionId).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to refresh admin session automatically', error);
        clearAdminSession();
      });
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [adminSession, clearAdminSession, refreshSessionFromServer]);

  const handleWheelCreated = useCallback((wheel) => {
    setWheels((prev) => {
      const nextWheel = withSlug(wheel, prev);
      return [...prev, nextWheel];
    });
  }, []);

  const handleEntriesAdded = useCallback((wheelId, newEntries) => {
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
  }, []);

  const handleEntryDeleted = useCallback((wheelId, entryId) => {
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
  }, []);

  const handleWheelUpdated = useCallback((updatedWheel) => {
    setWheels((prev) => {
      const others = prev.filter((wheel) => wheel.id !== updatedWheel.id);
      const nextWheel = withSlug(updatedWheel, others);
      return prev.map((wheel) => (wheel.id === updatedWheel.id ? nextWheel : wheel));
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      wheels,
      loading,
      loadError,
      refreshWheels: fetchWheels,
      adminSession,
      setAdminSession: persistSession,
      clearAdminSession,
      sessionChecked,
      handleWheelCreated,
      handleEntriesAdded,
      handleWheelUpdated,
      handleEntryDeleted,
    }),
    [
      wheels,
      loading,
      loadError,
      fetchWheels,
      adminSession,
      persistSession,
      clearAdminSession,
      sessionChecked,
      handleWheelCreated,
      handleEntriesAdded,
      handleWheelUpdated,
      handleEntryDeleted,
    ],
  );

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app">
        <div className="app__shell">
          <header className="app__header">
            <div className="app__branding">
              <h1 className="app__title">Members Wheel</h1>
              <p className="app__subtitle">
                Spin a fair wheel of rewards while celebrating contributors. Configure once, share with
                everyone.
              </p>
            </div>
            <nav className="app__nav">
              <NavLink to="/" end className={buildNavClassName}>
                Wheels
              </NavLink>
              <NavLink to="/admin" className={buildNavClassName}>
                Admin
              </NavLink>
            </nav>
          </header>
          <main className="app__main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/:wheelSlug" element={<WheelPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
};

export default App;
