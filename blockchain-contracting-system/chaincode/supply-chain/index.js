'use strict';

const { Contract } = require('fabric-contract-api');
const SupplyChainContract = require('./lib/supply-chain-contract');

module.exports.SupplyChainContract = SupplyChainContract;
module.exports.contracts = [SupplyChainContract];
