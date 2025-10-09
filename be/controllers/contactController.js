const CustomerContact = require('../models/CustomerContact');
const { formatResponse, formatErrorResponse } = require('../utils/helpers');

const listMyContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const contacts = await CustomerContact.findByUser(userId);
    res.json(
      formatResponse(true, contacts, 'Lấy danh sách liên hệ thành công')
    );
  } catch (err) {
    console.error('List contacts error:', err);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

const createContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone, email, address, note, is_default } = req.body;
    const contact = await CustomerContact.create({
      user_id: userId,
      full_name,
      phone,
      email,
      address,
      note,
      is_default: !!is_default,
    });
    res
      .status(201)
      .json(formatResponse(true, contact, 'Tạo liên hệ thành công'));
  } catch (err) {
    console.error('Create contact error:', err);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

const updateContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const existing = await CustomerContact.findById(id);
    if (!existing || existing.user_id !== userId)
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy liên hệ'));
    const updated = await CustomerContact.update(id, req.body);
    res.json(formatResponse(true, updated, 'Cập nhật liên hệ thành công'));
  } catch (err) {
    console.error('Update contact error:', err);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

const deleteContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const existing = await CustomerContact.findById(id);
    if (!existing || existing.user_id !== userId)
      return res
        .status(404)
        .json(formatErrorResponse('Không tìm thấy liên hệ'));
    await CustomerContact.delete(id);
    res.json(formatResponse(true, null, 'Xóa liên hệ thành công'));
  } catch (err) {
    console.error('Delete contact error:', err);
    res.status(500).json(formatErrorResponse('Lỗi server'));
  }
};

module.exports = {
  listMyContacts,
  createContact,
  updateContact,
  deleteContact,
};
