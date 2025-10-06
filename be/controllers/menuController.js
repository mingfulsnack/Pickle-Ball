const { formatResponse, formatErrorResponse } = require('../utils/helpers');

// Placeholder for menu controller
const getPublicMenu = async (req, res) => {
  try {
    res.json(formatResponse(true, [], 'Menu endpoint - not implemented for court booking system'));
  } catch (error) {
    console.error('Get public menu error:', error);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

module.exports = {
  getPublicMenu
};