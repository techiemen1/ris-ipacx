const express = require('express');
const router = express.Router();
const modalityController = require('../controllers/modalityController');

// Allow public read or protected? Generally authenticated.
// Assuming basic auth middleware usage in index.js or ignored for now based on other files.
// Let's keep it simple.

router.get('/', modalityController.getAllModalities);
router.post('/', modalityController.createModality);
router.delete('/:id', modalityController.deleteModality);

module.exports = router;
