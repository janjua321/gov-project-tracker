'use strict';

const { Contract } = require('fabric-contract-api');
const ProjectContract = require('./lib/project-contract');

module.exports.ProjectContract = ProjectContract;
module.exports.contracts = [ProjectContract];
