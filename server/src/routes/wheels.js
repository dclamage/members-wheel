import express from 'express';
import { all, get, run } from '../db.js';
import adminOnly from '../middleware/adminOnly.js';

const router = express.Router();

const mapWheelRows = (wheelRows, entryRows) => {
  const entriesByWheel = entryRows.reduce((acc, entry) => {
    if (!acc.has(entry.wheel_id)) {
      acc.set(entry.wheel_id, []);
    }
    acc.get(entry.wheel_id).push({
      id: entry.id,
      label: entry.label,
      person: {
        id: entry.person_id,
        name: entry.person_name,
      },
      createdAt: entry.created_at,
    });
    return acc;
  }, new Map());

  return wheelRows.map((wheel) => ({
    id: wheel.id,
    name: wheel.name,
    spinDurationSeconds: wheel.spin_duration_seconds,
    createdAt: wheel.created_at,
    entries: entriesByWheel.get(wheel.id) || [],
  }));
};

router.get('/', async (req, res, next) => {
  try {
    const wheels = await all('SELECT * FROM wheels ORDER BY created_at ASC');
    if (!wheels.length) {
      return res.json([]);
    }

    const wheelIds = wheels.map((wheel) => wheel.id);
    const placeholders = wheelIds.map(() => '?').join(',');
    const entries = await all(
      `SELECT e.*, p.name as person_name FROM entries e
       INNER JOIN people p ON e.person_id = p.id
       WHERE e.wheel_id IN (${placeholders})
       ORDER BY e.created_at ASC`,
      wheelIds,
    );

    return res.json(mapWheelRows(wheels, entries));
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const wheel = await get('SELECT * FROM wheels WHERE id = ?', [req.params.id]);
    if (!wheel) {
      return res.status(404).json({ message: 'Wheel not found' });
    }

    const entries = await all(
      `SELECT e.*, p.name as person_name FROM entries e
       INNER JOIN people p ON e.person_id = p.id
       WHERE e.wheel_id = ?
       ORDER BY e.created_at ASC`,
      [req.params.id],
    );

    const [formatted] = mapWheelRows([wheel], entries);
    return res.json(formatted);
  } catch (error) {
    return next(error);
  }
});

router.post('/', adminOnly, async (req, res, next) => {
  try {
    const { name, spinDurationSeconds = 5 } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const result = await run(
      'INSERT INTO wheels (name, spin_duration_seconds) VALUES (?, ?)',
      [name, Number(spinDurationSeconds) || 5],
    );

    const wheel = await get('SELECT * FROM wheels WHERE id = ?', [result.id]);
    const [formatted] = mapWheelRows([wheel], []);
    return res.status(201).json(formatted);
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', adminOnly, async (req, res, next) => {
  try {
    const { name, spinDurationSeconds } = req.body;
    const wheel = await get('SELECT * FROM wheels WHERE id = ?', [req.params.id]);
    if (!wheel) {
      return res.status(404).json({ message: 'Wheel not found' });
    }

    const nextName = name ?? wheel.name;
    const nextDuration = spinDurationSeconds ?? wheel.spin_duration_seconds;

    await run('UPDATE wheels SET name = ?, spin_duration_seconds = ? WHERE id = ?', [
      nextName,
      Number(nextDuration) || 5,
      req.params.id,
    ]);

    const updated = await get('SELECT * FROM wheels WHERE id = ?', [req.params.id]);
    const entries = await all(
      `SELECT e.*, p.name as person_name FROM entries e
       INNER JOIN people p ON e.person_id = p.id
       WHERE e.wheel_id = ?
       ORDER BY e.created_at ASC`,
      [req.params.id],
    );
    const [formatted] = mapWheelRows([updated], entries);
    return res.json(formatted);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const wheel = await get('SELECT * FROM wheels WHERE id = ?', [req.params.id]);
    if (!wheel) {
      return res.status(404).json({ message: 'Wheel not found' });
    }
    await run('DELETE FROM wheels WHERE id = ?', [req.params.id]);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

const findOrCreatePerson = async (name) => {
  const existing = await get('SELECT * FROM people WHERE LOWER(name) = LOWER(?)', [name]);
  if (existing) {
    return existing.id;
  }
  const created = await run('INSERT INTO people (name) VALUES (?)', [name]);
  return created.id;
};

router.post('/:id/entries', adminOnly, async (req, res, next) => {
  try {
    const wheel = await get('SELECT * FROM wheels WHERE id = ?', [req.params.id]);
    if (!wheel) {
      return res.status(404).json({ message: 'Wheel not found' });
    }

    const { label, personName, count = 1 } = req.body;
    if (!label) {
      return res.status(400).json({ message: 'Label is required' });
    }
    if (!personName) {
      return res.status(400).json({ message: 'personName is required' });
    }

    const normalizedCount = Math.max(1, Number(count) || 1);
    const personId = await findOrCreatePerson(personName);

    const createdEntryIds = [];
    for (let i = 0; i < normalizedCount; i += 1) {
      const { id } = await run(
        'INSERT INTO entries (wheel_id, label, person_id) VALUES (?, ?, ?)',
        [req.params.id, label, personId],
      );
      createdEntryIds.push(id);
    }

    const placeholders = createdEntryIds.map(() => '?').join(',');
    const entries = await all(
      `SELECT e.*, p.name as person_name FROM entries e
       INNER JOIN people p ON e.person_id = p.id
       WHERE e.id IN (${placeholders})
       ORDER BY e.created_at ASC`,
      createdEntryIds,
    );

    const response = entries.map((entry) => ({
      id: entry.id,
      label: entry.label,
      person: {
        id: entry.person_id,
        name: entry.person_name,
      },
      createdAt: entry.created_at,
    }));

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
});

router.patch('/:wheelId/entries/:entryId', adminOnly, async (req, res, next) => {
  try {
    const entry = await get('SELECT * FROM entries WHERE id = ? AND wheel_id = ?', [
      req.params.entryId,
      req.params.wheelId,
    ]);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    const updates = [];
    const params = [];

    if (typeof req.body.label === 'string' && req.body.label.trim().length > 0) {
      updates.push('label = ?');
      params.push(req.body.label.trim());
    }

    if (typeof req.body.personName === 'string' && req.body.personName.trim().length > 0) {
      const personId = await findOrCreatePerson(req.body.personName.trim());
      updates.push('person_id = ?');
      params.push(personId);
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'No valid updates provided' });
    }

    params.push(req.params.entryId);

    await run(`UPDATE entries SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await get(
      `SELECT e.*, p.name as person_name FROM entries e
       INNER JOIN people p ON e.person_id = p.id
       WHERE e.id = ?`,
      [req.params.entryId],
    );

    return res.json({
      id: updated.id,
      label: updated.label,
      person: {
        id: updated.person_id,
        name: updated.person_name,
      },
      createdAt: updated.created_at,
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:wheelId/entries/:entryId', adminOnly, async (req, res, next) => {
  try {
    const entry = await get('SELECT * FROM entries WHERE id = ? AND wheel_id = ?', [
      req.params.entryId,
      req.params.wheelId,
    ]);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    await run('DELETE FROM entries WHERE id = ?', [req.params.entryId]);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
