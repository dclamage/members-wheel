import 'dotenv/config';
import app from './app.js';
import { initialize } from './db.js';

const PORT = process.env.PORT || 4000;

const start = async () => {
  try {
    await initialize();
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

start();
