import React, { useState, useEffect } from 'react';

const EMPTY_FORM = { name: '', email: '', department: '', role: '', hire_date: '' };

function EmployeeForm({ employee, onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(employee ? { ...employee } : EMPTY_FORM);
    setError('');
  }, [employee]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, department, role, hire_date } = form;
    if (!name || !email || !department || !role || !hire_date) {
      setError('All fields are required.');
      return;
    }
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{employee ? 'Edit Employee' : 'Add Employee'}</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>Name</label>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Full name" />
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@company.com" />
          <label>Department</label>
          <input name="department" value={form.department} onChange={handleChange} placeholder="e.g. Engineering" />
          <label>Role</label>
          <input name="role" value={form.role} onChange={handleChange} placeholder="e.g. Software Engineer" />
          <label>Hire Date</label>
          <input name="hire_date" type="date" value={form.hire_date} onChange={handleChange} />
          <div className="form-actions">
            <button type="submit" className="btn-primary">{employee ? 'Update' : 'Add'}</button>
            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeForm;
