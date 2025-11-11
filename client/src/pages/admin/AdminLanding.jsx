import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminPanelContext } from '../AdminPage.jsx';
import './AdminRoutes.css';

const AdminLanding = () => {
  const navigate = useNavigate();
  const { wheels } = useAdminPanelContext();
  const [selectedSlug, setSelectedSlug] = useState('');

  const hasWheels = wheels.length > 0;

  const wheelOptions = useMemo(
    () =>
      wheels.map((wheel) => ({
        id: wheel.id,
        name: wheel.name,
        slug: wheel.slug,
      })),
    [wheels],
  );

  useEffect(() => {
    if (!hasWheels) {
      setSelectedSlug('');
      return;
    }
    setSelectedSlug((prev) => {
      if (prev) {
        const exists = wheelOptions.some((option) => option.slug === prev);
        if (exists) {
          return prev;
        }
      }
      return wheelOptions[0]?.slug ?? '';
    });
  }, [hasWheels, wheelOptions]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (selectedSlug) {
      navigate(`/admin/edit/${selectedSlug}`);
    }
  };

  return (
    <section className="admin-landing">
      <div className="admin-card">
        <h2>Manage wheels</h2>
        <p className="admin-card__hint">
          Choose a wheel to edit its entries or create a brand new wheel for upcoming events.
        </p>
        {hasWheels ? (
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form__field">
              <label htmlFor="admin-wheel-select">Wheel</label>
              <select
                id="admin-wheel-select"
                value={selectedSlug}
                onChange={(event) => setSelectedSlug(event.target.value)}
              >
                {wheelOptions.map((option) => (
                  <option key={option.id} value={option.slug}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-form__actions">
              <button type="submit" className="admin-button" disabled={!selectedSlug}>
                Edit wheel
              </button>
              <Link className="admin-button admin-button--ghost" to="/admin/create">
                Create new wheel
              </Link>
            </div>
          </form>
        ) : (
          <div className="admin-empty-state">
            <p>No wheels yet. Create one to start sharing rewards.</p>
            <Link className="admin-button" to="/admin/create">
              Create your first wheel
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminLanding;
