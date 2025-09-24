'use client';

import React, { useState } from 'react';
import "../../../styles/budget-management/autoApproveRequest.css";
import ModalHeader from '../../../Components/ModalHeader';
import { showSuccess, showError } from '../../../utility/Alerts';

// Types
interface DepartmentAutoApproval {
  department: string;
  isEnabled: boolean;
  approvalType: 'amount' | 'percentage';
  maxAmount: number;
  maxPercentage: number;
  departmentBudget?: number; // Optional for percentage calculation display
}

interface AutoApproveRequestProps {
  onClose: () => void;
  onSave: (settings: DepartmentAutoApproval[]) => void;
}

const AutoApproveRequest: React.FC<AutoApproveRequestProps> = ({ onClose, onSave }) => {
  const [departments, setDepartments] = useState<DepartmentAutoApproval[]>([
    {
      department: 'Finance',
      isEnabled: false,
      approvalType: 'amount',
      maxAmount: 50000,
      maxPercentage: 10,
      departmentBudget: 1000000
    },
    {
      department: 'Inventory',
      isEnabled: true,
      approvalType: 'percentage',
      maxAmount: 25000,
      maxPercentage: 15,
      departmentBudget: 500000
    },
    {
      department: 'Human Resource',
      isEnabled: false,
      approvalType: 'amount',
      maxAmount: 30000,
      maxPercentage: 12,
      departmentBudget: 800000
    },
    {
      department: 'Operations',
      isEnabled: true,
      approvalType: 'amount',
      maxAmount: 100000,
      maxPercentage: 20,
      departmentBudget: 2000000
    }
  ]);

  const [hasChanges, setHasChanges] = useState(false);

  // Handle department enable/disable toggle
  const handleToggleEnabled = (index: number) => {
    const updated = [...departments];
    updated[index].isEnabled = !updated[index].isEnabled;
    setDepartments(updated);
    setHasChanges(true);
  };

  // Handle approval type toggle (amount vs percentage)
  const handleToggleApprovalType = (index: number) => {
    const updated = [...departments];
    updated[index].approvalType = updated[index].approvalType === 'amount' ? 'percentage' : 'amount';
    setDepartments(updated);
    setHasChanges(true);
  };

  // Handle max amount change
  const handleAmountChange = (index: number, value: string) => {
    const updated = [...departments];
    const numValue = parseFloat(value) || 0;
    updated[index].maxAmount = numValue;
    setDepartments(updated);
    setHasChanges(true);
  };

  // Handle percentage change
  const handlePercentageChange = (index: number, value: string) => {
    const updated = [...departments];
    const numValue = parseFloat(value) || 0;
    // Limit percentage to 100%
    updated[index].maxPercentage = Math.min(Math.max(numValue, 0), 100);
    setDepartments(updated);
    setHasChanges(true);
  };

  // Calculate percentage amount for display
  const getPercentageAmount = (dept: DepartmentAutoApproval) => {
    if (dept.departmentBudget) {
      return (dept.departmentBudget * dept.maxPercentage) / 100;
    }
    return 0;
  };

  // Handle save
  const handleSave = async () => {
    try {
      // Validate settings
      const errors: string[] = [];
      departments.forEach((dept) => {
        if (dept.isEnabled) {
          if (dept.approvalType === 'amount' && dept.maxAmount <= 0) {
            errors.push(`${dept.department}: Amount must be greater than ₱0`);
          }
          if (dept.approvalType === 'percentage' && (dept.maxPercentage <= 0 || dept.maxPercentage > 100)) {
            errors.push(`${dept.department}: Percentage must be between 1% and 100%`);
          }
        }
      });

      if (errors.length > 0) {
        showError(errors.join('\n'), 'Validation Error');
        return;
      }

      // Save settings (implement API call here)
      onSave(departments);
      showSuccess('Auto-approval settings saved successfully', 'Settings Saved');
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Failed to save auto-approval settings', 'Error');
    }
  };

  // Handle reset to defaults
  const handleReset = () => {
    const defaultSettings = departments.map(dept => ({
      ...dept,
      isEnabled: false,
      approvalType: 'amount' as const,
      maxAmount: 25000,
      maxPercentage: 10
    }));
    setDepartments(defaultSettings);
    setHasChanges(true);
  };

  return (
    <div className="modalOverlay">
      <div className="autoApproveRequestModal">
        <ModalHeader 
          title="Auto-Approval Configuration"
          onClose={onClose}
        />
        
        <div className="modalContent">
          <div className="configIntro">
            <p>Configure automatic approval settings for budget requests by department. 
               Requests within the set limits will be automatically approved without manual review.</p>
          </div>

          <div className="departmentConfigSection">
            <div className="sectionHeader">
              <h3>Department Auto-Approval Settings</h3>
              <div className="globalActions">
                <button className="resetBtn" onClick={handleReset}>
                  <i className="ri-refresh-line" /> Reset All
                </button>
              </div>
            </div>

            {departments.map((dept, index) => (
              <div key={dept.department} className="departmentConfigCard">
                <div className="departmentHeader">
                  <div className="departmentInfo">
                    <h4>{dept.department} Department</h4>
                    {dept.departmentBudget && (
                      <span className="departmentBudget">
                        Total Budget: ₱{dept.departmentBudget.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="departmentToggle">
                    <label className="toggleSwitch">
                      <input
                        type="checkbox"
                        checked={dept.isEnabled}
                        onChange={() => handleToggleEnabled(index)}
                      />
                      <span className="toggleSlider">
                        <span className="toggleLabel">
                          {dept.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                {dept.isEnabled && (
                  <div className="departmentSettings">
                    <div className="approvalTypeSection">
                      <div className="displayField">
                        <label>Approval Type</label>
                        <div className="approvalTypeToggle">
                          <button
                            className={`typeBtn ${dept.approvalType === 'amount' ? 'active' : ''}`}
                            onClick={() => handleToggleApprovalType(index)}
                          >
                            <i className="ri-money-dollar-circle-line" />
                            Fixed Amount
                          </button>
                          <button
                            className={`typeBtn ${dept.approvalType === 'percentage' ? 'active' : ''}`}
                            onClick={() => handleToggleApprovalType(index)}
                          >
                            <i className="ri-percent-line" />
                            Percentage
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="displayRow">
                      {dept.approvalType === 'amount' ? (
                        <div className="displayField">
                          <label>Maximum Auto-Approval Amount</label>
                          <div className="amountInputWrapper">
                            <span className="currencySymbol">₱</span>
                            <input
                              type="number"
                              className="displayValue amountInput"
                              value={dept.maxAmount}
                              onChange={(e) => handleAmountChange(index, e.target.value)}
                              min="0"
                              step="1000"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="autoFillNote">
                            Requests up to ₱{dept.maxAmount.toLocaleString()} will be auto-approved
                          </div>
                        </div>
                      ) : (
                        <div className="displayField">
                          <label>Maximum Auto-Approval Percentage</label>
                          <div className="percentageInputWrapper">
                            <input
                              type="number"
                              className="displayValue percentageInput"
                              value={dept.maxPercentage}
                              onChange={(e) => handlePercentageChange(index, e.target.value)}
                              min="0"
                              max="100"
                              step="0.5"
                              placeholder="0"
                            />
                            <span className="percentSymbol">%</span>
                          </div>
                          <div className="autoFillNote">
                            {dept.departmentBudget && (
                              <>
                                {dept.maxPercentage}% of ₱{dept.departmentBudget.toLocaleString()} = 
                                ₱{getPercentageAmount(dept).toLocaleString()}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="displayField">
                        <label>Current Status</label>
                        <div className={`statusIndicator ${dept.isEnabled ? 'enabled' : 'disabled'}`}>
                          <i className={`ri-${dept.isEnabled ? 'check' : 'close'}-circle-line`} />
                          <span>
                            {dept.isEnabled ? 'Auto-approval Active' : 'Manual approval only'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {dept.isEnabled && (
                      <div className="previewSection">
                        <div className="previewLabel">
                          <i className="ri-information-line" />
                          Auto-Approval Preview
                        </div>
                        <div className="previewContent">
                          Budget requests from <strong>{dept.department}</strong> up to{' '}
                          <strong>
                            {dept.approvalType === 'amount' 
                              ? `₱${dept.maxAmount.toLocaleString()}`
                              : `${dept.maxPercentage}% (₱${getPercentageAmount(dept).toLocaleString()})`
                            }
                          </strong>{' '}
                          will be automatically approved.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="summarySection">
            <div className="sectionHeader">
              <h3>Configuration Summary</h3>
            </div>
            <div className="summaryGrid">
              {departments.filter(d => d.isEnabled).map(dept => (
                <div key={dept.department} className="summaryCard">
                  <div className="summaryDept">{dept.department}</div>
                  <div className="summaryLimit">
                    {dept.approvalType === 'amount' 
                      ? `₱${dept.maxAmount.toLocaleString()}`
                      : `${dept.maxPercentage}% (₱${getPercentageAmount(dept).toLocaleString()})`
                    }
                  </div>
                </div>
              ))}
              {departments.filter(d => d.isEnabled).length === 0 && (
                <div className="noAutoApproval">
                  <i className="ri-information-line" />
                  No departments have auto-approval enabled
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modalButtons">
          <button className="cancelBtn" onClick={onClose}>
            <i className="ri-close-line" /> Cancel
          </button>
          <button 
            className={`saveBtn ${hasChanges ? 'hasChanges' : ''}`} 
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <i className="ri-save-line" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoApproveRequest;