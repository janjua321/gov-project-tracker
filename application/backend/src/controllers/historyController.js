const fabricService = require('../services/fabricMultiChannelService');

class HistoryController {
    
    /**
     * Get complete project history from Channel 1
     * GET /api/history/project/:projectId
     */
    async getProjectHistory(req, res) {
        try {
            const { projectId } = req.params;
            console.log(`🔍 Getting history for project: ${projectId}`);
            
            const history = await fabricService.queryChaincode('getProjectHistory', 'channel1', projectId);
            
            res.json({
                success: true,
                projectId,
                channel: 'channel1',
                history
            });
        } catch (error) {
            console.error('❌ Error getting project history:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get supply chain history from Channel 2
     * GET /api/history/supply/:projectId
     */
    async getSupplyHistory(req, res) {
        try {
            const { projectId } = req.params;
            console.log(`🔍 Getting supply history for project: ${projectId}`);
            
            // First ensure we're connected to channel2
            if (!fabricService.getNetwork('channel2')) {
                await fabricService.connectToChannel('channel2', 'supply-chain');
            }
            
            const history = await fabricService.queryChaincode('getSupplyHistory', 'channel2', projectId);
            
            res.json({
                success: true,
                projectId,
                channel: 'channel2',
                history
            });
        } catch (error) {
            console.error('❌ Error getting supply history:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get financial history from Channel 3
     * GET /api/history/financial/:projectId
     */
    async getFinancialHistory(req, res) {
        try {
            const { projectId } = req.params;
            console.log(`🔍 Getting financial history for project: ${projectId}`);
            
            // First ensure we're connected to channel3
            if (!fabricService.getNetwork('channel3')) {
                await fabricService.connectToChannel('channel3', 'financial-oversight');
            }
            
            const history = await fabricService.queryChaincode('getFinancialHistory', 'channel3', projectId);
            
            res.json({
                success: true,
                projectId,
                channel: 'channel3',
                history
            });
        } catch (error) {
            console.error('❌ Error getting financial history:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get complete multi-channel history for a project
     * GET /api/history/complete/:projectId
     */
    async getCompleteHistory(req, res) {
        try {
            const { projectId } = req.params;
            console.log(`🔍 Getting complete history for project: ${projectId}`);
            
            // First, get the project data from channel1
            const projectData = await fabricService.queryChaincode('queryProject', 'channel1', projectId);
            
            if (!projectData) {
                return res.status(404).json({
                    success: false,
                    error: `Project ${projectId} not found`
                });
            }

            const project = typeof projectData === 'string' ? JSON.parse(projectData) : projectData;
            
            // Get timeline history
            const timelineData = await this.getTimelineData(projectId);
            
            // Calculate stats
            const channelsInvolved = new Set();
            timelineData.forEach(tx => channelsInvolved.add(tx.channel));
            
            // Format response for public tracker
            const response = {
                success: true,
                project: project,
                timeline: timelineData,
                summary: {
                    totalTransactions: timelineData.length,
                    channelsInvolved: channelsInvolved.size,
                    queriedAt: new Date().toISOString()
                }
            };
            
            res.json(response);
        } catch (error) {
            console.error('❌ Error getting complete history:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get timeline view (chronological across all channels)
     * GET /api/history/timeline/:projectId
     */
    async getTimeline(req, res) {
        try {
            const { projectId } = req.params;
            console.log(`🔍 Getting timeline for project: ${projectId}`);
            
            const timeline = await this.getTimelineData(projectId);
            
            res.json({
                success: true,
                projectId,
                timeline,
                totalEvents: timeline.length
            });
        } catch (error) {
            console.error('❌ Error getting timeline:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Helper method (not exposed as route)
    async getTimelineData(projectId) {
        try {
            // Get history from Channel 1 (always available)
            const projectHistory = await fabricService.queryChaincode('getProjectHistory', 'channel1', projectId);
            
            // Flatten and sort by timestamp
            const timeline = [];
            
            // Process Channel 1 history
            if (projectHistory && Array.isArray(projectHistory)) {
                projectHistory.forEach(tx => {
                    timeline.push({
                        channel: 'channel1',
                        channelName: 'Project Management',
                        action: tx.action || tx.txType || 'Transaction',
                        actor: tx.actor || tx.invokedBy || tx.mspId,
                        timestamp: tx.timestamp,
                        details: tx.details || tx.value,
                        txId: tx.txId,
                        blockNumber: tx.blockNumber
                    });
                });
            }
            
            // Note: Channel 2 and 3 are not set up yet in this demo
            // They can be added when those channels are created and chaincodes deployed
            
            // Sort chronologically (newest first)
            timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return timeline;
        } catch (error) {
            console.error('Error getting timeline data:', error);
            throw error;
        }
    }
}

module.exports = new HistoryController();
