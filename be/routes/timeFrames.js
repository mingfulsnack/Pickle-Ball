const express = require('express');
const router = express.Router();
const timeFrameController = require('../controllers/timeFrameController');
const { authenticateToken, checkRole } = require('../middleware/auth');
const { validateTimeFrame } = require('../middleware/validation');

// Apply authentication and role check to all routes
router.use(authenticateToken);
router.use(checkRole(['manager', 'staff']));

// Get all time frames with shifts
router.get('/', timeFrameController.getTimeFrames);

// Get specific time frame detail
router.get('/:id', timeFrameController.getTimeFrameDetail);

// Create new time frame
router.post('/', validateTimeFrame, timeFrameController.createTimeFrame);

// Update time frame
router.put('/:id', validateTimeFrame, timeFrameController.updateTimeFrame);

// Delete time frame
router.delete('/:id', timeFrameController.deleteTimeFrame);

module.exports = router;
