const express = require('express');
const multer = require('multer');
const ctrl = require('../controllers/database');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 250 * 1024 * 1024 },
});

const router = express.Router();

router.get('/info', ctrl.getInfo);
router.get('/export', ctrl.exportDatabase);
router.post('/import', upload.single('file'), ctrl.importDatabase);

module.exports = router;
