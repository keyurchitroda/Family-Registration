import { createApp } from '../server/dist/app.js';

/** Catch-all so /api/stats, /api/registrations/:id, etc. all hit Express on Vercel */
const app = createApp();

export default app;
