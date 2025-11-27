'use strict';

const { Contract } = require('fabric-contract-api');

class ProjectContract extends Contract {

    // Initialize the ledger with a sample infrastructure project
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        
        const projects = [
            {
                projectId: 'INFRA_001',
                name: 'Highway Infrastructure Development Project Phase 1',
                description: 'Multi-lane highway construction connecting major urban centers',
                employer: 'EmployerMSP',
                engineer: 'EngineerMSP', 
                contractor: 'ContractorMSP',
                totalValue: 30000000000, // ₹300 Crores
                status: 'INITIATED',
                createdAt: new Date().toISOString(),
                milestones: [
                    {
                        milestoneId: 'M001',
                        description: 'Site Survey and Environmental Clearance',
                        targetDate: '2025-12-31',
                        status: 'PLANNED'
                    },
                    {
                        milestoneId: 'M002', 
                        description: 'Foundation and Base Layer Construction',
                        targetDate: '2026-06-30',
                        status: 'PLANNED'
                    }
                ],
                workPackages: [],
                payments: []
            }
        ];

        for (let i = 0; i < projects.length; i++) {
            await ctx.stub.putState(projects[i].projectId, Buffer.from(JSON.stringify(projects[i])));
            console.info('Added <--> ', projects[i]);
        }
        
