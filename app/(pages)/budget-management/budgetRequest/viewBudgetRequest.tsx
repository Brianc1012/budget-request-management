'use client';

import React from 'react';
import "../../../styles/budget-management/viewBudgetRequest.css";
import { formatDate, formatDateTime } from '../../../utils/dateFormatter';
import ModalHeader from '../../../Components/ModalHeader';

// Types - using the same as your existing BudgetRequest interface
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

interface BudgetRequest {
  id: number;
  requestCode?: string;
  purpose: string;
  justification: string;
  amountRequested: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  category: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  urgencyReason?: string;
  createdBy: number;
  createdByName: string;
  department: string;
  fiscalYear: number;
  fiscalPeriod: string;
  reservedAmount?: number;
  bufferPercentage?: number;
  reviewedBy?: number;
  reviewedByName?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  // Extended fields
  requester_position?: string;
  start_date?: string;
  end_date?: string;
  items?: BudgetItem[];
  itemAllocations?: BudgetItem[];
  itemBreakdown?: string; // JSON string from database
  supplierBreakdown?: string; // JSON string from database
  totalItemsRequested?: number;
  totalSuppliersInvolved?: number;
  supporting_documents?: File[] | string[]; // Could be File objects or file URLs
}

interface ViewBudgetRequestProps {
  request: BudgetRequest;
  onClose: () => void;
  onEdit?: (request: BudgetRequest) => void;
  onExport?: (request: BudgetRequest) => void;
  showActions?: boolean;
}

