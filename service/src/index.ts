import 'dotenv/config';
import { createApp } from './app.js';

const app = createApp();
const port = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Service listening on port ${port}`);
});


