'use client';

import React, { useState, useEffect } from 'react';
import "../../../styles/budget-management/addBudgetRequest.css";
import { formatDate } from '../../../utils/dateFormatter';
import { showSuccess, showError, showConfirmation } from '../../../utils/Alerts';
import { validateField, isValidAmount, ValidationRule } from "../../../utils/validation";
import ModalHeader from '../../../Components/ModalHeader';

// Types
interface BudgetItem {
  item_name: string;
  quantity: number;
  unit_measure: string;
  unit_cost: number;
  supplier: string;
  subtotal: number;
  itemPriority?: 'must_have' | 'should_have' | 'nice_to_have';
  isEssential?: boolean;
}

interface NewBudgetRequest {
  purpose: string;
  justification: string;
  department: string;
  createdByName: string;
  createdByRole: string;
  amountRequested: number;
  fiscalYear: number;
  fiscalPeriod: string;
  category: string;
  priority?: string;
  urgencyReason?: string;
  start_date?: string;
  end_date?: string;
  items?: BudgetItem[];
  supporting_documents?: File[];
  status: 'DRAFT' | 'SUBMITTED';
  createdBy: number;
}

interface AddBudgetRequestProps {
  onClose: () => void;
  onAddBudgetRequest: (formData: NewBudgetRequest) => void;
  currentUser: string;
}

type FieldName = 'purpose' | 'justification' | 'amountRequested' | 'start_date' | 'end_date' | 'fiscalPeriod' | 'category' | 'priority' | 'urgencyReason';

