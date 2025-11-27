'use strict';

const { Contract } = require('fabric-contract-api');

class SupplyChainContract extends Contract {

    // Initialize ledger
    async initLedger(ctx) {
        console.info('============= START : Initialize Supply Chain Ledger ===========');
        console.info('============= END : Initialize Supply Chain Ledger ===========');
    }

    // Create subcontract order
    async createOrder(ctx, orderId, projectId, contractorId, subcontractorId, description, amount) {
        console.info('============= START : Create Order ===========');

        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'ContractorMSP') {
            throw new Error('Access denied: Only Contractor can create orders');
        }

        const order = {
            orderId,
            projectId,
            contractorId,
            subcontractorId,
            description,
            amount: parseInt(amount),
            status: 'CREATED',
            createdAt: new Date().toISOString(),
            createdBy: ctx.clientIdentity.getID(),
            shipments: [],
            progressUpdates: []
        };

        await ctx.stub.putState(orderId, Buffer.from(JSON.stringify(order)));
        
        ctx.stub.setEvent('OrderCreated', Buffer.from(JSON.stringify({
            orderId, projectId, contractorId, subcontractorId,
            timestamp: order.createdAt
        })));

        console.info('============= END : Create Order ===========');
        return JSON.stringify(order);
    }

    // Accept order by subcontractor
    async acceptOrder(ctx, orderId) {
        console.info('============= START : Accept Order ===========');

        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'SubContractorMSP') {
            throw new Error('Access denied: Only SubContractor can accept orders');
        }

        const order = await this._getOrder(ctx, orderId);
        
        if (order.status !== 'CREATED') {
            throw new Error(`Order ${orderId} cannot be accepted in ${order.status} status`);
        }

        order.status = 'ACCEPTED';
        order.acceptedAt = new Date().toISOString();
        order.acceptedBy = ctx.clientIdentity.getID();

        await ctx.stub.putState(orderId, Buffer.from(JSON.stringify(order)));
        
        ctx.stub.setEvent('OrderAccepted', Buffer.from(JSON.stringify({
            orderId, timestamp: order.acceptedAt
        })));

        console.info('============= END : Accept Order ===========');
        return JSON.stringify(order);
    }

    // Record material shipment
    async recordShipment(ctx, orderId, shipmentId, supplierId, items, cost, trackingInfo) {
        console.info('============= START : Record Shipment ===========');

        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'SupplierMSP') {
            throw new Error('Access denied: Only Supplier can record shipments');
        }

        const order = await this._getOrder(ctx, orderId);

        const shipment = {
            shipmentId,
            supplierId,
            items,
            cost: parseInt(cost),
            trackingInfo,
            shippedAt: new Date().toISOString(),
            shippedBy: ctx.clientIdentity.getID(),
            status: 'SHIPPED'
        };

        order.shipments.push(shipment);
        await ctx.stub.putState(orderId, Buffer.from(JSON.stringify(order)));

        ctx.stub.setEvent('ShipmentRecorded', Buffer.from(JSON.stringify({
            orderId, shipmentId, supplierId, cost,
            timestamp: shipment.shippedAt
        })));

        console.info('============= END : Record Shipment ===========');
        return JSON.stringify(shipment);
    }

    // Update progress by subcontractor
    async updateProgress(ctx, orderId, progressPercent, materialsUsed, laborCost, remarks) {
        console.info('============= START : Update Progress ===========');

        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'SubContractorMSP') {
            throw new Error('Access denied: Only SubContractor can update progress');
        }

        const order = await this._getOrder(ctx, orderId);

        const progressUpdate = {
            updateId: `UPD_${orderId}_${Date.now()}`,
            progressPercent: parseInt(progressPercent),
            materialsUsed: parseInt(materialsUsed),
            laborCost: parseInt(laborCost),
            remarks,
            updatedAt: new Date().toISOString(),
            updatedBy: ctx.clientIdentity.getID()
        };

        order.progressUpdates.push(progressUpdate);
        order.currentProgress = parseInt(progressPercent);
        order.totalSpent = (order.totalSpent || 0) + parseInt(materialsUsed) + parseInt(laborCost);

        await ctx.stub.putState(orderId, Buffer.from(JSON.stringify(order)));

        ctx.stub.setEvent('ProgressUpdated', Buffer.from(JSON.stringify({
            orderId, progressPercent, totalSpent: order.totalSpent,
            timestamp: progressUpdate.updatedAt
        })));

        console.info('============= END : Update Progress ===========');
        return JSON.stringify(progressUpdate);
    }

    // Add design specification
    async addDesignSpec(ctx, orderId, specId, description, ipfsHash) {
        console.info('============= START : Add Design Spec ===========');

        const mspId = ctx.clientIdentity.getMSPID();
        if (mspId !== 'DesignerMSP') {
            throw new Error('Access denied: Only Designer can add specifications');
        }

        const order = await this._getOrder(ctx, orderId);

        if (!order.designSpecs) {
            order.designSpecs = [];
        }

        const designSpec = {
            specId,
            description,
            ipfsHash,
            addedAt: new Date().toISOString(),
            addedBy: ctx.clientIdentity.getID()
        };

        order.designSpecs.push(designSpec);
        await ctx.stub.putState(orderId, Buffer.from(JSON.stringify(order)));

        ctx.stub.setEvent('DesignSpecAdded', Buffer.from(JSON.stringify({
            orderId, specId, timestamp: designSpec.addedAt
        })));

        console.info('============= END : Add Design Spec ===========');
        return JSON.stringify(designSpec);
    }

    // Query order
    async queryOrder(ctx, orderId) {
        console.info('============= START : Query Order ===========');
        
        const orderBytes = await ctx.stub.getState(orderId);
        if (!orderBytes || orderBytes.length === 0) {
            throw new Error(`Order ${orderId} does not exist`);
        }
        
        console.info('============= END : Query Order ===========');
        return orderBytes.toString();
    }

    // Query orders by project
    async queryOrdersByProject(ctx, projectId) {
        console.info('============= START : Query Orders By Project ===========');
        
        const queryString = {
            selector: {
                projectId: projectId
            }
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const orders = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value).toString('utf8');
            orders.push(JSON.parse(strValue));
            result = await iterator.next();
        }
        
        console.info('============= END : Query Orders By Project ===========');
        return JSON.stringify(orders);
    }

    // Get order history (transaction trail)
    async getOrderHistory(ctx, orderId) {
        console.info('============= START : Get Order History ===========');
        
        const historyIterator = await ctx.stub.getHistoryForKey(orderId);
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
        
        console.info('============= END : Get Order History ===========');
        return JSON.stringify(history);
    }

    // Get supply history for a project (all orders + shipments + progress)
    async getSupplyHistory(ctx, projectId) {
        console.info('============= START : Get Supply History ===========');
        
        const orders = JSON.parse(await this.queryOrdersByProject(ctx, projectId));
        const completeHistory = [];

        for (const order of orders) {
            const orderHistory = JSON.parse(await this.getOrderHistory(ctx, order.orderId));
            completeHistory.push({
                orderId: order.orderId,
                history: orderHistory
            });
        }
        
        console.info('============= END : Get Supply History ===========');
        return JSON.stringify(completeHistory);
    }

    // Private helper method
    async _getOrder(ctx, orderId) {
        const orderBytes = await ctx.stub.getState(orderId);
        if (!orderBytes || orderBytes.length === 0) {
            throw new Error(`Order ${orderId} does not exist`);
        }
        return JSON.parse(orderBytes.toString());
    }
}

module.exports = SupplyChainContract;
