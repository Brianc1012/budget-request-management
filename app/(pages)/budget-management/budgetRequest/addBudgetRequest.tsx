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

type FieldName = 'purpose' | 'justification' | 'amountRequested' | 'start_date' | 'end_date' | 'fiscalPeriod' | 'category';

const AddBudgetRequest: React.FC<AddBudgetRequestProps> = ({
  onClose,
  onAddBudgetRequest,
  currentUser
}) => {
  const [errors, setErrors] = useState<Record<FieldName, string[]>>({
    purpose: [],
    justification: [],
    amountRequested: [],
    start_date: [],
    end_date: [],
    fiscalPeriod: [],
    category: []
  });

  const [formData, setFormData] = useState({
    purpose: '',
    justification: '',
    department: 'Operations', // Auto-filled
    createdByName: 'Admin User', // Auto-filled
    createdByRole: 'Administrator', // Auto-filled
    fiscalYear: 2025,
    fiscalPeriod: 'Q1',
    category: 'Operations',
    amountRequested: 0,
    start_date: '',
    end_date: '',
    createdBy: 999 // Mock user ID
  });

  const [items, setItems] = useState<BudgetItem[]>([]);
  const [showItems, setShowItems] = useState(false);
  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const validationRules: Record<FieldName, ValidationRule> = {
    purpose: { required: true, label: "Budget Purpose" },
    justification: { required: true, label: "Justification" },
    amountRequested: {
      required: true,
      min: 0.01,
      label: "Amount Requested",
      custom: (v: unknown) => {
        const numValue = typeof v === 'number' ? v : Number(v);
        return isValidAmount(numValue) ? null : "Amount must be greater than 0.";
      }
    },
    start_date: { required: false, label: "Start Date" },
    end_date: { required: false, label: "End Date" },
    fiscalPeriod: { required: true, label: "Fiscal Period" },
    category: { required: true, label: "Category" }
  };

  // Calculate total from items
  const calculateTotalFromItems = () => {
    return items.reduce((total, item) => total + item.subtotal, 0);
  };

  // Update total amount when items change
  useEffect(() => {
    if (showItems && items.length > 0) {
      const itemsTotal = calculateTotalFromItems();
      setFormData(prev => ({ ...prev, total_amount: itemsTotal }));
    }
  }, [items, showItems]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let newValue: string | number = value;

    if (name === 'total_amount') {
      newValue = parseFloat(value) || 0;
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Validate field
    if (validationRules[name as FieldName]) {
      setErrors(prev => ({
        ...prev,
        [name]: validateField(newValue, validationRules[name as FieldName])
      }));
    }
  };

  // Item management functions
  const addItem = () => {
    setItems(prev => [...prev, {
      item_name: '',
      quantity: 1,
      unit_measure: 'pcs',
      unit_cost: 0,
      supplier: '',
      subtotal: 0
    }]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BudgetItem, value: string | number) => {
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

  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean = false) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = ['title', 'description', 'total_amount', 'start_date', 'end_date'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

    if (missingFields.length > 0 && !saveAsDraft) {
      showError('Please fill in all required fields', 'Validation Error');
      return;
    }

    // Validate date range
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (startDate >= endDate) {
        showError('End date must be after start date', 'Invalid Date Range');
        return;
      }
    }

    // Validate items if they exist
    if (showItems && items.length > 0) {
      const invalidItems = items.filter(item => 
        !item.item_name || 
        item.quantity <= 0 || 
        item.unit_cost <= 0 || 
        !item.supplier
      );

      if (invalidItems.length > 0 && !saveAsDraft) {
        showError('Please complete all item fields or remove incomplete items', 'Invalid Items');
        return;
      }
    }

    const action = saveAsDraft ? 'save as draft' : 'submit for approval';
    const result = await showConfirmation(
      `Are you sure you want to ${action} this budget request?`,
      `Confirm ${saveAsDraft ? 'Draft' : 'Submit'}`
    );

    if (result.isConfirmed) {
      try {
        const payload: NewBudgetRequest = {
          ...formData,
          status: saveAsDraft ? 'DRAFT' : 'SUBMITTED',
          items: showItems && items.length > 0 ? items : undefined,
          supporting_documents: supportingDocuments.length > 0 ? supportingDocuments : undefined
        };

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
                    <option value="Q1">Quarter 1 (Q1)</option>
                    <option value="Q2">Quarter 2 (Q2)</option>
                    <option value="Q3">Quarter 3 (Q3)</option>
                    <option value="Q4">Quarter 4 (Q4)</option>
                    <option value="H1">Half 1 (H1)</option>
                    <option value="H2">Half 2 (H2)</option>
                    <option value="FY">Full Year (FY)</option>
                  </select>
                  {errors.fiscalPeriod?.map((msg: string, i: number) => (
                    <div className="error-message" key={i}>{msg}</div>
                  ))}
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
                    <option value="Operations">Operations</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Capital">Capital</option>
                    <option value="Personnel">Personnel</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                  {errors.category?.map((msg: string, i: number) => (
                    <div className="error-message" key={i}>{msg}</div>
                  ))}
                </div>
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
                  readOnly={showItems && items.length > 0}
                  placeholder="0.00"
                />
                {showItems && items.length > 0 && (
                  <span className="autofill-note">Auto-calculated from items below</span>
                )}
                {errors.amountRequested?.map((msg: string, i: number) => (
                  <div className="error-message" key={i}>{msg}</div>
                ))}
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
                />
                {errors.purpose?.map((msg: string, i: number) => (
                  <div className="error-message" key={i}>{msg}</div>
                ))}
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
                />
                {errors.justification?.map((msg: string, i: number) => (
                  <div className="error-message" key={i}>{msg}</div>
                ))}
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
                  {errors.start_date?.map((msg, i) => (
                    <div className="error-message" key={i}>{msg}</div>
                  ))}
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
                  {errors.end_date?.map((msg, i) => (
                    <div className="error-message" key={i}>{msg}</div>
                  ))}
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
              onClick={(e) => handleSubmit(e, true)}
            >
              <i className="ri-draft-line" /> Save as Draft
            </button>
            <button type="submit" className="submitButton">
              <i className="ri-send-plane-line" /> Submit for Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBudgetRequest;