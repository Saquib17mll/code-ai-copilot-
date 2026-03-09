import React, { useState, useEffect, useCallback } from 'react';
import EmployeeTable from './components/EmployeeTable';
import EmployeeForm from './components/EmployeeForm';
import DepartmentFilter from './components/DepartmentFilter';
import PomodoroTimer from './components/PomodoroTimer';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from './api/employeeApi';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const all = await getEmployees();
      setAllEmployees(all);
      if (selectedDepartment) {
        setEmployees(all.filter((e) => e.department === selectedDepartment));
      } else {
        setEmployees(all);
      }
    } catch (err) {
      setError('Failed to load employees. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleDepartmentChange = (dept) => {
    setSelectedDepartment(dept);
    if (dept) {
      setEmployees(allEmployees.filter((e) => e.department === dept));
    } else {
      setEmployees(allEmployees);
    }
  };

  const handleAdd = () => {
    setEditingEmployee(null);
    setShowForm(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await deleteEmployee(id);
      await fetchEmployees();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (formData) => {
    if (editingEmployee) {
      await updateEmployee(editingEmployee.id, formData);
    } else {
      await createEmployee(formData);
    }
    setShowForm(false);
    setEditingEmployee(null);
    await fetchEmployees();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Employee Management System</h1>
        <nav className="app-nav">
          <button
            className={`nav-tab${activeTab === 'employees' ? ' active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            Employees
          </button>
          <button
            className={`nav-tab${activeTab === 'pomodoro' ? ' active' : ''}`}
            onClick={() => setActiveTab('pomodoro')}
          >
            Pomodoro
          </button>
        </nav>
      </header>
      <main className="app-main">
        {activeTab === 'employees' && (
          <>
            {error && <div className="alert-error">{error}</div>}
            <div className="toolbar">
              <DepartmentFilter
                employees={allEmployees}
                selectedDepartment={selectedDepartment}
                onChange={handleDepartmentChange}
              />
              <button className="btn-primary" onClick={handleAdd}>+ Add Employee</button>
            </div>
            {loading ? (
              <p className="loading">Loading employees...</p>
            ) : (
              <EmployeeTable employees={employees} onEdit={handleEdit} onDelete={handleDelete} />
            )}
          </>
        )}
        {activeTab === 'pomodoro' && <PomodoroTimer />}
      </main>
      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

export default App;
