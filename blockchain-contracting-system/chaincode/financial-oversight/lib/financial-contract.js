'use strict';

const { Contract } = require('fabric-contract-api');

class FinancialContract extends Contract {

    // Initialize ledger
    async initLedger(ctx) {
        console.info('============= START : Initialize Financial Oversight Ledger ===========');
        console.info('============= END : Initialize Financial Oversight Ledger ===========');
    }

    // Record payment transaction
    async recordPayment(ctx, paymentId, projectId, fromOrg, toOrg, amount, purpose, referenceId) {
        console.info('============= START : Record Payment ===========');

        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'EmployerMSP') {
            throw new Error('Access denied: Only Employer can record payments');
        }

        const payment = {
            paymentId,
            projectId,
            fromOrg,
            toOrg,
            amount: parseInt(amount),
            purpose,
            referenceId, // Links to workPackageId or orderId
            status: 'RECORDED',
            recordedAt: new Date().toISOString(),
            recordedBy: ctx.clientIdentity.getID(),
            audits: [],
            approvals: []
        };

        await ctx.stub.putState(paymentId, Buffer.from(JSON.stringify(payment)));
        
        ctx.stub.setEvent('PaymentRecorded', Buffer.from(JSON.stringify({
            paymentId, projectId, amount, toOrg,
            timestamp: payment.recordedAt
        })));

