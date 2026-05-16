import { Router } from 'express';
import * as registration from '../controllers/registrationController.js';
import { storageMode } from '../storage/blobSync.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, storage: storageMode() });
});

router.get('/stats', (req, res, next) => {
  registration.getStats(req, res).catch(next);
});

router.get('/search', (req, res, next) => {
  registration.search(req, res).catch(next);
});

router.get('/registrations/check-duplicate', (req, res, next) => {
  registration.checkDuplicate(req, res).catch(next);
});

router.get('/registrations/by-mobile', (req, res, next) => {
  registration.findByMobile(req, res).catch(next);
});

router.get('/registrations/export', (req, res, next) => {
  registration.exportExcel(req, res).catch(next);
});

router.get('/registrations', (req, res, next) => {
  registration.listAll(req, res).catch(next);
});

router.post('/registrations', (req, res, next) => {
  registration.create(req, res).catch(next);
});

router.put('/registrations/:rowIndex', (req, res, next) => {
  registration.update(req, res).catch(next);
});

router.delete('/registrations/:rowIndex', (req, res, next) => {
  registration.remove(req, res).catch(next);
});

router.post('/registrations/repair-all', (req, res, next) => {
  registration.repairAll(req, res).catch(next);
});

router.post('/registrations/:rowIndex/repair', (req, res, next) => {
  registration.repairOne(req, res).catch(next);
});

export default router;
