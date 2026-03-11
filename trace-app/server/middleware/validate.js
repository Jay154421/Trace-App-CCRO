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
];

const childUpdate = [
  param('id').isInt({ min: 1 }),
  body('first_name').optional().trim().notEmpty().isLength({ max: 200 }).escape(),
  body('middle_name').optional({ values: 'falsy' }).trim().isLength({ max: 200 }).escape(),
  body('last_name').optional().trim().notEmpty().isLength({ max: 200 }).escape(),
  body('date_of_birth').optional().isISO8601(),
  body('place_of_birth').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).escape(),
  body('contact_no').optional({ values: 'falsy' }).trim().isLength({ max: 50 }).escape(),
];

const idParam = [param('id').isInt({ min: 1 })];

module.exports = { handleValidationErrors, childCreate, childUpdate, idParam };
