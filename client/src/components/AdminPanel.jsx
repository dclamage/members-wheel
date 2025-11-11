import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import api from '../api.js';
import './AdminPanel.css';

const AdminPanel = ({
  adminSessionId,
  onWheelCreated,
  onEntriesAdded,
  onWheelUpdated,
  onSessionExpired,
  wheels,
}) => {
  const [wheelName, setWheelName] = useState('');
  const [wheelDuration, setWheelDuration] = useState(5);
  const [selectedWheelForEntry, setSelectedWheelForEntry] = useState(null);
  const [entryLabel, setEntryLabel] = useState('');
  const [entryPerson, setEntryPerson] = useState('');
  const [entryCount, setEntryCount] = useState(1);
  const [selectedWheelForUpdate, setSelectedWheelForUpdate] = useState(null);
  const [updatedWheelName, setUpdatedWheelName] = useState('');
  const [updatedWheelDuration, setUpdatedWheelDuration] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (wheels.length) {
      setSelectedWheelForEntry((prev) => prev ?? wheels[0].id);
      setSelectedWheelForUpdate((prev) => prev ?? wheels[0].id);
    } else {
      setSelectedWheelForEntry(null);
      setSelectedWheelForUpdate(null);
    }
  }, [wheels]);

  const requireSession = () => {
    if (!adminSessionId) {
      setError('You must be signed in to manage wheels.');
      return false;
    }
    setError('');
    return true;
  };

  const handleCreateWheel = async (event) => {
    event.preventDefault();
    if (!requireSession()) {
      return;
    }
    if (!wheelName.trim()) {
      setError('Wheel name is required.');
      return;
    }
    try {
      const { data } = await api.post(
        '/wheels',
        { name: wheelName.trim(), spinDurationSeconds: Number(wheelDuration) || 5 },
        {
          headers: { 'x-admin-session': adminSessionId },
        },
      );
      onWheelCreated(data);
      setWheelName('');
      setWheelDuration(5);
      setStatus(`Created wheel "${data.name}"`);
      setError('');
    } catch (err) {
      setStatus('');
      if (err.response?.status === 401 || err.response?.status === 403) {
        onSessionExpired();
        return;
      }
      setError('Failed to create wheel. Check your inputs and try again.');
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  const handleAddEntry = async (event) => {
    event.preventDefault();
    if (!requireSession()) {
      return;
    }
    if (!selectedWheelForEntry) {
      setError('Select a wheel to add entries to.');
      return;
    }
    if (!entryLabel.trim() || !entryPerson.trim()) {
      setError('Entry label and person name are required.');
      return;
    }
    try {
      const { data } = await api.post(
        `/wheels/${selectedWheelForEntry}/entries`,
        {
          label: entryLabel.trim(),
          personName: entryPerson.trim(),
          count: Number(entryCount) || 1,
        },
        {
          headers: { 'x-admin-session': adminSessionId },
        },
      );
      onEntriesAdded(selectedWheelForEntry, data);
      setEntryLabel('');
      setEntryPerson('');
      setEntryCount(1);
      setStatus(`Added ${data.length} entr${data.length === 1 ? 'y' : 'ies'} to the wheel.`);
      setError('');
    } catch (err) {
      setStatus('');
      if (err.response?.status === 401 || err.response?.status === 403) {
        onSessionExpired();
        return;
      }
      setError('Failed to add entry. Check your inputs and try again.');
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  const handleUpdateWheel = async (event) => {
    event.preventDefault();
    if (!requireSession()) {
      return;
    }
    if (!selectedWheelForUpdate) {
      setError('Select a wheel to update.');
      return;
    }
    if (!updatedWheelName.trim() && !updatedWheelDuration) {
      setError('Provide a new name, duration, or both.');
      return;
    }
    try {
      const payload = {};
      if (updatedWheelName.trim()) {
        payload.name = updatedWheelName.trim();
      }
      if (updatedWheelDuration) {
        payload.spinDurationSeconds = Number(updatedWheelDuration) || 5;
      }
      const { data } = await api.patch(`/wheels/${selectedWheelForUpdate}`, payload, {
        headers: { 'x-admin-session': adminSessionId },
      });
      onWheelUpdated(data);
      setUpdatedWheelName('');
      setUpdatedWheelDuration('');
      setStatus(`Updated wheel "${data.name}"`);
      setError('');
    } catch (err) {
      setStatus('');
      if (err.response?.status === 401 || err.response?.status === 403) {
        onSessionExpired();
        return;
      }
      setError('Failed to update wheel. Check your inputs and try again.');
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  return (
    <div className="admin-panel">
      <h2>Owner Controls</h2>
      <p className="admin-panel__hint">You&apos;re signed in. All updates use your active admin session.</p>

      <form className="admin-panel__section" onSubmit={handleCreateWheel}>
        <h3>Create a wheel</h3>
        <div className="admin-panel__field">
          <label htmlFor="wheel-name">Wheel name</label>
          <input
            id="wheel-name"
            value={wheelName}
            onChange={(event) => setWheelName(event.target.value)}
            placeholder="e.g. Quarterly Awards"
          />
        </div>
        <div className="admin-panel__field">
          <label htmlFor="wheel-duration">Spin duration (seconds)</label>
          <input
            id="wheel-duration"
            type="number"
            min="1"
            value={wheelDuration}
            onChange={(event) => setWheelDuration(event.target.value)}
          />
        </div>
        <button type="submit" disabled={!wheelName.trim()}>
          Create wheel
        </button>
      </form>

      <form className="admin-panel__section" onSubmit={handleAddEntry}>
        <h3>Add entries</h3>
        <div className="admin-panel__field">
          <label htmlFor="entry-wheel">Wheel</label>
          <select
            id="entry-wheel"
            value={selectedWheelForEntry ?? ''}
            onChange={(event) => setSelectedWheelForEntry(Number(event.target.value))}
          >
            {wheels.map((wheel) => (
              <option key={wheel.id} value={wheel.id}>
                {wheel.name}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-panel__field">
          <label htmlFor="entry-person">Person to credit</label>
          <input
            id="entry-person"
            value={entryPerson}
            onChange={(event) => setEntryPerson(event.target.value)}
            placeholder="e.g. Jordan"
          />
        </div>
        <div className="admin-panel__field">
          <label htmlFor="entry-label">Entry description</label>
          <input
            id="entry-label"
            value={entryLabel}
            onChange={(event) => setEntryLabel(event.target.value)}
            placeholder="e.g. Dinner Gift Card"
          />
        </div>
        <div className="admin-panel__field">
          <label htmlFor="entry-count">Number of identical entries</label>
          <input
            id="entry-count"
            type="number"
            min="1"
            value={entryCount}
            onChange={(event) => setEntryCount(event.target.value)}
          />
        </div>
        <button type="submit" disabled={!wheels.length}>
          Add entries
        </button>
      </form>

      <form className="admin-panel__section" onSubmit={handleUpdateWheel}>
        <h3>Update wheel settings</h3>
        <div className="admin-panel__field">
          <label htmlFor="update-wheel">Wheel</label>
          <select
            id="update-wheel"
            value={selectedWheelForUpdate ?? ''}
            onChange={(event) => setSelectedWheelForUpdate(Number(event.target.value))}
          >
            {wheels.map((wheel) => (
              <option key={wheel.id} value={wheel.id}>
                {wheel.name}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-panel__field">
          <label htmlFor="update-name">New name</label>
          <input
            id="update-name"
            value={updatedWheelName}
            onChange={(event) => setUpdatedWheelName(event.target.value)}
            placeholder="Leave blank to keep current"
          />
        </div>
        <div className="admin-panel__field">
          <label htmlFor="update-duration">New spin duration (seconds)</label>
          <input
            id="update-duration"
            type="number"
            min="1"
            value={updatedWheelDuration}
            onChange={(event) => setUpdatedWheelDuration(event.target.value)}
            placeholder="Leave blank to keep current"
          />
        </div>
        <button type="submit" disabled={!wheels.length}>
          Update wheel
        </button>
      </form>

      {status && <p className="admin-panel__status">{status}</p>}
      {error && <p className="admin-panel__error">{error}</p>}
    </div>
  );
};

AdminPanel.propTypes = {
  adminSessionId: PropTypes.string,
  onWheelCreated: PropTypes.func.isRequired,
  onEntriesAdded: PropTypes.func.isRequired,
  onWheelUpdated: PropTypes.func.isRequired,
  onSessionExpired: PropTypes.func.isRequired,
  wheels: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
};

AdminPanel.defaultProps = {
  adminSessionId: '',
};

export default AdminPanel;
