const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/children');
const { handleValidationErrors, childCreate, childUpdate, idParam, staffProcessStatusUpdate } = require('../middleware/validate');
const { body } = require('express-validator');

router.get('/', ctrl.list);
router.get('/:id/attachments/:filename', idParam, ctrl.getChecklistAttachment);
router.get('/:id', idParam, handleValidationErrors, ctrl.get);
router.post('/', childCreate, handleValidationErrors, ctrl.create);
router.put(
  '/:id/staff-process-status',
  staffProcessStatusUpdate,
  handleValidationErrors,
  ctrl.updateStaffProcessStatus
);
router.put('/:id', childUpdate, handleValidationErrors, ctrl.update);
router.delete('/bulk', ctrl.bulkRemove);
router.delete('/:id', idParam, handleValidationErrors, ctrl.remove);
router.put('/:id/checklist', idParam, [body('items').isArray()], handleValidationErrors, ctrl.updateChecklist);
router.put('/:id/certificate-of-live-birth', idParam, handleValidationErrors, ctrl.updateCertificateOfLiveBirth);
router.put('/:id/paternity-affidavit', idParam, handleValidationErrors, ctrl.updatePaternityAffidavit);
router.put('/:id/delayed-registration-affidavit', idParam, handleValidationErrors, ctrl.updateDelayedRegistrationAffidavit);
router.put('/:id/witness-affidavit', idParam, handleValidationErrors, ctrl.updateWitnessAffidavit);
router.put('/:id/out-of-town-affidavit', idParam, handleValidationErrors, ctrl.updateOutOfTownAffidavit);
router.put('/:id/muslim-attachment', idParam, handleValidationErrors, ctrl.updateMuslimAttachment);

module.exports = router;
