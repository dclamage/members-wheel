import dotenv from 'dotenv';
import { all, get, initialize, run } from './db.js';

dotenv.config();

const createEntry = async ({ wheelId, personName, label, count = 1 }) => {
  for (let i = 0; i < count; i += 1) {
    const person = await get('SELECT id FROM people WHERE LOWER(name) = LOWER(?)', [personName]);
    let personId = person?.id;
    if (!personId) {
      const created = await run('INSERT INTO people (name) VALUES (?)', [personName]);
      personId = created.id;
    }
    await run('INSERT INTO entries (wheel_id, label, person_id) VALUES (?, ?, ?)', [
      wheelId,
      label,
      personId,
    ]);
  }
};

const seed = async () => {
  await initialize();

  const wheels = await all('SELECT id FROM wheels');
  if (wheels.length > 0) {
    // eslint-disable-next-line no-console
    console.log('Database already seeded. Skipping.');
    return;
  }

  const { id: wheelId } = await run('INSERT INTO wheels (name, spin_duration_seconds) VALUES (?, ?)', [
    'Launch Celebration',
    5,
  ]);

  await createEntry({ wheelId, personName: 'Alex', label: 'Team Lunch Voucher', count: 2 });
  await createEntry({ wheelId, personName: 'Jordan', label: 'Extra Vacation Day' });
  await createEntry({ wheelId, personName: 'Sam', label: 'Coffee Gift Card', count: 3 });
  await createEntry({ wheelId, personName: 'Riley', label: 'Work From Home Friday' });

  // eslint-disable-next-line no-console
  console.log('Seed data created.');
};

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to seed database', error);
    process.exit(1);
  });
