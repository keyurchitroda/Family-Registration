import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, () => {
  if (config.mongodbUri) {
    console.log(`Samaj registration API (MongoDB) → ${config.mongodbDb}`);
  } else {
    if (config.mongodbUriError) {
      console.warn(`MongoDB disabled: ${config.mongodbUriError}`);
    }
    console.log(`Samaj registration API (Excel) → ${config.excelPath}`);
  }
  console.log(`Listening on http://localhost:${config.port}`);
});
