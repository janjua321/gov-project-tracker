const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { optionalAuth, authenticate } = require('../middleware/authMiddleware');

// Project routes (mounted at /api/projects in server.js)
// Public routes
router.get('/', optionalAuth, projectController.getAllProjects);
router.get('/:projectId', optionalAuth, projectController.queryProject);

// Protected routes (require authentication)
router.post('/', authenticate, projectController.createProject);
router.post('/:projectId/accept', authenticate, projectController.acceptProject);

module.exports = router;
