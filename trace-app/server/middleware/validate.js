const { body, param, validationResult } = require('express-validator');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
}

const childCreate = [
  body('first_name').trim().notEmpty().isLength({ max: 200 }).escape(),
  body('middle_name').optional({ values: 'falsy' }).trim().isLength({ max: 200 }).escape(),
  body('last_name').trim().notEmpty().isLength({ max: 200 }).escape(),
  body('date_of_birth').isISO8601(),
  body('place_of_birth').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).escape(),
  body('contact_no').optional({ values: 'falsy' }).trim().isLength({ max: 50 }).escape(),
  body('registrant_deceased').optional().isBoolean().toBoolean(),
  body('hilot_deceased').optional().isBoolean().toBoolean(),
  body('parent_foreigner').optional().isBoolean().toBoolean(),
  body('out_of_town').optional().isBoolean().toBoolean(),
];

const childUpdate = [
  param('id').isInt({ min: 1 }),
  body('first_name').optional().trim().notEmpty().isLength({ max: 200 }).escape(),
  body('middle_name').optional({ values: 'falsy' }).trim().isLength({ max: 200 }).escape(),
  body('last_name').optional().trim().notEmpty().isLength({ max: 200 }).escape(),
  body('date_of_birth').optional().isISO8601(),
  body('place_of_birth').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).escape(),
  body('contact_no').optional({ values: 'falsy' }).trim().isLength({ max: 50 }).escape(),
  body('registrant_deceased').optional().isBoolean().toBoolean(),
  body('hilot_deceased').optional().isBoolean().toBoolean(),
  body('parent_foreigner').optional().isBoolean().toBoolean(),
  body('out_of_town').optional().isBoolean().toBoolean(),
];

const idParam = [param('id').isInt({ min: 1 })];

const staffProcessStatusUpdate = [
  param('id').isInt({ min: 1 }),
  body('staff_process_status').isIn(['under_process', 'verified']),
];

module.exports = { handleValidationErrors, childCreate, childUpdate, idParam, staffProcessStatusUpdate };
