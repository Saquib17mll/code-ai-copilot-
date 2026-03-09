import React from 'react';

function DepartmentFilter({ employees, selectedDepartment, onChange }) {
  const departments = [...new Set(employees.map((e) => e.department))].sort();

  return (
    <div className="filter-container">
      <label htmlFor="dept-filter">Filter by Department:</label>
      <select
        id="dept-filter"
        value={selectedDepartment}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All Departments</option>
        {departments.map((dept) => (
          <option key={dept} value={dept}>
            {dept}
          </option>
        ))}
      </select>
    </div>
  );
}

export default DepartmentFilter;