        console.info('============= END : Record Payment ===========');
        return JSON.stringify(payment);
    }

    // Audit payment by Ministry of Railways
    async auditPayment(ctx, paymentId, auditStatus, findings, recommendations) {
        console.info('============= START : Audit Payment ===========');

        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'MoRMSP') {
            throw new Error('Access denied: Only Ministry of Railways can audit');
        }

        const payment = await this._getPayment(ctx, paymentId);

        const audit = {
            auditId: `AUD_${paymentId}_${Date.now()}`,
            auditStatus, // 'COMPLIANT', 'NON_COMPLIANT', 'REQUIRES_REVIEW'
            findings,
            recommendations,
            auditedAt: new Date().toISOString(),
            auditedBy: ctx.clientIdentity.getID()
        };

        payment.audits.push(audit);
        payment.auditStatus = auditStatus;

        await ctx.stub.putState(paymentId, Buffer.from(JSON.stringify(payment)));

        ctx.stub.setEvent('PaymentAudited', Buffer.from(JSON.stringify({
            paymentId, auditStatus,
            timestamp: audit.auditedAt
        })));

        console.info('============= END : Audit Payment ===========');
        return JSON.stringify(audit);
    }

    // Financial consortium review
    async consortiumReview(ctx, paymentId, reviewStatus, comments) {
        console.info('============= START : Consortium Review ===========');

        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'FinConsortiaMSP') {
            throw new Error('Access denied: Only Financial Consortium can review');
        }

        const payment = await this._getPayment(ctx, paymentId);

        const review = {
            reviewId: `REV_${paymentId}_${Date.now()}`,
            reviewStatus, // 'APPROVED', 'REJECTED', 'CONDITIONAL'
            comments,
            reviewedAt: new Date().toISOString(),
            reviewedBy: ctx.clientIdentity.getID()
        };

        payment.approvals.push(review);
        payment.consortiumStatus = reviewStatus;

        await ctx.stub.putState(paymentId, Buffer.from(JSON.stringify(payment)));

        ctx.stub.setEvent('ConsortiumReviewed', Buffer.from(JSON.stringify({
            paymentId, reviewStatus,
            timestamp: review.reviewedAt
        })));

        console.info('============= END : Consortium Review ===========');
        return JSON.stringify(review);
    }

    // Record budget allocation
    async recordBudgetAllocation(ctx, allocationId, projectId, fiscalYear, allocatedAmount, source) {
        console.info('============= START : Record Budget Allocation ===========');

        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'EmployerMSP') {
            throw new Error('Access denied: Only Employer can record budget allocations');
        }

        const allocation = {
            allocationId,
            projectId,
            fiscalYear,
            allocatedAmount: parseInt(allocatedAmount),
            source, // 'GOVERNMENT', 'CONSORTIUM', 'MIXED'
            allocatedAt: new Date().toISOString(),
            allocatedBy: ctx.clientIdentity.getID(),
            utilized: 0,
            remaining: parseInt(allocatedAmount)
        };

        await ctx.stub.putState(allocationId, Buffer.from(JSON.stringify(allocation)));
        
        ctx.stub.setEvent('BudgetAllocated', Buffer.from(JSON.stringify({
            allocationId, projectId, allocatedAmount,
            timestamp: allocation.allocatedAt
        })));

        console.info('============= END : Record Budget Allocation ===========');
        return JSON.stringify(allocation);
    }

    // Update fund utilization
    async updateFundUtilization(ctx, allocationId, utilizedAmount) {
        console.info('============= START : Update Fund Utilization ===========');

        const allocation = await this._getAllocation(ctx, allocationId);
        
        allocation.utilized = (allocation.utilized || 0) + parseInt(utilizedAmount);
        allocation.remaining = allocation.allocatedAmount - allocation.utilized;
        allocation.lastUpdated = new Date().toISOString();

        await ctx.stub.putState(allocationId, Buffer.from(JSON.stringify(allocation)));

        console.info('============= END : Update Fund Utilization ===========');
        return JSON.stringify(allocation);
    }

    // Query payment
    async queryPayment(ctx, paymentId) {
        console.info('============= START : Query Payment ===========');
        
        const paymentBytes = await ctx.stub.getState(paymentId);
        if (!paymentBytes || paymentBytes.length === 0) {
            throw new Error(`Payment ${paymentId} does not exist`);
        }
        
        console.info('============= END : Query Payment ===========');
        return paymentBytes.toString();
    }

    // Query payments by project
    async queryPaymentsByProject(ctx, projectId) {
        console.info('============= START : Query Payments By Project ===========');
        
        const queryString = {
            selector: {
                projectId: projectId
            }
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const payments = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value).toString('utf8');
            payments.push(JSON.parse(strValue));
            result = await iterator.next();
        }
        
        console.info('============= END : Query Payments By Project ===========');
        return JSON.stringify(payments);
    }

    // Query budget allocations by project
    async queryBudgetByProject(ctx, projectId) {
        console.info('============= START : Query Budget By Project ===========');
        
        const queryString = {
            selector: {
                projectId: projectId
            }
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const allocations = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value).toString('utf8');
            allocations.push(JSON.parse(strValue));
            result = await iterator.next();
        }
        
        console.info('============= END : Query Budget By Project ===========');
        return JSON.stringify(allocations);
    }

    // Get payment history (transaction trail)
    async getPaymentHistory(ctx, paymentId) {
        console.info('============= START : Get Payment History ===========');
        
        const historyIterator = await ctx.stub.getHistoryForKey(paymentId);
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
        
        console.info('============= END : Get Payment History ===========');
        return JSON.stringify(history);
    }

    // Get financial history for a project (all payments + audits + budgets)
    async getFinancialHistory(ctx, projectId) {
        console.info('============= START : Get Financial History ===========');
        
        const payments = JSON.parse(await this.queryPaymentsByProject(ctx, projectId));
        const allocations = JSON.parse(await this.queryBudgetByProject(ctx, projectId));
        const completeHistory = [];

        // Get history for all payments
        for (const payment of payments) {
            const paymentHistory = JSON.parse(await this.getPaymentHistory(ctx, payment.paymentId));
            completeHistory.push({
                type: 'PAYMENT',
                id: payment.paymentId,
                history: paymentHistory
            });
        }

        // Get history for budget allocations
        for (const allocation of allocations) {
            const allocationHistory = JSON.parse(await this.getPaymentHistory(ctx, allocation.allocationId));
            completeHistory.push({
                type: 'BUDGET',
                id: allocation.allocationId,
                history: allocationHistory
            });
        }
        
        console.info('============= END : Get Financial History ===========');
        return JSON.stringify(completeHistory);
    }

    // Private helper methods
    async _getPayment(ctx, paymentId) {
        const paymentBytes = await ctx.stub.getState(paymentId);
        if (!paymentBytes || paymentBytes.length === 0) {
            throw new Error(`Payment ${paymentId} does not exist`);
        }
        return JSON.parse(paymentBytes.toString());
    }

    async _getAllocation(ctx, allocationId) {
        const allocationBytes = await ctx.stub.getState(allocationId);
        if (!allocationBytes || allocationBytes.length === 0) {
            throw new Error(`Allocation ${allocationId} does not exist`);
        }
        return JSON.parse(allocationBytes.toString());
    }
}

module.exports = FinancialContract;
