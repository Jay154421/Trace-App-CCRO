const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/children');
const { handleValidationErrors, childCreate, childUpdate, idParam } = require('../middleware/validate');
const { body } = require('express-validator');

router.get('/', ctrl.list);
router.get('/:id', idParam, handleValidationErrors, ctrl.get);
router.post('/', childCreate, handleValidationErrors, ctrl.create);
router.put('/:id', childUpdate, handleValidationErrors, ctrl.update);
router.delete('/:id', idParam, handleValidationErrors, ctrl.remove);
router.put('/:id/checklist', idParam, [body('items').isArray()], handleValidationErrors, ctrl.updateChecklist);

module.exports = router;