const ViewBudgetRequest: React.FC<ViewBudgetRequestProps> = ({ 
  request, 
  onClose, 
  onEdit, 
  onExport,
  showActions = true 
}) => {
  
  // Status badge component (reuse from your main page)
  const StatusBadge = ({ status }: { status: string }) => {
    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'DRAFT': return 'Draft';
        case 'SUBMITTED': return 'Submitted';
        case 'APPROVED': return 'Approved';
        case 'REJECTED': return 'Rejected';
        case 'CANCELLED': return 'Cancelled';
        default: return status;
      }
    };

    const getStatusClass = (status: string) => {
      switch (status) {
        case 'DRAFT': return 'Draft';
        case 'SUBMITTED': return 'pending-approval';
        case 'APPROVED': return 'Approved';
        case 'REJECTED': return 'Rejected';
        case 'CANCELLED': return 'Closed';
        default: return 'Draft';
      }
    };

    return (
      <span className={`chip ${getStatusClass(status)}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  // Parse itemBreakdown from JSON string if available
  const getItems = (): BudgetItem[] => {
    // Helper function to normalize item data from any source
    const normalizeItem = (item: any): BudgetItem => {
      console.log('Raw item received:', JSON.stringify(item, null, 2));
      console.log('Item keys:', Object.keys(item));
      
      // More defensive value extraction
      let quantity = 0;
      if (item.quantity !== undefined && item.quantity !== null) {
        quantity = Number(item.quantity);
        if (isNaN(quantity)) quantity = 0;
      }
      
      let unitCost = 0;
      const costValue = item.estimatedCost || item.unitCost || item.unit_cost;
      if (costValue !== undefined && costValue !== null) {
        unitCost = Number(costValue);
        if (isNaN(unitCost)) unitCost = 0;
      }
      
      let subtotal = 0;
      const subtotalValue = item.subtotal || item.totalCost;
      if (subtotalValue !== undefined && subtotalValue !== null) {
        subtotal = Number(subtotalValue);
        if (isNaN(subtotal)) subtotal = quantity * unitCost;
      } else {
        subtotal = quantity * unitCost;
      }
      
      console.log('Extracted values:', { quantity, unitCost, subtotal });
      
      const normalized = {
        item_name: item.itemName || item.item_name || 'Unknown Item',
        quantity: quantity,
        unit_measure: item.unitMeasure || item.unit_measure || 'pcs',
        unit_cost: unitCost,
        supplier: item.supplierName || item.supplier || 'Unknown Supplier',
        subtotal: subtotal,
        itemPriority: item.itemPriority || undefined,
        isEssential: item.isEssential !== undefined ? item.isEssential : undefined
      };
      
      console.log('Final normalized item:', JSON.stringify(normalized, null, 2));
      return normalized;
    };

    console.log('Getting items from request:', {
      hasItems: !!request.items,
      hasItemAllocations: !!request.itemAllocations,
      hasItemBreakdown: !!request.itemBreakdown
    });

    // First check if items array exists (from form submission)
    if (request.items && request.items.length > 0) {
      console.log('Using items from request.items:', request.items);
      return request.items.map(normalizeItem);
    }
    
    // Then check itemAllocations (from database relation)
    if (request.itemAllocations && request.itemAllocations.length > 0) {
      console.log('Using items from request.itemAllocations:', request.itemAllocations);
      return request.itemAllocations.map(normalizeItem);
    }
    
    // Finally try to parse itemBreakdown JSON string
    if (request.itemBreakdown) {
      try {
        console.log('Parsing itemBreakdown string:', request.itemBreakdown);
        const parsed = JSON.parse(request.itemBreakdown);
        console.log('Parsed itemBreakdown:', parsed);
        const normalized = parsed.map(normalizeItem);
        console.log('Final normalized items:', normalized);
        return normalized;
      } catch (e) {
        console.error('Failed to parse itemBreakdown:', e);
        return [];
      }
    }
    
    console.log('No items found in request');
    return [];
  };

  // Parse supplierBreakdown from JSON string if available
  const getSupplierBreakdown = () => {
    if (request.supplierBreakdown) {
      try {
        return JSON.parse(request.supplierBreakdown);
      } catch (e) {
        console.error('Failed to parse supplierBreakdown:', e);
        return [];
      }
    }
    return [];
  };

  const items = getItems();
  const supplierBreakdown = getSupplierBreakdown();

  // Calculate total from items if available
  const calculateItemsTotal = () => {
    if (items.length === 0) return 0;
    return items.reduce((total, item) => total + item.subtotal, 0);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file download (placeholder)
  const handleFileDownload = (file: File | string, index: number) => {
    console.log('Download file:', file);
    // Implement actual download logic here
  };

  // Generate action history based on request status
  const getActionHistory = () => {
    const history = [
      {
        action: 'Request Created',
        user: request.createdByName,
        date: request.createdAt,
        details: `Created as ${request.status}`
      }
    ];

    if (request.status === 'APPROVED' && request.approvedAt && request.reviewedByName) {
      history.push({
        action: 'Request Approved',
        user: request.reviewedByName,
        date: request.approvedAt,
        details: 'Budget request approved and funds allocated'
      });
    }

    if (request.status === 'REJECTED' && request.reviewedByName) {
      history.push({
        action: 'Request Rejected',
        user: request.reviewedByName,
        date: request.rejectedAt || request.updatedAt || '',
        details: request.reviewNotes || 'No reason provided'
      });
    }

    if (request.status === 'CANCELLED') {
      history.push({
        action: 'Request Cancelled',
        user: request.reviewedByName || 'System',
        date: request.cancelledAt || request.updatedAt || '',
        details: request.reviewNotes || 'Budget request cancelled'
      });
    }

    return history;
  };

  return (
    <div className="modalOverlay">
      <div className="viewBudgetRequestModal">
        {/* Use ModalHeader component with custom content */}
        <div className="modalHeader">
          <div className="header-left">
            <h1>Budget Request Details</h1>
            <div className="statusBadgeHeader">
              <span className="statusLabel">Status:</span>
              <StatusBadge status={request.status} />
            </div>

            <div className="header-right">
                <button type="button" className="closeButton" onClick={onClose}>
                    <i className="ri-close-line"></i>
                </button>
            </div>
          </div>
          
          
        </div>

        <div className="modalContent">
          <div className="displayInputs">
            
            {/* Request Information Section */}
            <div className="sectionHeader">Request Information</div>
            
            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Request Code</label>
                <div className="displayValue highlightValue">{request.requestCode || `REQ-${request.id}`}</div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>Date of Request</label>
                <div className="displayValue">{formatDate(request.createdAt)}</div>
              </div>
            </div>

            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Department</label>
                <div className="displayValue">{request.department}</div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>Requester Name</label>
                <div className="displayValue">{request.createdByName}</div>
              </div>
            </div>

            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Fiscal Year</label>
                <div className="displayValue">{request.fiscalYear}</div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>Fiscal Period</label>
                <div className="displayValue">{request.fiscalPeriod}</div>
              </div>
            </div>

            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Requester Position</label>
                <div className="displayValue">{request.requester_position || 'Not specified'}</div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>Category</label>
                <div className="displayValue">{request.category}</div>
              </div>
            </div>

            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Priority</label>
                <div className="displayValue">
                  {request.priority ? (
                    <span className={`priority-badge priority-${request.priority.toLowerCase()}`}>
                      {request.priority.toUpperCase()}
                    </span>
                  ) : (
                    <span className="priority-badge priority-none">N/A</span>
                  )}
                </div>
              </div>
              
              {request.urgencyReason && (
                <div className="displayField displayFieldHalf">
                  <label>Urgency Reason</label>
                  <div className="displayValue">{request.urgencyReason}</div>
                </div>
              )}
            </div>

            {/* Budget Details Section */}
            <div className="sectionHeader">Budget Details</div>
            
            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Requested Amount</label>
                <div className="displayValue highlightValue">
                  ₱{request.amountRequested.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
              </div>
              
              {request.reservedAmount && (
                <div className="displayField displayFieldHalf">
                  <label>Reserved Amount</label>
                  <div className="displayValue highlightValue">
                    ₱{request.reservedAmount.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                </div>
              )}
              
              {request.bufferPercentage && (
                <div className="displayField displayFieldHalf">
                  <label>Buffer Percentage</label>
                  <div className="displayValue">{request.bufferPercentage}%</div>
                </div>
              )}
            </div>

            <div className="displayField">
              <label>Budget Purpose / Project Name</label>
              <div className="displayValue highlightValue">{request.purpose}</div>
            </div>

            <div className="displayField">
              <label>Justification</label>
              <div className="displayValue displayValueTextarea">{request.justification}</div>
            </div>

            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Start Date</label>
                <div className="displayValue">
                  {request.start_date ? formatDate(request.start_date) : 
                   <span className="displayValueEmpty">Not specified</span>}
                </div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>End Date</label>
                <div className="displayValue">
                  {request.end_date ? formatDate(request.end_date) : 
                   <span className="displayValueEmpty">Not specified</span>}
                </div>
              </div>
            </div>

            {/* Items Section */}
            {items && items.length > 0 && (
              <div className="itemsDisplaySection">
                <div className="itemsDisplayHeader">
                  <h3>Budget Items</h3>
                  <div className="itemsCount">{items.length} item{items.length !== 1 ? 's' : ''}</div>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="itemDisplayContainer">
                    <div className="itemDisplayGrid">
                      <div className="itemDisplayField">
                        <label>Item Name</label>
                        <div className="itemDisplayValue">{item.item_name}</div>
                      </div>

                      <div className="itemDisplayField">
                        <label>Quantity</label>
                        <div className="itemDisplayValue">{item.quantity}</div>
                      </div>

                      <div className="itemDisplayField">
                        <label>Unit</label>
                        <div className="itemDisplayValue">{item.unit_measure}</div>
                      </div>

                      <div className="itemDisplayField">
                        <label>Unit Cost</label>
                        <div className="itemDisplayValue">
                          ₱{(item.unit_cost || 0).toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </div>
                      </div>

                      <div className="itemDisplayField">
                        <label>Supplier</label>
                        <div className="itemDisplayValue">{item.supplier || 'N/A'}</div>
                      </div>

                      <div className="itemDisplayField">
                        <label>Item Priority</label>
                        <div className="itemDisplayValue">
                          {item.itemPriority ? (
                            <span className={`item-priority-badge item-priority-${item.itemPriority.replace('_', '-')}`}>
                              {item.itemPriority.replace('_', ' ').toUpperCase()}
                            </span>
                          ) : (
                            <span className="item-priority-badge item-priority-none">N/A</span>
                          )}
                        </div>
                      </div>

                      <div className="itemDisplayField">
                        <label>Essential</label>
                        <div className="itemDisplayValue">
                          {item.isEssential !== undefined ? (
                            <span className={`essential-badge ${item.isEssential ? 'essential-yes' : 'essential-no'}`}>
                              {item.isEssential ? 'Yes' : 'No'}
                            </span>
                          ) : (
                            <span className="essential-badge essential-none">N/A</span>
                          )}
                        </div>
                      </div>

                      <div className="itemDisplayField">
                        <label>Subtotal</label>
                        <div className="subtotalDisplayField">
                          ₱{(item.subtotal || 0).toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="totalAmountDisplayView">
                  <h3>Total Amount from Items</h3>
                  <div className="totalAmountValueView">
                    ₱{calculateItemsTotal().toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Supplier Breakdown Section */}
            {supplierBreakdown && supplierBreakdown.length > 0 && (
              <div className="supplierBreakdownSection">
                <div className="sectionHeader">Supplier Breakdown</div>
                <div className="supplierBreakdownGrid">
                  {supplierBreakdown.map((supplier: any, index: number) => (
                    <div key={index} className="supplierBreakdownCard">
                      <div className="supplierBreakdownName">
                        <i className="ri-store-line" /> {supplier.supplierName || 'Unknown Supplier'}
                      </div>
                      <div className="supplierBreakdownDetails">
                        <div className="supplierBreakdownField">
                          <span className="supplierBreakdownLabel">Items:</span>
                          <span className="supplierBreakdownValue">{supplier.itemCount || 0}</span>
                        </div>
                        <div className="supplierBreakdownField">
                          <span className="supplierBreakdownLabel">Total Amount:</span>
                          <span className="supplierBreakdownValue highlightValue">
                            ₱{(Number(supplier.totalAmount) || 0).toLocaleString(undefined, { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="supplierBreakdownSummary">
                  <span>Total Suppliers: <strong>{supplierBreakdown.length}</strong></span>
                  <span>Total Items: <strong>{items.length}</strong></span>
                </div>
              </div>
            )}

            {/* Supporting Documents Section */}
            <div className="sectionHeader">Supporting Documents</div>
            
            <div className="fileDisplaySection">
              {request.supporting_documents && request.supporting_documents.length > 0 ? (
                <div className="fileDisplayList">
                  {request.supporting_documents.map((file, index) => (
                    <div key={index} className="fileDisplayItem">
                      <div>
                        <div className="fileDisplayName">
                          {typeof file === 'string' ? file : file.name}
                        </div>
                        {typeof file !== 'string' && (
                          <div className="fileDisplaySize">{formatFileSize(file.size)}</div>
                        )}
                      </div>
                      <button
                        className="downloadFileBtn"
                        onClick={() => handleFileDownload(file, index)}
                        title="Download File"
                      >
                        <i className="ri-download-line" /> Download
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="fileDisplayIcon">
                    <i className="ri-file-line" />
                  </div>
                  <div className="noFilesMessage">No supporting documents attached</div>
                </>
              )}
            </div>

            {/* Review Information */}
            {(request.status === 'APPROVED' || request.status === 'REJECTED') && (
              <>
                <div className="sectionHeader">Review Information</div>
                <div className="displayRow">
                  <div className="displayField displayFieldHalf">
                    <label>{request.status === 'APPROVED' ? 'Approved By' : 'Rejected By'}</label>
                    <div className="displayValue">{request.reviewedByName || 'Not specified'}</div>
                  </div>
                  
                  <div className="displayField displayFieldHalf">
                    <label>{request.status === 'APPROVED' ? 'Approval Date' : 'Rejection Date'}</label>
                    <div className="displayValue">
                      {request.status === 'APPROVED' && request.approvedAt ? formatDate(request.approvedAt) :
                       request.status === 'REJECTED' && request.rejectedAt ? formatDate(request.rejectedAt) :
                       <span className="displayValueEmpty">Not specified</span>}
                    </div>
                  </div>
                </div>

                {request.reviewNotes && (
                  <div className="displayField">
                    <label>{request.status === 'REJECTED' ? 'Rejection Reason' : 'Review Notes'}</label>
                    <div className="displayValue displayValueTextarea">{request.reviewNotes}</div>
                  </div>
                )}
              </>
            )}

            {/* Action History */}
            <div className="actionHistorySection">
              <div className="actionHistoryHeader">
                <h3>Action History</h3>
              </div>
              {getActionHistory().map((action, index) => (
                <div key={index} className="actionHistoryItem">
                  <div className="actionHistoryDetails">
                    <div className="actionHistoryAction">{action.action}</div>
                    <div className="actionHistoryMeta">
                      by {action.user} - {action.details}
                    </div>
                  </div>
                  <div className="actionHistoryDate">
                    {formatDateTime(action.date)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showActions && (
          <div className="modalButtons">
            {onExport && (
              <button className="exportButton" onClick={() => onExport(request)}>
                <i className="ri-download-line" /> Export
              </button>
            )}
            {onEdit && request.status === 'DRAFT' && (
              <button className="editButton" onClick={() => onEdit(request)}>
                <i className="ri-edit-line" /> Edit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewBudgetRequest;