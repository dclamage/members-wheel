import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api.js';
import { withSlug } from '../../utils/slug.js';
import { useAdminPanelContext } from '../AdminPage.jsx';
import './AdminRoutes.css';

const buildPeopleList = (wheel) => {
  if (!wheel) {
    return [];
  }
  const peopleMap = new Map();
  wheel.entries.forEach((entry) => {
    const personName = entry.person?.name?.trim();
    if (!personName) {
      return;
    }
    const key = entry.person?.id ?? personName;
    if (!peopleMap.has(key)) {
      peopleMap.set(key, {
        key: String(key),
        id: entry.person?.id ?? null,
        name: personName,
      });
    }
  });
  return Array.from(peopleMap.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const groupEntriesByPerson = (wheel) => {
  if (!wheel) {
    return [];
  }
  const groups = new Map();
  wheel.entries.forEach((entry) => {
    const name = entry.person?.name ?? 'Unknown';
    const key = entry.person?.id ?? name ?? `person-${entry.id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key: String(key),
        name,
        entries: [],
      });
    }
    groups.get(key).entries.push(entry);
  });
  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const AdminEditWheel = () => {
  const navigate = useNavigate();
  const { wheelSlug } = useParams();
  const {
    wheels,
    adminSessionId,
    onWheelUpdated,
    onEntriesAdded,
    onEntryUpdated,
    onEntryDeleted,
    onSessionExpired,
  } = useAdminPanelContext();

  const wheel = useMemo(
    () => wheels.find((item) => item.slug === wheelSlug) ?? null,
    [wheels, wheelSlug],
  );

  const people = useMemo(() => buildPeopleList(wheel), [wheel]);
  const groupedEntries = useMemo(() => groupEntriesByPerson(wheel), [wheel]);

  const [name, setName] = useState('');
  const [spinDuration, setSpinDuration] = useState(5);
  const [savingWheel, setSavingWheel] = useState(false);

  const [entryLabel, setEntryLabel] = useState('');
  const [entryCount, setEntryCount] = useState(1);
  const [personMode, setPersonMode] = useState('existing');
  const [selectedPersonKey, setSelectedPersonKey] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [submittingEntry, setSubmittingEntry] = useState(false);

  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPersonName, setEditPersonName] = useState('');
  const [updatingEntry, setUpdatingEntry] = useState(false);

  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (wheel) {
      setName(wheel.name);
      setSpinDuration(wheel.spinDurationSeconds || 5);
    }
  }, [wheel?.id]);

  useEffect(() => {
    if (people.length === 0) {
      setPersonMode('new');
      setSelectedPersonKey('');
      return;
    }
    setPersonMode((prev) => (prev === 'existing' || prev === 'new' ? prev : 'existing'));
    setSelectedPersonKey((prev) => {
      if (prev && people.some((person) => person.key === prev)) {
        return prev;
      }
      return people[0].key;
    });
  }, [people]);

  useEffect(() => {
    if (!editingEntryId || !wheel) {
      return;
    }
    const entry = wheel.entries.find((item) => item.id === editingEntryId);
    if (!entry) {
      setEditingEntryId(null);
      setEditLabel('');
      setEditPersonName('');
      return;
    }
    setEditLabel(entry.label);
    setEditPersonName(entry.person?.name ?? '');
  }, [editingEntryId, wheel]);

  const handleSaveWheel = async (event) => {
    event.preventDefault();
    if (!wheel || savingWheel) {
      return;
    }
    if (!adminSessionId) {
      setError('Your admin session expired. Please sign in again.');
      onSessionExpired();
      return;
    }

    const trimmedName = name.trim();
    const durationValue = Number(spinDuration) || 5;
    const updates = {};

    if (trimmedName && trimmedName !== wheel.name) {
      updates.name = trimmedName;
    }
    if (durationValue !== (wheel.spinDurationSeconds || 5)) {
      updates.spinDurationSeconds = durationValue;
    }

    if (!Object.keys(updates).length) {
      setFeedback('No changes to save.');
      return;
    }

    setSavingWheel(true);
    setFeedback('');
    setError('');

    try {
      const { data } = await api.patch(`/wheels/${wheel.id}`, updates, {
        headers: { 'x-admin-session': adminSessionId },
      });
      onWheelUpdated(data);
      const nextSlug = withSlug(data, wheels.filter((item) => item.id !== data.id)).slug;
      if (nextSlug !== wheelSlug) {
        navigate(`/admin/edit/${nextSlug}`, { replace: true });
      }
      setFeedback('Wheel settings updated.');
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        onSessionExpired();
        return;
      }
      setError('Failed to update wheel settings. Please try again.');
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setSavingWheel(false);
    }
  };

  const handleAddEntry = async (event) => {
    event.preventDefault();
    if (!wheel || submittingEntry) {
      return;
    }
    if (!adminSessionId) {
      setError('Your admin session expired. Please sign in again.');
      onSessionExpired();
      return;
    }
    if (!entryLabel.trim()) {
      setError('Entry description is required.');
      return;
    }

    let personNameValue = '';
    if (personMode === 'existing') {
      const selected = people.find((person) => person.key === selectedPersonKey);
      if (!selected) {
        setError('Select an existing person to credit.');
        return;
      }
      personNameValue = selected.name;
    } else {
      if (!newPersonName.trim()) {
        setError('Provide a name for the new person.');
        return;
      }
      personNameValue = newPersonName.trim();
    }

    const countValue = Math.max(1, Number(entryCount) || 1);

    setSubmittingEntry(true);
    setFeedback('');
    setError('');

    try {
      const { data } = await api.post(
        `/wheels/${wheel.id}/entries`,
        {
          label: entryLabel.trim(),
          personName: personNameValue,
          count: countValue,
        },
        {
          headers: { 'x-admin-session': adminSessionId },
        },
      );
      onEntriesAdded(wheel.id, data);
      setEntryLabel('');
      setEntryCount(1);
      if (personMode === 'new') {
        setNewPersonName('');
      }
      setFeedback(`Added ${data.length} entr${data.length === 1 ? 'y' : 'ies'} to the wheel.`);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        onSessionExpired();
        return;
      }
      setError('Failed to add entry. Check your inputs and try again.');
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setSubmittingEntry(false);
    }
  };

  const startEditingEntry = (entry) => {
    setEditingEntryId(entry.id);
    setEditLabel(entry.label);
    setEditPersonName(entry.person?.name ?? '');
    setFeedback('');
    setError('');
  };

  const cancelEditingEntry = useCallback(() => {
    setEditingEntryId(null);
    setEditLabel('');
    setEditPersonName('');
  }, []);

  const handleEditEntrySubmit = async (event) => {
    event.preventDefault();
    if (!wheel || !editingEntryId || updatingEntry) {
      return;
    }

    if (!adminSessionId) {
      setError('Your admin session expired. Please sign in again.');
      onSessionExpired();
      return;
    }

    const entry = wheel.entries.find((item) => item.id === editingEntryId);
    if (!entry) {
      cancelEditingEntry();
      return;
    }

    const trimmedLabel = editLabel.trim();
    const trimmedPerson = editPersonName.trim();
    const payload = {};

    if (trimmedLabel && trimmedLabel !== entry.label) {
      payload.label = trimmedLabel;
    }
    if (trimmedPerson && trimmedPerson !== (entry.person?.name ?? '')) {
      payload.personName = trimmedPerson;
    }

    if (!Object.keys(payload).length) {
      setFeedback('No changes to save for this entry.');
      cancelEditingEntry();
      return;
    }

    setUpdatingEntry(true);
    setFeedback('');
    setError('');

    try {
      const { data } = await api.patch(
        `/wheels/${wheel.id}/entries/${entry.id}`,
        payload,
        {
          headers: { 'x-admin-session': adminSessionId },
        },
      );
      onEntryUpdated(wheel.id, data);
      setFeedback('Entry updated.');
      cancelEditingEntry();
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        onSessionExpired();
        return;
      }
      setError('Failed to update entry. Please try again.');
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setUpdatingEntry(false);
    }
  };

  const handleToggleEntry = useCallback(
    async (entry) => {
      if (!wheel) {
        return;
      }
      if (!adminSessionId) {
        setError('Your admin session expired. Please sign in again.');
        onSessionExpired();
        return;
      }
      setFeedback('');
      setError('');
      try {
        const { data } = await api.patch(
          `/wheels/${wheel.id}/entries/${entry.id}`,
          { disabled: !entry.disabled },
          {
            headers: { 'x-admin-session': adminSessionId },
          },
        );
        onEntryUpdated(wheel.id, data);
        setFeedback(`Entry ${data.disabled ? 'disabled' : 'enabled'}.`);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          onSessionExpired();
          return;
        }
        setError('Failed to update entry status.');
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
    [adminSessionId, onEntryUpdated, onSessionExpired, wheel],
  );

  const handleDeleteEntry = useCallback(
    async (entry) => {
      if (!wheel) {
        return;
      }
      if (!adminSessionId) {
        setError('Your admin session expired. Please sign in again.');
        onSessionExpired();
        return;
      }
      setFeedback('');
      setError('');
      try {
        await api.delete(`/wheels/${wheel.id}/entries/${entry.id}`, {
          headers: { 'x-admin-session': adminSessionId },
        });
        onEntryDeleted(wheel.id, entry.id);
        if (editingEntryId === entry.id) {
          cancelEditingEntry();
        }
        setFeedback('Entry removed.');
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          onSessionExpired();
          return;
        }
        setError('Failed to delete entry.');
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
    [adminSessionId, cancelEditingEntry, editingEntryId, onEntryDeleted, onSessionExpired, wheel],
  );

  if (!wheel) {
    return (
      <section className="admin-edit">
        <div className="admin-card">
          <div className="admin-card__header">
            <h2>Wheel not found</h2>
            <Link className="admin-link" to="/admin">
              ← Back to admin home
            </Link>
          </div>
          <p>We couldn&apos;t find that wheel. Select another wheel from the admin home.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-edit">
      <div className="admin-card">
        <div className="admin-card__header">
          <h2>Edit wheel</h2>
          <Link className="admin-link" to="/admin">
            ← Back to admin home
          </Link>
        </div>
        <form className="admin-form" onSubmit={handleSaveWheel}>
          <div className="admin-form__field">
            <label htmlFor="edit-wheel-name">Wheel name</label>
            <input
              id="edit-wheel-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="admin-form__field">
            <label htmlFor="edit-wheel-duration">Spin duration (seconds)</label>
            <input
              id="edit-wheel-duration"
              type="number"
              min="1"
              value={spinDuration}
              onChange={(event) => setSpinDuration(event.target.value)}
            />
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-button" disabled={savingWheel}>
              {savingWheel ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h3>Add entries</h3>
        <form className="admin-form" onSubmit={handleAddEntry}>
          <div className="admin-form__field">
            <label htmlFor="add-entry-label">Entry description</label>
            <input
              id="add-entry-label"
              value={entryLabel}
              onChange={(event) => setEntryLabel(event.target.value)}
              placeholder="e.g. Dinner gift card"
            />
          </div>
          <div className="admin-form__field">
            <label htmlFor="add-entry-count">Number of identical entries</label>
            <input
              id="add-entry-count"
              type="number"
              min="1"
              value={entryCount}
              onChange={(event) => setEntryCount(event.target.value)}
            />
          </div>
          <div className="admin-form__field">
            <label>Person to credit</label>
            <div className="admin-person-mode">
              <label>
                <input
                  type="radio"
                  name="entry-person-mode"
                  value="existing"
                  checked={personMode === 'existing'}
                  disabled={people.length === 0}
                  onChange={() => setPersonMode('existing')}
                />
                Existing person
              </label>
              <label>
                <input
                  type="radio"
                  name="entry-person-mode"
                  value="new"
                  checked={personMode === 'new' || people.length === 0}
                  onChange={() => setPersonMode('new')}
                />
                New person
              </label>
            </div>
            {personMode === 'existing' && people.length > 0 ? (
              <select
                value={selectedPersonKey}
                onChange={(event) => setSelectedPersonKey(event.target.value)}
              >
                {people.map((person) => (
                  <option key={person.key} value={person.key}>
                    {person.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={newPersonName}
                onChange={(event) => setNewPersonName(event.target.value)}
                placeholder="Enter the person&apos;s name"
              />
            )}
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-button" disabled={submittingEntry}>
              {submittingEntry ? 'Adding…' : 'Add entries'}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <h3>Entries</h3>
        {groupedEntries.length === 0 ? (
          <p className="admin-empty-state">No entries yet. Add one above to get started.</p>
        ) : (
          <div className="admin-wheel-editor__groups">
            {groupedEntries.map((group) => (
              <div key={group.key} className="admin-wheel-editor__group">
                <div className="admin-wheel-editor__group-header">
                  <h4>{group.name}</h4>
                  <span className="admin-badge">{group.entries.length}</span>
                </div>
                <ul className="admin-wheel-editor__entries">
                  {group.entries.map((entry) => (
                    <li
                      key={entry.id}
                      className={`admin-wheel-editor__entry${entry.disabled ? ' admin-wheel-editor__entry--disabled' : ''}`}
                    >
                      {editingEntryId === entry.id ? (
                        <form className="admin-entry-form" onSubmit={handleEditEntrySubmit}>
                          <input
                            value={editLabel}
                            onChange={(event) => setEditLabel(event.target.value)}
                          />
                          <input
                            value={editPersonName}
                            onChange={(event) => setEditPersonName(event.target.value)}
                            placeholder="Person to credit"
                          />
                          <div className="admin-entry-form__actions">
                            <button type="submit" className="admin-button" disabled={updatingEntry}>
                              {updatingEntry ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              className="admin-button admin-button--ghost"
                              onClick={cancelEditingEntry}
                              disabled={updatingEntry}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="admin-wheel-editor__entry-content">
                          <div className="admin-wheel-editor__entry-label">
                            <span>{entry.label}</span>
                            {entry.disabled && <span className="admin-badge admin-badge--muted">Disabled</span>}
                          </div>
                          <div className="admin-wheel-editor__entry-actions">
                            <button
                              type="button"
                              className="admin-link"
                              onClick={() => startEditingEntry(entry)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="admin-link"
                              onClick={() => handleToggleEntry(entry)}
                            >
                              {entry.disabled ? 'Enable' : 'Disable'}
                            </button>
                            <button
                              type="button"
                              className="admin-link admin-link--danger"
                              onClick={() => handleDeleteEntry(entry)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {(feedback || error) && (
        <p className={`admin-feedback${error ? ' admin-feedback--error' : ' admin-feedback--success'}`}>
          {error || feedback}
        </p>
      )}
    </section>
  );
};

export default AdminEditWheel;
