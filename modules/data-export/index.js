// modules/data-export/index.js
// Public API for data-export module

const service = require('./service');

module.exports = {
  exportAllData: service.exportAllData,
  validateBackup: service.validateBackup,
  importData: service.importData,
  saveToFolder: service.saveToFolder
};
