const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

// Get project history from Channel 1
router.get('/project/:projectId', historyController.getProjectHistory.bind(historyController));

// Get supply chain history from Channel 2
router.get('/supply/:projectId', historyController.getSupplyHistory.bind(historyController));

// Get financial history from Channel 3
router.get('/financial/:projectId', historyController.getFinancialHistory.bind(historyController));

// Get complete multi-channel history
router.get('/complete/:projectId', historyController.getCompleteHistory.bind(historyController));

// Get chronological timeline across all channels
router.get('/timeline/:projectId', historyController.getTimeline.bind(historyController));

module.exports = router;
