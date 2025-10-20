const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { authenticateToken, checkRole } = require('../middleware/auth');
const { validateShift } = require('../middleware/validation');

// Get available shifts for a specific date and time (public endpoint for booking)
router.get('/available', shiftController.getAvailableShifts);

// Apply authentication and role check to remaining routes
router.use(authenticateToken);
router.use(checkRole(['manager', 'staff']));

// Get shifts by time frame ID
router.get('/timeframe/:timeFrameId', shiftController.getShiftsByTimeFrame);

// Get specific shift detail
router.get('/:id', shiftController.getShiftDetail);

// Create new shift
router.post('/', validateShift, shiftController.createShift);

// Update shift (allow partial updates)
const { schemas } = require('../middleware/validation');
const { validate } = require('../middleware/validation');
router.put('/:id', validate(schemas.shiftUpdate), shiftController.updateShift);

// Delete shift
router.delete('/:id', shiftController.deleteShift);

module.exports = router;
