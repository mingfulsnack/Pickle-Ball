import React, { useEffect, useState } from 'react';
import './Contacts.scss';
import { contactsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const emptyContact = {
  full_name: '',
  phone: '',
  email: '',
  is_default: false,
};

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyContact);
  const { user } = useAuth();

  // currently selected contact id/object
  const [selectedContact, setSelectedContact] = useState(() => {
    // First check localStorage for previously selected contact
    try {
      const storageKey = `selectedContact_${user?.id || 'unknown'}`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore localStorage errors
    }

    // Default to user's own information if no previous selection
    if (user) {
      return {
        full_name: user.full_name || user.username,
        phone: user.phone,
        email: user.email,
      };
    }
    return null;
  });

  const load = async () => {
    try {
      const res = await contactsAPI.list();
      // API uses formatResponse -> payload is in res.data.data
      setContacts((res.data && res.data.data) || []);
    } catch (err) {
      console.error('Failed to load contacts', err);
      toast.error('Không tải được danh bạ liên hệ');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleEdit = (c) => {
    setEditing(c.id);
    setForm({ ...c });
  };

  const handleNew = () => {
    setEditing('new');
    setForm(emptyContact);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa liên hệ này?')) return;
    try {
      await contactsAPI.remove(id);
      toast.success('Đã xóa');
      load();
    } catch (err) {
      console.error(err);
      toast.error('Xóa thất bại');
    }
  };

  const handleSave = async () => {
    try {
      // Only send allowed fields to backend
      const payload = {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        address: form.address || null,
        note: form.note || null,
        is_default: !!form.is_default,
      };
      if (editing === 'new') {
        await contactsAPI.create(payload);
        toast.success('Đã tạo liên hệ');
      } else {
        await contactsAPI.update(editing, payload);
        toast.success('Đã cập nhật');
      }
      setEditing(null);
      load();
    } catch (err) {
      console.error(err);
      toast.error('Lưu thất bại');
    }
  };

  const handleSelectForBooking = (c) => {
    // mark as selected and save to localStorage
    setSelectedContact(c);
    try {
      const storageKey = `selectedContact_${user?.id || 'unknown'}`;
      localStorage.setItem(storageKey, JSON.stringify(c));
    } catch (e) {
      console.warn('Failed to persist selectedContact', e);
    }
    toast.success('Đã chọn thông tin liên hệ');
  };

  return (
    <div className="contacts-page container">
      <div className="contacts-header">
        <h2>Danh sách liên hệ</h2>
        <div>
          <button className="btn btn-primary" onClick={handleNew}>
            Thêm liên hệ
          </button>
        </div>
      </div>

      <div className="contacts-list">
        {/* Include the logged-in user's own info as the first selectable option */}
        {user && (
          <div
            className={`contact-card user-card ${
              selectedContact &&
              !selectedContact.id &&
              selectedContact?.phone === user.phone
                ? 'selected'
                : ''
            }`}
            key={`user-${user.id}`}
          >
            <div className="contact-main">
              <div className="contact-name">
                {user.full_name || user.username}
              </div>
              <div className="contact-phone">{user.phone}</div>
              <div className="contact-email">{user.email}</div>
            </div>
            <div className="contact-actions">
              <label className="select-label">
                <input
                  type="radio"
                  checked={
                    selectedContact &&
                    !selectedContact.id &&
                    selectedContact.phone === user.phone
                  }
                  onChange={() =>
                    handleSelectForBooking({
                      full_name: user.full_name || user.username,
                      phone: user.phone,
                      email: user.email,
                    })
                  }
                />{' '}
                Chọn
              </label>
            </div>
          </div>
        )}

        {(!Array.isArray(contacts) || contacts.length === 0) && (
          <div className="empty">Bạn chưa có liên hệ nào</div>
        )}

        {Array.isArray(contacts) &&
          contacts.map((c) => (
            <div
              className={`contact-card ${
                selectedContact && selectedContact.id === c.id ? 'selected' : ''
              }`}
              key={c.id}
            >
              <div className="contact-main">
                <div className="contact-name">{c.full_name}</div>
                <div className="contact-phone">{c.phone}</div>
                <div className="contact-email">{c.email}</div>
              </div>
              <div className="contact-actions">
                <label className="select-label">
                  <input
                    type="radio"
                    checked={selectedContact && selectedContact.id === c.id}
                    onChange={() => handleSelectForBooking(c)}
                  />{' '}
                  Chọn
                </label>
                <button className="btn" onClick={() => handleEdit(c)}>
                  Sửa
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(c.id)}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
      </div>

      {editing && (
        <div className="contact-editor">
          <h3>{editing === 'new' ? 'Tạo liên hệ mới' : 'Sửa liên hệ'}</h3>
          <div className="form-row">
            <label>Họ và tên</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Số điện thoại</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          {/* CCCD and DOB removed per UX request */}
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleSave}>
              Lưu
            </button>
            <button className="btn" onClick={() => setEditing(null)}>
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
