import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Samaj registration API (Excel) → ${config.excelPath}`);
  console.log(`Listening on http://localhost:${config.port}`);
});