const AddBudgetRequest: React.FC<AddBudgetRequestProps> = ({
  onClose,
  onAddBudgetRequest,
  currentUser
}) => {
  console.log('AddBudgetRequest component mounted', { onClose, onAddBudgetRequest, currentUser });

  const [formData, setFormData] = useState({
    purpose: '',
    justification: '',
    department: 'Finance', // Auto-filled
    createdByName: 'Finance Admin', // Auto-filled
    createdByRole: 'Admin', // Auto-filled
    fiscalYear: 2025,
    fiscalPeriod: '',
    category: '',
    priority: '',
    urgencyReason: '',
    amountRequested: 0,
    start_date: '',
    end_date: '',
    createdBy: 999 // Mock user ID
  });

  const [items, setItems] = useState<BudgetItem[]>([]);
  const [showItems, setShowItems] = useState(false);
  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isFormValid, setIsFormValid] = useState(false);

  const validationRules: Record<FieldName, ValidationRule> = {
    purpose: { 
      required: true, 
      label: "Budget Purpose",
      min: 10,
      max: 500
    },
    justification: { 
      required: true, 
      label: "Justification",
      max: 5000
    },
    amountRequested: {
      required: true,
      min: 0.01,
      max: 10000000,
      label: "Amount Requested",
      custom: (v: unknown) => {
        const numValue = typeof v === 'number' ? v : Number(v);
        if (!isValidAmount(numValue)) return "Amount must be greater than 0.";
        if (numValue > 10000000) return "Amount must not exceed ₱10,000,000.";
        return null;
      }
    },
    start_date: { required: false, label: "Start Date" },
    end_date: { required: false, label: "End Date" },
    fiscalPeriod: { required: true, label: "Fiscal Period" },
    category: { required: true, label: "Category" },
    priority: { required: false, label: "Priority" },
    urgencyReason: { 
      required: false, 
      label: "Urgency Reason",
      max: 1000
    }
  };

  // Comprehensive validation function
  const validateForm = (data: typeof formData, checkAllFields: boolean = false): Record<string, string> => {
    const errors: Record<string, string> = {};

    // Validate purpose
    if (!data.purpose || data.purpose.trim() === '') {
      if (checkAllFields) errors.purpose = 'Budget purpose is required';
    } else if (data.purpose.length < 10) {
      errors.purpose = 'Purpose must be at least 10 characters';
    } else if (data.purpose.length > 500) {
      errors.purpose = 'Purpose must not exceed 500 characters';
    }

    // Validate justification
    if (!data.justification || data.justification.trim() === '') {
      if (checkAllFields) errors.justification = 'Justification is required';
    } else if (data.justification.length > 5000) {
      errors.justification = 'Justification must not exceed 5000 characters';
    }

    // Validate amount
    if (data.amountRequested <= 0) {
      if (checkAllFields) errors.amountRequested = 'Amount must be greater than 0';
    } else if (data.amountRequested > 10000000) {
      errors.amountRequested = 'Amount must not exceed ₱10,000,000';
    }

    // Validate amount against items total
    if (showItems && items.length > 0) {
      const itemsTotal = calculateTotalFromItems();
      if (data.amountRequested < itemsTotal) {
        errors.amountRequested = `Amount must be at least ₱${itemsTotal.toLocaleString()} (items total)`;
      }
    }

    // Validate fiscal period
    if (!data.fiscalPeriod || data.fiscalPeriod === '') {
      if (checkAllFields) errors.fiscalPeriod = 'Fiscal period is required';
    }

    // Validate category
    if (!data.category || data.category === '') {
      if (checkAllFields) errors.category = 'Category is required';
    }

    // Validate urgency reason if priority is high or urgent
    if ((data.priority === 'high' || data.priority === 'urgent') && (!data.urgencyReason || data.urgencyReason.trim() === '')) {
      errors.urgencyReason = 'Urgency reason is required for high/urgent priority';
    } else if (data.urgencyReason && data.urgencyReason.length > 1000) {
      errors.urgencyReason = 'Urgency reason must not exceed 1000 characters';
    }

    // Validate date range
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      if (startDate >= endDate) {
        errors.end_date = 'End date must be after start date';
      }
    }

    return errors;
  };

  // Update validation state whenever form data changes
  useEffect(() => {
    const errors = validateForm(formData, false);
    setValidationErrors(errors);
    
    // Form is valid if there are no errors
    setIsFormValid(Object.keys(errors).length === 0);
  }, [formData, items, showItems]);

  // Calculate total from items
  const calculateTotalFromItems = () => {
    return items.reduce((total, item) => total + item.subtotal, 0);
  };

  // Update amount requested when items change
  useEffect(() => {
    if (showItems && items.length > 0) {
      const itemsTotal = calculateTotalFromItems();
      
      // Auto-fill if amountRequested is 0 or less than items total
      if (formData.amountRequested === 0 || formData.amountRequested < itemsTotal) {
        setFormData(prev => ({ ...prev, amountRequested: itemsTotal }));
      }
    }
  }, [items, showItems]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let newValue: string | number = value;

    if (name === 'amountRequested') {
      newValue = parseFloat(value) || 0;
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  // Item management functions
  const addItem = () => {
    setItems(prev => [...prev, {
      item_name: '',
      quantity: 1,
      unit_measure: 'pcs',
      unit_cost: 0,
      supplier: '',
      subtotal: 0,
      itemPriority: undefined,
      isEssential: false
    }]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BudgetItem, value: string | number | boolean) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Recalculate subtotal if quantity or unit_cost changes
      if (field === 'quantity' || field === 'unit_cost') {
        updated[index].subtotal = updated[index].quantity * updated[index].unit_cost;
      }
      
      return updated;
    });
  };

  // File handling functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const addFiles = (files: File[]) => {
    // Filter for allowed file types (documents and images)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        showError(`File type not allowed: ${file.name}`, 'Invalid File');
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showError(`File too large: ${file.name}. Maximum size is 10MB.`, 'File Too Large');
        return false;
      }
      return true;
    });

    setSupportingDocuments(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSupportingDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent, saveAsDraft: boolean = false) => {
    e.preventDefault();
    console.log('handleSubmit called', { saveAsDraft, formData, items });

    // Validate required fields only if not saving as draft
    if (!saveAsDraft) {
      const requiredFieldsToCheck: (keyof typeof formData)[] = ['purpose', 'justification', 'amountRequested', 'fiscalPeriod', 'category'];
      const missingFields = requiredFieldsToCheck.filter(field => {
        const value = formData[field];
        if (field === 'amountRequested') {
          return !value || Number(value) <= 0;
        }
        return !value || value === '';
      });

      console.log('Validation check:', { missingFields, formData });

      if (missingFields.length > 0) {
        const fieldLabels = missingFields.map(f => validationRules[f as FieldName]?.label || f).join(', ');
        showError(`Please fill in all required fields: ${fieldLabels}`, 'Validation Error');
        return;
      }

      // Validate amount
      if (formData.amountRequested <= 0) {
        showError('Amount requested must be greater than 0', 'Invalid Amount');
        return;
      }

      // Validate amount against items total
      if (showItems && items.length > 0) {
        const itemsTotal = calculateTotalFromItems();
        if (formData.amountRequested < itemsTotal) {
          showError(
            `Amount requested (₱${formData.amountRequested.toLocaleString()}) must be greater than or equal to items total (₱${itemsTotal.toLocaleString()})`,
            'Invalid Amount'
          );
          return;
        }
      }
    }

    // Validate date range if both dates are provided
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (startDate >= endDate) {
        showError('End date must be after start date', 'Invalid Date Range');
        return;
      }
    }

    // Validate items if they exist (only when not saving as draft)
    if (showItems && items.length > 0 && !saveAsDraft) {
      const invalidItems = items.filter(item => 
        !item.item_name || 
        item.quantity <= 0 || 
        item.unit_cost <= 0 || 
        !item.supplier
      );

      if (invalidItems.length > 0) {
        showError('Please complete all item fields or remove incomplete items', 'Invalid Items');
        return;
      }
    }

    const action = saveAsDraft ? 'save as draft' : 'submit for approval';
    console.log('Showing confirmation dialog for:', action);
    
    const result = await showConfirmation(
      `Are you sure you want to ${action} this budget request?`,
      `Confirm ${saveAsDraft ? 'Draft' : 'Submit'}`
    );

    console.log('Confirmation result:', result);

    if (result.isConfirmed) {
      try {
        const payload: NewBudgetRequest = {
          ...formData,
          status: saveAsDraft ? 'DRAFT' : 'SUBMITTED',
          items: showItems && items.length > 0 ? items : undefined,
          supporting_documents: supportingDocuments.length > 0 ? supportingDocuments : undefined
        };

        console.log('Sending payload:', payload);
        await onAddBudgetRequest(payload);
        showSuccess(
          `Budget request ${saveAsDraft ? 'saved as draft' : 'submitted for approval'} successfully`, 
          'Success'
        );
        onClose();
      } catch (error: unknown) {
        console.error('Error adding budget request:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        showError('Failed to add budget request: ' + errorMessage, 'Error');
      }
    }
  };

  return (
    <div className="modalOverlay">
      <div className="addBudgetRequestModal">
        <ModalHeader 
          title="Create Budget Request" 
          onClose={onClose} 
          showDateTime={true} 
        />

        <form onSubmit={(e) => handleSubmit(e, false)}>
          <div className="modalContent">
            <div className="formInputs">
              
              {/* Basic Information Section */}
              <div className="sectionHeader">Request Information</div>
              
              <div className="formRow">
                <div className="formField formFieldHalf">
                  <label htmlFor="department">Department</label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    readOnly
                    className="formInput"
                  />
                  <span className="autofill-note">Auto-filled based on current user</span>
                </div>
                
                <div className="formField formFieldHalf">
                  <label htmlFor="createdByName">Requester Name</label>
                  <input
                    type="text"
                    id="createdByName"
                    name="createdByName"
                    value={formData.createdByName}
                    readOnly
                    className="formInput"
                  />
                  <span className="autofill-note">Auto-filled based on current user</span>
                </div>
              </div>

              <div className="formRow">
                <div className="formField formFieldHalf">
                  <label htmlFor="createdByRole">Requester Role</label>
                  <input
                    type="text"
                    id="createdByRole"
                    name="createdByRole"
                    value={formData.createdByRole}
                    readOnly
                    className="formInput"
                  />
                  <span className="autofill-note">Auto-filled based on current user</span>
                </div>
                
                <div className="formField formFieldHalf">
                  <label htmlFor="fiscalYear">Fiscal Year</label>
                  <input
                    type="number"
                    id="fiscalYear"
                    name="fiscalYear"
                    value={formData.fiscalYear}
                    readOnly
                    className="formInput"
                  />
                  <span className="autofill-note">Auto-filled with current fiscal year</span>
                </div>
              </div>

              {/* Budget Details Section */}
              <div className="sectionHeader">Budget Details</div>
              
              <div className="formRow">
                <div className="formField formFieldHalf">
                  <label htmlFor="fiscalPeriod">Fiscal Period<span className='requiredTags'> *</span></label>
                  <select
                    id="fiscalPeriod"
                    name="fiscalPeriod"
                    value={formData.fiscalPeriod}
                    onChange={handleInputChange}
                    required
                    className="formSelect"
                  >
                    <option value="">Select Fiscal Period</option>
                    <option value="Q1">Quarter 1 (Q1)</option>
                    <option value="Q2">Quarter 2 (Q2)</option>
                    <option value="Q3">Quarter 3 (Q3)</option>
                    <option value="Q4">Quarter 4 (Q4)</option>
                    <option value="H1">Half 1 (H1)</option>
                    <option value="H2">Half 2 (H2)</option>
                    <option value="FY">Full Year (FY)</option>
                  </select>
                  {validationErrors.fiscalPeriod && (
                    <div className="error-message">{validationErrors.fiscalPeriod}</div>
                  )}
                </div>
                
                <div className="formField formFieldHalf">
                  <label htmlFor="category">Category<span className='requiredTags'> *</span></label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="formSelect"
                  >
                    <option value="">Select Category</option>
                    <option value="operational">Operational</option>
                    <option value="capital">Capital</option>
                    <option value="administrative">Administrative</option>
                    <option value="emergency">Emergency</option>
                  </select>
                  {validationErrors.category && (
                    <div className="error-message">{validationErrors.category}</div>
                  )}
                </div>
              </div>

              <div className="formRow">
                <div className="formField formFieldHalf">
                  <label htmlFor="priority">Priority</label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="formSelect"
                  >
                    <option value="">Select Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  {validationErrors.priority && (
                    <div className="error-message">{validationErrors.priority}</div>
                  )}
                </div>

                {(formData.priority === 'urgent' || formData.priority === 'high') && (
                  <div className="formField formFieldHalf">
                    <label htmlFor="urgencyReason">Urgency Reason<span className='requiredTags'> *</span></label>
                    <input
                      type="text"
                      id="urgencyReason"
                      name="urgencyReason"
                      value={formData.urgencyReason}
                      onChange={handleInputChange}
                      className="formInput"
                      placeholder="Explain why this is urgent"
                      maxLength={1000}
                    />
                    {validationErrors.urgencyReason && (
                      <div className="error-message">{validationErrors.urgencyReason}</div>
                    )}
                  </div>
                )}
              </div>

              <div className="formField">
                <label htmlFor="amountRequested">Amount Requested<span className='requiredTags'> *</span></label>
                <input
                  type="number"
                  id="amountRequested"
                  name="amountRequested"
                  value={formData.amountRequested}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                  className="formInput"
                  placeholder="0.00"
                />
                {showItems && items.length > 0 && (
                  <span className="autofill-note">
                    Auto-filled from items total: ₱{calculateTotalFromItems().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {formData.amountRequested > calculateTotalFromItems() && (
                      <span style={{ color: '#28a745', marginLeft: '8px' }}>
                        (includes buffer: ₱{(formData.amountRequested - calculateTotalFromItems()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </span>
                    )}
                  </span>
                )}
                {validationErrors.amountRequested && (
                  <div className="error-message">{validationErrors.amountRequested}</div>
                )}
              </div>

              <div className="formField">
                <label htmlFor="purpose">Budget Purpose / Project Name<span className='requiredTags'> *</span></label>
                <input
                  type="text"
                  id="purpose"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  required
                  className="formInput"
                  placeholder="Enter budget purpose or project name"
                  minLength={10}
                  maxLength={500}
                />
                <span className="helper-text">{formData.purpose.length}/500 characters (min: 10)</span>
                {validationErrors.purpose && (
                  <div className="error-message">{validationErrors.purpose}</div>
                )}
              </div>

              <div className="formField">
                <label htmlFor="justification">Justification<span className='requiredTags'> *</span></label>
                <textarea
                  id="justification"
                  name="justification"
                  value={formData.justification}
                  onChange={handleInputChange}
                  required
                  className="formInput"
                  placeholder="Provide detailed justification for this budget request"
                  rows={4}
                  maxLength={5000}
                />
                <span className="helper-text">{formData.justification.length}/5000 characters</span>
                {validationErrors.justification && (
                  <div className="error-message">{validationErrors.justification}</div>
                )}
              </div>

              <div className="formRow">
                <div className="formField formFieldHalf">
                  <label htmlFor="start_date">Start Date<span className='requiredTags'> *</span></label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                    className="formInput"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {validationErrors.start_date && (
                    <div className="error-message">{validationErrors.start_date}</div>
                  )}
                </div>
                
                <div className="formField formFieldHalf">
                  <label htmlFor="end_date">End Date<span className='requiredTags'> *</span></label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    required
                    className="formInput"
                    min={formData.start_date || new Date().toISOString().split('T')[0]}
                  />
                  {validationErrors.end_date && (
                    <div className="error-message">{validationErrors.end_date}</div>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div className="itemsSection">
                <div className="itemsHeader">
                  <h3>Budget Items (Optional)</h3>
                  <button
                    type="button"
                    className="itemsToggle"
                    onClick={() => setShowItems(!showItems)}
                  >
                    <i className={`ri-${showItems ? 'eye-off' : 'eye'}-line`} />
                    {showItems ? 'Hide Items' : 'Add Items'}
                  </button>
                </div>

                {showItems && (
                  <>
                    {items.map((item, index) => (
                      <div key={index} className="itemContainer">
                        <button
                          type="button"
                          className="removeItemBtn"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          title="Remove Item"
                        >
                          <i className="ri-close-line" />
                        </button>

                        <div className="itemGrid">
                          <div className="itemField">
                            <label>Item Name<span className='requiredTags'> *</span></label>
                            <input
                              type="text"
                              value={item.item_name}
                              onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                              placeholder="Enter item name"
                              required={showItems}
                            />
                          </div>

                          <div className="itemField">
                            <label>Quantity<span className='requiredTags'> *</span></label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                              min="1"
                              required={showItems}
                            />
                          </div>

                          <div className="itemField">
                            <label>Unit</label>
                            <select
                              value={item.unit_measure}
                              onChange={(e) => updateItem(index, 'unit_measure', e.target.value)}
                            >
                              <option value="pcs">pcs</option>
                              <option value="kg">kg</option>
                              <option value="lbs">lbs</option>
                              <option value="liters">liters</option>
                              <option value="meters">meters</option>
                              <option value="boxes">boxes</option>
                              <option value="sets">sets</option>
                              <option value="hours">hours</option>
                              <option value="days">days</option>
                            </select>
                          </div>

                          <div className="itemField">
                            <label>Unit Cost<span className='requiredTags'> *</span></label>
                            <input
                              type="number"
                              value={item.unit_cost}
                              onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              required={showItems}
                            />
                          </div>

                          <div className="itemField">
                            <label>Supplier<span className='requiredTags'> *</span></label>
                            <input
                              type="text"
                              value={item.supplier}
                              onChange={(e) => updateItem(index, 'supplier', e.target.value)}
                              placeholder="Enter supplier name"
                              required={showItems}
                            />
                          </div>

                          <div className="itemField">
                            <label>Item Priority</label>
                            <select
                              value={item.itemPriority || ''}
                              onChange={(e) => updateItem(index, 'itemPriority', e.target.value)}
                            >
                              <option value="">Select Priority</option>
                              <option value="must_have">Must Have</option>
                              <option value="should_have">Should Have</option>
                              <option value="nice_to_have">Nice to Have</option>
                            </select>
                          </div>

                          <div className="itemField">
                            <label>Essential</label>
                            <div className="checkboxField">
                              <input
                                type="checkbox"
                                checked={item.isEssential || false}
                                onChange={(e) => updateItem(index, 'isEssential', e.target.checked)}
                              />
                              <span>Mark as essential</span>
                            </div>
                          </div>

                          <div className="itemField">
                            <label>Subtotal</label>
                            <div className="subtotalField">
                              ₱{item.subtotal.toLocaleString(undefined, { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="addItemBtn"
                      onClick={addItem}
                    >
                      <i className="ri-add-line" /> Add Another Item
                    </button>

                    {items.length > 0 && (
                      <div className="totalAmountDisplay">
                        <h3>Total Amount from Items</h3>
                        <div className="totalAmountValue">
                          ₱{calculateTotalFromItems().toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Supporting Documents Section */}
              <div className="sectionHeader">Supporting Documents (Optional)</div>
              
              <div 
                className={`fileUploadSection ${dragOver ? 'dragOver' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="fileUploadIcon">
                  <i className="ri-upload-cloud-line" />
                </div>
                <div className="fileUploadText">
                  Drag and drop files here, or click to select files
                  <br />
                  <small>Supported: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF (Max 10MB each)</small>
                </div>
                <input
                  type="file"
                  className="fileInput"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileSelect}
                  id="supportingDocuments"
                />
                <label htmlFor="supportingDocuments" className="fileUploadBtn">
                  <i className="ri-attachment-line" /> Choose Files
                </label>

                {supportingDocuments.length > 0 && (
                  <div className="fileList">
                    <h4>Selected Files:</h4>
                    {supportingDocuments.map((file, index) => (
                      <div key={index} className="fileItem">
                        <div>
                          <div className="fileName">{file.name}</div>
                          <div className="fileSize">{formatFileSize(file.size)}</div>
                        </div>
                        <button
                          type="button"
                          className="removeFileBtn"
                          onClick={() => removeFile(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button
              type="button"
              className="saveAsDraftButton"
              disabled={!isFormValid}
              title={!isFormValid ? "Please fix all validation errors before saving" : "Save as draft"}
              onClick={async (e) => {
                console.log('Save as Draft button clicked - START');
                e.preventDefault();
                e.stopPropagation();
                
                if (!isFormValid) {
                  alert('Please fix all validation errors before saving');
                  return;
                }
                
                try {
                  console.log('Creating draft payload...', formData);
                  const payload: NewBudgetRequest = {
                    ...formData,
                    status: 'DRAFT',
                    items: showItems && items.length > 0 ? items : undefined,
                    supporting_documents: supportingDocuments.length > 0 ? supportingDocuments : undefined
                  };
                  
                  console.log('Calling onAddBudgetRequest with payload:', payload);
                  await onAddBudgetRequest(payload);
                  console.log('onAddBudgetRequest completed successfully');
                  
                  alert('Draft saved successfully!');
                  onClose();
                } catch (error) {
                  console.error('Error saving draft:', error);
                  alert('Error saving draft: ' + (error instanceof Error ? error.message : String(error)));
                }
              }}
            >
              <i className="ri-draft-line" /> Save as Draft
            </button>
            <button 
              type="button" 
              className="submitButton"
              disabled={!isFormValid}
              title={!isFormValid ? "Please fix all validation errors before submitting" : "Submit for approval"}
              onClick={async (e) => {
                console.log('Submit for Approval button clicked - START');
                e.preventDefault();
                e.stopPropagation();
                
                if (!isFormValid) {
                  alert('Please fix all validation errors before submitting');
                  return;
                }
                
                // Quick validation
                if (!formData.purpose || !formData.justification || !formData.amountRequested || formData.amountRequested <= 0) {
                  alert('Please fill in required fields: Purpose, Justification, and Amount');
                  return;
                }

                // Validate amount against items total
                if (showItems && items.length > 0) {
                  const itemsTotal = calculateTotalFromItems();
                  if (formData.amountRequested < itemsTotal) {
                    alert(`Amount requested (₱${formData.amountRequested.toLocaleString()}) must be greater than or equal to items total (₱${itemsTotal.toLocaleString()})`);
                    return;
                  }
                }
                
                try {
                  console.log('Creating submission payload...', formData);
                  const payload: NewBudgetRequest = {
                    ...formData,
                    status: 'SUBMITTED',
                    items: showItems && items.length > 0 ? items : undefined,
                    supporting_documents: supportingDocuments.length > 0 ? supportingDocuments : undefined
                  };
                  
                  console.log('Calling onAddBudgetRequest with payload:', payload);
                  await onAddBudgetRequest(payload);
                  console.log('onAddBudgetRequest completed successfully');
                  
                  alert('Request submitted successfully!');
                  onClose();
                } catch (error) {
                  console.error('Error submitting request:', error);
                  alert('Error submitting request: ' + (error instanceof Error ? error.message : String(error)));
                }
              }}
            >
              <i className="ri-send-plane-line" /> Submit for Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBudgetRequest;