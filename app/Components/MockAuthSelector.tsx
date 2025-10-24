// app/Components/MockAuthSelector.tsx
'use client';

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/budget-management/mockAuthSelector.css';

const ROLES = [
  { value: 'Finance Admin', label: 'Finance Admin', department: 'finance' },
  { value: 'Finance Staff', label: 'Finance Staff', department: 'finance' },
  { value: 'HR Admin', label: 'HR Admin', department: 'hr' },
  { value: 'HR Staff', label: 'HR Staff', department: 'hr' },
  { value: 'Inventory Admin', label: 'Inventory Admin', department: 'inventory' },
  { value: 'Inventory Staff', label: 'Inventory Staff', department: 'inventory' },
  { value: 'Operations Admin', label: 'Operations Admin', department: 'operations' },
  { value: 'Operations Staff', label: 'Operations Staff', department: 'operations' },
];

export default function MockAuthSelector() {
  const { user, setMockUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleRoleChange = (role: string, department: string) => {
    setMockUser(role, department);
    setIsOpen(false);
  };

  return (
    <div className="mock-auth-selector">
      <div className="mock-auth-badge" onClick={() => setIsOpen(!isOpen)}>
        <i className="ri-shield-user-line"></i>
        <div className="mock-auth-info">
          <span className="mock-auth-label">Mock User</span>
          <span className="mock-auth-role">{user?.role || 'Not Set'}</span>
        </div>
        <i className={`ri-arrow-${isOpen ? 'up' : 'down'}-s-line`}></i>
      </div>

      {isOpen && (
        <div className="mock-auth-dropdown">
          <div className="mock-auth-header">
            <i className="ri-information-line"></i>
            <div>
              <strong>Test Mode Active</strong>
              <p>JWT validation is disabled. Select a role to test different permissions.</p>
            </div>
          </div>
          <div className="mock-auth-roles">
            {ROLES.map((roleOption) => (
              <button
                key={roleOption.value}
                className={`mock-auth-role-btn ${
                  user?.role === roleOption.value ? 'active' : ''
                }`}
                onClick={() => handleRoleChange(roleOption.value, roleOption.department)}
              >
                <div className="role-info">
                  <span className="role-name">{roleOption.label}</span>
                  <span className="role-dept">{roleOption.department}</span>
                </div>
                {user?.role === roleOption.value && (
                  <i className="ri-check-line"></i>
                )}
              </button>
            ))}
          </div>
          <div className="mock-auth-footer">
            <i className="ri-error-warning-line"></i>
            <span>Set JWT_DISABLED=false in .env for production</span>
          </div>
        </div>
      )}
    </div>
  );
}