        console.info('============= END : Initialize Ledger ===========');
    }

    // Create a new infrastructure project
    async createProject(ctx, projectId, name, description, totalValue) {
        console.info('============= START : Create Project ===========');

        // Access control - only Employer can create projects
        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'EmployerMSP') {
            throw new Error('Access denied: Only Employer organization can create projects');
        }

        // Check if project already exists
        const projectBytes = await ctx.stub.getState(projectId);
        if (projectBytes && projectBytes.length > 0) {
            throw new Error(`Project ${projectId} already exists`);
        }

        const project = {
            projectId,
            name,
            description,
            employer: mspId,
            contractor: 'Not Assigned',
            totalValue: parseInt(totalValue),
            status: 'CREATED',
            createdAt: new Date().toISOString(),
            createdBy: ctx.clientIdentity.getID(),
            milestones: [],
            workPackages: [],
            payments: [],
            approvals: {}
        };

        await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));
        
        // Emit event for off-chain applications
        ctx.stub.setEvent('ProjectCreated', Buffer.from(JSON.stringify({
            projectId: projectId,
            name: name,
            employer: mspId,
            timestamp: project.createdAt
        })));

        console.info('============= END : Create Project ===========');
        return JSON.stringify(project);
    }

    // Accept project by Contractor
    async acceptProject(ctx, projectId) {
        console.info('============= START : Accept Project ===========');

        // Access control - only Contractor can accept projects
        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'ContractorMSP') {
            throw new Error('Access denied: Only Contractor organization can accept projects');
        }

        // Get existing project
        const projectBytes = await ctx.stub.getState(projectId);
        if (!projectBytes || projectBytes.length === 0) {
            throw new Error(`Project ${projectId} does not exist`);
        }

        const project = JSON.parse(projectBytes.toString());

        // Check if project is in CREATED status
        if (project.status !== 'CREATED') {
            throw new Error(`Project ${projectId} cannot be accepted. Current status: ${project.status}`);
        }

        // Check if project already has a contractor
        if (project.contractor && project.contractor !== 'Not Assigned') {
            throw new Error(`Project ${projectId} is already assigned to ${project.contractor}`);
        }

        // Assign contractor and update status
        project.contractor = mspId;
        project.status = 'ACCEPTED';
        project.acceptedAt = new Date().toISOString();
        project.acceptedBy = ctx.clientIdentity.getID();
        project.lastUpdated = new Date().toISOString();

        await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));
        
        // Emit event for off-chain applications
        ctx.stub.setEvent('ProjectAccepted', Buffer.from(JSON.stringify({
            projectId: projectId,
            contractor: mspId,
            acceptedBy: ctx.clientIdentity.getID(),
            timestamp: project.acceptedAt
        })));

        console.info('============= END : Accept Project ===========');
        return JSON.stringify(project);
    }

    // Submit work package by contractor
    async submitWorkPackage(ctx, projectId, workPackageId, description, ipfsHash, quantity, value) {
        console.info('============= START : Submit Work Package ===========');

        // Access control - only Contractor can submit work
        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'ContractorMSP') {
            throw new Error('Access denied: Only Contractor organization can submit work packages');
        }

        // Get existing project
        const projectBytes = await ctx.stub.getState(projectId);
        if (!projectBytes || projectBytes.length === 0) {
            throw new Error(`Project ${projectId} does not exist`);
        }

        const project = JSON.parse(projectBytes.toString());

        // Check if work package already exists
        const existingWorkPackage = project.workPackages.find(wp => wp.workPackageId === workPackageId);
        if (existingWorkPackage) {
            throw new Error(`Work package ${workPackageId} already exists for project ${projectId}`);
        }

        const workPackage = {
            workPackageId,
            description,
            ipfsHash, // IPFS hash for supporting documents/photos
            quantity: parseInt(quantity),
            value: parseInt(value),
            submittedBy: mspId,
            submittedAt: new Date().toISOString(),
            submitterId: ctx.clientIdentity.getID(),
            status: 'SUBMITTED',
            certifications: []
        };

        project.workPackages.push(workPackage);
        await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));

        // Emit event
        ctx.stub.setEvent('WorkPackageSubmitted', Buffer.from(JSON.stringify({
            projectId: projectId,
            workPackageId: workPackageId,
            submittedBy: mspId,
            value: value,
            timestamp: workPackage.submittedAt
        })));

        console.info('============= END : Submit Work Package ===========');
        return JSON.stringify(workPackage);
    }

    // Certify work by Engineer (PMC)
    async certifyWork(ctx, projectId, workPackageId, certificationLevel, remarks) {
        console.info('============= START : Certify Work ===========');

        // Access control - only Engineer can certify work
        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'EngineerMSP') {
            throw new Error('Access denied: Only Engineer organization can certify work');
        }

        // Get existing project
        const project = await this._getProject(ctx, projectId);
        const workPackage = project.workPackages.find(wp => wp.workPackageId === workPackageId);
        
        if (!workPackage) {
            throw new Error(`Work package ${workPackageId} not found in project ${projectId}`);
        }

        if (workPackage.status !== 'SUBMITTED') {
            throw new Error(`Work package ${workPackageId} is not in SUBMITTED status`);
        }

        const certification = {
            certifiedBy: mspId,
            certifierId: ctx.clientIdentity.getID(),
            level: certificationLevel, // 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'
            remarks: remarks || '',
            certifiedAt: new Date().toISOString()
        };

        workPackage.certifications.push(certification);
        workPackage.status = certificationLevel;
        workPackage.lastUpdated = new Date().toISOString();

        await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));

        // Emit event
        ctx.stub.setEvent('WorkCertified', Buffer.from(JSON.stringify({
            projectId: projectId,
            workPackageId: workPackageId,
            certifiedBy: mspId,
            level: certificationLevel,
            timestamp: certification.certifiedAt
        })));

        console.info('============= END : Certify Work ===========');
        return JSON.stringify(workPackage);
    }

    // Approve payment by Employer
    async approvePayment(ctx, projectId, workPackageId, approvedAmount, remarks) {
        console.info('============= START : Approve Payment ===========');

        // Access control - only Employer can approve payments
        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'EmployerMSP') {
            throw new Error('Access denied: Only Employer organization can approve payments');
        }

        // Get existing project
        const project = await this._getProject(ctx, projectId);
        const workPackage = project.workPackages.find(wp => wp.workPackageId === workPackageId);
        
        if (!workPackage) {
            throw new Error(`Work package ${workPackageId} not found in project ${projectId}`);
        }

        if (workPackage.status !== 'APPROVED') {
            throw new Error(`Work package ${workPackageId} must be certified as APPROVED before payment approval`);
        }

        const payment = {
            paymentId: `PAY_${projectId}_${workPackageId}_${Date.now()}`,
            workPackageId: workPackageId,
            approvedAmount: parseInt(approvedAmount),
            originalAmount: workPackage.value,
            approvedBy: mspId,
            approverId: ctx.clientIdentity.getID(),
            remarks: remarks || '',
            approvedAt: new Date().toISOString(),
            status: 'APPROVED',
            paymentStatus: 'PENDING_RELEASE'
        };

        project.payments.push(payment);
        workPackage.paymentApproved = true;
        workPackage.approvedAmount = parseInt(approvedAmount);

        await ctx.stub.putState(projectId, Buffer.from(JSON.stringify(project)));

        // Emit event
        ctx.stub.setEvent('PaymentApproved', Buffer.from(JSON.stringify({
            projectId: projectId,
            workPackageId: workPackageId,
            paymentId: payment.paymentId,
            approvedAmount: approvedAmount,
            approvedBy: mspId,
            timestamp: payment.approvedAt
        })));

        console.info('============= END : Approve Payment ===========');
        return JSON.stringify(payment);
    }

    // Query a specific project
    async queryProject(ctx, projectId) {
        console.info('============= START : Query Project ===========');
        
        const projectBytes = await ctx.stub.getState(projectId);
        if (!projectBytes || projectBytes.length === 0) {
            throw new Error(`Project ${projectId} does not exist`);
        }
        
        console.info('============= END : Query Project ===========');
        return projectBytes.toString();
    }

    // Query all projects (with pagination support)
    async queryAllProjects(ctx, startKey, endKey, pageSize) {
        console.info('============= START : Query All Projects ===========');
        
        const pageSize_int = parseInt(pageSize) || 10;
        const { iterator, metadata } = await ctx.stub.getStateByRangeWithPagination(startKey || '', endKey || '', pageSize_int);
        
        const allResults = [];
        let result = await iterator.next();
        
        while (!result.done) {
            const strValue = Buffer.from(result.value.value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: result.value.key, Record: record });
            result = await iterator.next();
        }
        
        console.info('============= END : Query All Projects ===========');
        return JSON.stringify({
            projects: allResults,
            metadata: metadata
        });
    }

    // Query work packages for a project
    async queryWorkPackages(ctx, projectId) {
        console.info('============= START : Query Work Packages ===========');
        
        const project = await this._getProject(ctx, projectId);
        
        console.info('============= END : Query Work Packages ===========');
        return JSON.stringify(project.workPackages);
    }

    // Query payments for a project
    async queryPayments(ctx, projectId) {
        console.info('============= START : Query Payments ===========');
        
        const project = await this._getProject(ctx, projectId);
        
        console.info('============= END : Query Payments ===========');
        return JSON.stringify(project.payments);
    }

    // Get project history (all transactions)
    async getProjectHistory(ctx, projectId) {
        console.info('============= START : Get Project History ===========');
        
        const historyIterator = await ctx.stub.getHistoryForKey(projectId);
        const history = [];
        
        let result = await historyIterator.next();
        while (!result.done) {
            const record = {
                txId: result.value.txId,
                timestamp: result.value.timestamp,
                isDelete: result.value.isDelete,
                value: result.value.value.toString('utf8')
            };
            history.push(record);
            result = await historyIterator.next();
        }
        
        console.info('============= END : Get Project History ===========');
        return JSON.stringify(history);
    }

    // Private helper method to get project
    async _getProject(ctx, projectId) {
        const projectBytes = await ctx.stub.getState(projectId);
        if (!projectBytes || projectBytes.length === 0) {
            throw new Error(`Project ${projectId} does not exist`);
        }
        return JSON.parse(projectBytes.toString());
    }
}

module.exports = ProjectContract;
