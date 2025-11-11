import { useCallback, useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.js';
import api from '../api.js';
import './AdminPage.css';

const AdminPage = () => {
  const {
    wheels,
    adminSession,
    setAdminSession,
    clearAdminSession,
    sessionChecked,
    handleWheelCreated,
    handleEntriesAdded,
    handleWheelUpdated,
    handleEntryUpdated,
    handleEntryDeleted,
    refreshWheels,
  } = useAppContext();

  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!token.trim()) {
      setError('Enter your admin token to continue.');
      setStatus('');
      return;
    }

    setSubmitting(true);
    setError('');
    setStatus('');

    try {
      const { data } = await api.post('/admin/session', { token: token.trim() });
      setAdminSession(data);
      setToken('');
      setStatus('Admin session established.');
    } catch (err) {
      setError('Invalid admin token. Please try again.');
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (!adminSession) {
      return;
    }
    setLoggingOut(true);
    setStatus('');
    setError('');
    try {
      await api.delete('/admin/session', {
        headers: { 'x-admin-session': adminSession.sessionId },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to revoke admin session', err);
    } finally {
      clearAdminSession();
      setLoggingOut(false);
      setStatus('You have been signed out.');
    }
  };

  const handleSessionExpired = useCallback(() => {
    clearAdminSession();
    setError('Your admin session expired. Please log in again.');
  }, [clearAdminSession]);

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h2>Admin controls</h2>
        <p>
          Use your private admin token to configure wheels. The token is never stored directly—only a
          temporary session is saved in your browser for quick access.
        </p>
      </header>

      {!sessionChecked ? (
        <div className="admin-page__state">Checking admin session…</div>
      ) : !adminSession ? (
        <form className="admin-page__login" onSubmit={handleLogin}>
          <label htmlFor="admin-token">Admin token</label>
          <input
            id="admin-token"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Enter admin token"
            autoComplete="current-password"
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          {status && <p className="admin-page__status">{status}</p>}
          {error && <p className="admin-page__error">{error}</p>}
        </form>
      ) : (
        <div className="admin-page__panel">
          <div className="admin-page__session-bar">
            <span className="admin-page__session-indicator">Session active</span>
            <button type="button" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
          <Outlet
            context={{
              adminSessionId: adminSession.sessionId,
              wheels,
              onWheelCreated: handleWheelCreated,
              onEntriesAdded: handleEntriesAdded,
              onWheelUpdated: handleWheelUpdated,
              onEntryUpdated: handleEntryUpdated,
              onEntryDeleted: handleEntryDeleted,
              onSessionExpired: handleSessionExpired,
              refreshWheels,
            }}
          />
          {status && <p className="admin-page__status">{status}</p>}
          {error && <p className="admin-page__error">{error}</p>}
        </div>
      )}
    </section>
  );
};

export default AdminPage;

export const useAdminPanelContext = () => useOutletContext();
