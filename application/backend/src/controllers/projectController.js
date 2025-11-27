const fabricService = require('../services/fabricMultiChannelService');

class ProjectController {
    // Create a new project on the blockchain
    async createProject(req, res) {
        try {
            const { projectId, name, description, totalValue } = req.body;

            // Validation
            if (!projectId || !name || !description || !totalValue) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required: projectId, name, description, totalValue'
                });
            }

            // Ensure user is authenticated and is an Employer
            if (!req.user || req.user.organization !== 'Employer') {
                return res.status(403).json({
                    success: false,
                    message: 'Only Employer can create projects'
                });
            }

            // Switch to the user's organization before invoking
            await fabricService.switchOrganization(req.user.organization);

            console.log(`📝 Creating project: ${projectId} by ${req.user.organization}`);
            
            await fabricService.invokeChaincode(
                'createProject',
                'channel1', // Specify channel
                projectId,
                name,
                description,
                totalValue.toString()
            );

            console.log(`✅ Project ${projectId} created successfully`);

            res.status(201).json({
                success: true,
                message: 'Project created successfully on blockchain',
                data: { projectId, name, description, totalValue }
            });
        } catch (error) {
            console.error(`❌ Failed to create project: ${error}`);
            
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create project'
            });
        }
    }

    // Query a specific project
    async queryProject(req, res) {
        try {
            const { projectId } = req.params;

            console.log(`🔍 Querying project: ${projectId}`);
            
            const project = await fabricService.queryChaincode('queryProject', 'channel1', projectId);

            console.log(`✅ Project ${projectId} retrieved successfully`);

            res.status(200).json({
                success: true,
                data: project
            });
        } catch (error) {
            console.error(`❌ Failed to query project: ${error}`);
            
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to query project'
            });
        }
    }

    // Query all projects
    async getAllProjects(req, res) {
        try {
            console.log(`🔍 Querying all projects`);
            
            const projects = await fabricService.queryChaincode('queryAllProjects', 'channel1', '', '', '100');

            console.log(`✅ Retrieved ${projects.projects?.length || 0} projects`);

            res.status(200).json({
                success: true,
                data: projects
            });
        } catch (error) {
            console.error(`❌ Failed to query all projects: ${error}`);
            
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to query projects'
            });
        }
    }

    // Accept a project (Contractor accepting project)
    async acceptProject(req, res) {
        try {
            const { projectId } = req.params;

            if (!projectId) {
                return res.status(400).json({
                    success: false,
                    message: 'Project ID is required'
                });
            }

            // Ensure user is authenticated and is a Contractor
            if (!req.user || req.user.organization !== 'Contractor') {
                return res.status(403).json({
                    success: false,
                    message: 'Only Contractor can accept projects'
                });
            }

            // Switch to the user's organization before invoking
            await fabricService.switchOrganization(req.user.organization);

            console.log(`🤝 ${req.user.organization} accepting project: ${projectId}`);
            
            await fabricService.invokeChaincode(
                'acceptProject',
                'channel1',
                projectId
            );

            console.log(`✅ Project ${projectId} accepted successfully`);

            res.status(200).json({
                success: true,
                message: 'Project accepted successfully on blockchain',
                data: { projectId }
            });
        } catch (error) {
            console.error(`❌ Failed to accept project: ${error}`);
            
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to accept project'
            });
        }
    }
}

module.exports = new ProjectController();
