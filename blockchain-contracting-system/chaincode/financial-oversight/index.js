'use strict';

const { Contract } = require('fabric-contract-api');
const FinancialContract = require('./lib/financial-contract');

module.exports.FinancialContract = FinancialContract;
module.exports.contracts = [FinancialContract];
