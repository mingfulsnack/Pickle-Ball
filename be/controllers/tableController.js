const { formatResponse, formatErrorResponse } = require('../utils/helpers');

// Placeholder controller for legacy table system
const getTables = async (req, res) => {
  try {
    res.json(formatResponse(true, [], 'Tables endpoint - legacy restaurant system not implemented'));
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

const getAvailableTablesAtTime = async (req, res) => {
  try {
    res.json(formatResponse(true, [], 'Available tables endpoint - legacy restaurant system not implemented'));
  } catch (error) {
    console.error('Get available tables error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

const getAreas = async (req, res) => {
  try {
    res.json(formatResponse(true, [], 'Areas endpoint - legacy restaurant system not implemented'));
  } catch (error) {
    console.error('Get areas error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

module.exports = {
  getTables,
  getAvailableTablesAtTime,
  getAreas
};