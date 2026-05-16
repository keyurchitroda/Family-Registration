import serverless from 'serverless-http';
import { createApp } from '../server/dist/app.js';

const app = createApp();

/** Vercel serverless — all /api/* requests (use rewrite in vercel.json) */
export default serverless(app);
