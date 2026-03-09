const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all employees (optionally filter by department)
router.get('/', (req, res) => {
  try {
    const { department } = req.query;
    let employees;
    if (department) {
      employees = db.prepare('SELECT * FROM employees WHERE department = ?').all(department);
    } else {
      employees = db.prepare('SELECT * FROM employees').all();
    }
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single employee
router.get('/:id', (req, res) => {
  try {
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create employee
router.post('/', (req, res) => {
  try {
    const { name, email, department, role, hire_date } = req.body;
    if (!name || !email || !department || !role || !hire_date) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const stmt = db.prepare('INSERT INTO employees (name, email, department, role, hire_date) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(name, email, department, role, hire_date);
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(employee);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update employee
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });
    const { name, email, department, role, hire_date } = req.body;
    if (!name || !email || !department || !role || !hire_date) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    db.prepare('UPDATE employees SET name=?, email=?, department=?, role=?, hire_date=? WHERE id=?')
      .run(name, email, department, role, hire_date, req.params.id);
    const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE employee
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });
    db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
