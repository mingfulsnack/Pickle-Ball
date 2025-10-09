const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const contactController = require('../controllers/contactController');

router.use(authenticateToken);

router.get('/', contactController.listMyContacts);
router.post('/', contactController.createContact);
router.put('/:id', contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;
