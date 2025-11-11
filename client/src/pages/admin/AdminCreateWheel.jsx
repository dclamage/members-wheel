import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api.js';
import { withSlug } from '../../utils/slug.js';
import { useAdminPanelContext } from '../AdminPage.jsx';
import './AdminRoutes.css';

const AdminCreateWheel = () => {
  const navigate = useNavigate();
  const { adminSessionId, wheels, onWheelCreated, onSessionExpired } = useAdminPanelContext();

  const [name, setName] = useState('');
  const [duration, setDuration] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    if (!adminSessionId) {
      setError('Your admin session expired. Please sign in again.');
      onSessionExpired();
      return;
    }
    if (!name.trim()) {
      setError('Wheel name is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { data } = await api.post(
        '/wheels',
        { name: name.trim(), spinDurationSeconds: Number(duration) || 5 },
        {
          headers: { 'x-admin-session': adminSessionId },
        },
      );
      onWheelCreated(data);
      const nextSlug = withSlug(data, wheels).slug;
      navigate(`/admin/edit/${nextSlug}`);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        onSessionExpired();
        return;
      }
      setError('Failed to create wheel. Check your inputs and try again.');
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="admin-create">
      <div className="admin-card">
        <div className="admin-card__header">
          <h2>Create a wheel</h2>
          <Link className="admin-link" to="/admin">
            ← Back to admin home
          </Link>
        </div>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-form__field">
            <label htmlFor="create-wheel-name">Wheel name</label>
            <input
              id="create-wheel-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Quarterly Awards"
            />
          </div>
          <div className="admin-form__field">
            <label htmlFor="create-wheel-duration">Spin duration (seconds)</label>
            <input
              id="create-wheel-duration"
              type="number"
              min="1"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-button" disabled={!name.trim() || submitting}>
              {submitting ? 'Creating…' : 'Create wheel'}
            </button>
          </div>
          {error && <p className="admin-feedback admin-feedback--error">{error}</p>}
        </form>
      </div>
    </section>
  );
};

export default AdminCreateWheel;
