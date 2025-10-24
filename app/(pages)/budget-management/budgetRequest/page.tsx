"use client";

import React, { useState, useEffect } from "react";
import "../../../styles/components/table.css";
import "../../../styles/components/chips.css";
import "../../../styles/budget-management/budgetRequest.css";
import PaginationComponent from "../../../Components/pagination";
import Swal from 'sweetalert2';
import { formatDate, formatDateTime } from '../../../utils/dateFormatter';
import Loading from '../../../Components/loading';
import { showSuccess, showError } from '../../../utils/Alerts';
import FilterDropdown, { FilterSection } from "../../../Components/filter";
import AddBudgetRequest from './addBudgetRequest';
import ViewBudgetRequest from './viewBudgetRequest';
import AuditTrailBudgetRequest from './auditTrailBudgetRequest';
import budgetRequestService, { 
  CreateBudgetRequestDto, 
  ApprovalDto, 
  RejectionDto 
} from '../../../services/budgetRequest.service';
import { useAuth } from '../../../contexts/AuthContext';



interface BudgetRequestItem {
  id: number;
  budgetRequestId: number;
  itemName: string;
  itemCode?: string;
  quantity: number;
  unitMeasure?: string;
  unitCost: string | number;
  totalCost: string | number;
  supplierId?: number | null;
  supplierName: string;
  itemPriority?: string;
  isEssential?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
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
  createdByEmail?: string;
  department: string;
  requestType?: string;
  fiscalYear: number;
  fiscalPeriod: string;
  reservedAmount?: number;
  bufferPercentage?: number;
  reviewedBy?: number;
  reviewedByName?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt?: string;
  start_date?: string;
  end_date?: string;
  itemBreakdown?: string;
  supplierBreakdown?: string;
  itemAllocations?: BudgetRequestItem[];
  totalItemsRequested?: number;
  totalSuppliersInvolved?: number;
}

const BudgetRequestPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedRequestForAudit, setSelectedRequestForAudit] = useState<BudgetRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
  const [availableCategories] = useState([
    'Operations',
    'Maintenance',
    'Marketing',
    'Training',
    'Equipment',
    'Infrastructure',
    'Other'
  ]);
  const [sortField, setSortField] = useState<keyof BudgetRequest>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Date Range',
      type: 'dateRange',
      defaultValue: { from: dateFrom, to: dateTo }
    },
    {
      id: 'status',
      title: 'Status',
      type: 'checkbox',
      options: [
        { id: 'DRAFT', label: 'Draft' },
        { id: 'SUBMITTED', label: 'Submitted' },
        { id: 'APPROVED', label: 'Approved' },
        { id: 'REJECTED', label: 'Rejected' },
        { id: 'CANCELLED', label: 'Cancelled' }
      ]
    },
    {
      id: 'category',
      title: 'Category',
      type: 'checkbox',
      options: availableCategories.map(cat => ({
        id: cat,
        label: cat
      }))
    }
  ];

  // Handle filter application
  const handleFilterApply = (filterValues: Record<string, string | string[] | {from: string; to: string}>) => {
    // Date range filter
    if (filterValues.dateRange && typeof filterValues.dateRange === 'object') {
      const dateRange = filterValues.dateRange as { from: string; to: string};
      setDateFrom(dateRange.from);
      setDateTo(dateRange.to);
    }
    
    // Status filter
    if (filterValues.status && Array.isArray(filterValues.status)) {
      setStatusFilter(filterValues.status.join(','));
    } else {
      setStatusFilter('');
    }

    // Category filter
    if (filterValues.category && Array.isArray(filterValues.category)) {
      setCategoryFilter(filterValues.category.join(','));
    } else {
      setCategoryFilter('');
    }

    // Reset pagination
    setCurrentPage(1);
  };

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Build params object, only include defined values
        const params: any = {
          page: currentPage,
          limit: pageSize,
          sortBy: sortField,
          sortOrder: sortOrder
        };
        
        // Only add optional params if they have values
        if (search) params.search = search;
        if (statusFilter) params.status = statusFilter;
        
        const response = await budgetRequestService.list(params);
        
        if (response.success && response.data) {
          setData(response.data);
        } else {
          showError(response.error || 'Failed to load budget requests', 'Error');
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        showError(error.message || 'Failed to load budget requests', 'Error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, pageSize, search, statusFilter, categoryFilter, dateFrom, dateTo, sortField, sortOrder]);

  // Filter and sort logic
  const filteredData = data.filter((item: BudgetRequest) => {
    const searchLower = search.toLowerCase();

    const matchesSearch = search === '' || 
      item.purpose.toLowerCase().includes(searchLower) ||
      item.justification.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower) ||
      item.status.toLowerCase().includes(searchLower) ||
      item.createdByName.toLowerCase().includes(searchLower) ||
      item.department.toLowerCase().includes(searchLower) ||
      item.amountRequested.toString().includes(searchLower) ||
      (item.requestCode && item.requestCode.toLowerCase().includes(searchLower));

    const matchesStatus = statusFilter ? 
      statusFilter.split(',').some(status => item.status === status.trim()) : true;

    const matchesCategory = categoryFilter ? 
      categoryFilter.split(',').some(cat => item.category === cat.trim()) : true;

    const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
    const matchesDate = (!dateFrom || itemDate >= dateFrom) && 
      (!dateTo || itemDate <= dateTo);

    return matchesSearch && matchesStatus && matchesCategory && matchesDate;
  }).sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Status badge component using unified chip styling
  const StatusBadge = ({ status }: { status: string }) => {
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

    return (
      <span className={`chip ${getStatusClass(status)}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  // Action buttons based on status (Admin View)
  const getActionButtons = (item: BudgetRequest) => {
    const buttons = [];

    // View button (always available)
    buttons.push(
      <button 
        key="view"
        className="viewBtn" 
        onClick={() => handleView(item)}
        title="View Request"
      >
        <i className="ri-eye-line" />
      </button>
    );

    switch (item.status) {
      case 'DRAFT':
        buttons.push(
          <button 
            key="edit"
            className="editBtn" 
            onClick={() => handleEdit(item)}
            title="Edit Request"
          >
            <i className="ri-edit-2-line" />
          </button>,
          <button 
            key="delete"
            className="deleteBtn" 
            onClick={() => handleDelete(item.id)}
            title="Delete Request"
          >
            <i className="ri-delete-bin-line" />
          </button>,
          <button 
            key="submit"
            className="submitBtn" 
            onClick={() => handleSubmit(item.id)}
            title="Submit for Approval"
          >
            <i className="ri-send-plane-line" />
          </button>
        );
        break;
      
      case 'SUBMITTED':
        break;
      
      case 'REJECTED':
        buttons.push(
          <button 
            key="export"
            className="exportBtn" 
            onClick={() => handleExportSingle(item)}
            title="Export Request"
          >
            <i className="ri-download-line" />
          </button>
        );
        break;
        
      case 'APPROVED':
      case 'CANCELLED':
        buttons.push(
          <button 
            key="export"
            className="exportBtn" 
            onClick={() => handleExportSingle(item)}
            title="Export Request"
          >
            <i className="ri-download-line" />
          </button>,
          <button 
            key="audit"
            className="auditBtn" 
            onClick={() => handleAuditTrail(item.id)}
            title="View Audit Trail"
          >
            <i className="ri-history-line" />
          </button>
        );
        break;
    }

    return buttons;
  };

  // Add Budget Request
  const handleAddBudgetRequest = async (newRequest: any) => {
    setLoading(true);
    try {
      console.log('Original newRequest received:', newRequest);
      console.log('Items from newRequest:', newRequest.items);
      
      const createDto: CreateBudgetRequestDto = {
        purpose: newRequest.purpose,
        justification: newRequest.justification,
        amountRequested: newRequest.amountRequested,
        category: newRequest.category || 'Operations',
        priority: newRequest.priority || undefined,
        urgencyReason: newRequest.urgencyReason || undefined,
        fiscalYear: newRequest.fiscalYear || 2025,
        fiscalPeriod: newRequest.fiscalPeriod || 'Q1',
        department: user?.department || 'operations',
        createdByName: user?.username || 'Unknown User',
        createdByRole: user?.role || 'Staff',
        status: newRequest.status as 'DRAFT' | 'SUBMITTED',
        start_date: newRequest.start_date,
        end_date: newRequest.end_date,
        items: newRequest.items,
        supporting_documents: newRequest.supporting_documents
      };
      
      console.log('CreateDTO being sent:', createDto);
      console.log('Items in DTO:', createDto.items);
      
      const response = await budgetRequestService.create(createDto);
      
      if (response.success && response.data) {
        // Refresh the list by re-fetching
        const listResponse = await budgetRequestService.list({
          page: currentPage,
          limit: pageSize
        });
        
        if (listResponse.success && listResponse.data) {
          setData(listResponse.data);
        }
        
        showSuccess('Budget request created successfully', 'Success');
        setShowAddModal(false);
      } else {
        showError(response.error || 'Failed to create budget request', 'Error');
      }
    } catch (error: any) {
      console.error('Error creating budget request:', error);
      showError(error.message || 'Failed to create budget request', 'Error');
    } finally {
      setLoading(false);
    }
  };


  // Action handlers
  const handleView = async (item: BudgetRequest) => {
    try {
      // Fetch full details including itemAllocations
      console.log('Fetching full budget request details for ID:', item.id);
      const response = await budgetRequestService.getById(item.id);
      
      if (response.success && response.data) {
        console.log('Full budget request data received:', response.data);
        console.log('itemAllocations:', response.data.itemAllocations);
        setSelectedRequest(response.data);
        setShowViewModal(true);
      } else {
        showError(response.error || 'Failed to load budget request details', 'Error');
      }
    } catch (error: any) {
      console.error('Error fetching budget request details:', error);
      showError(error.message || 'Failed to load budget request details', 'Error');
    }
  };

  const handleEdit = (item: BudgetRequest) => {
    console.log('Edit:', item);
    showSuccess('Edit functionality will be implemented', 'Info');
    // Implement edit modal
  };

  const handleDelete = async (requestId: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the budget request permanently.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#961C1E',
      cancelButtonColor: '#FEB71F',
      reverseButtons: true,
      confirmButtonText: 'Yes, delete it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const response = await budgetRequestService.delete(requestId);
        
        if (response.success) {
          setData(prev => prev.filter(item => item.id !== requestId));
          showSuccess('Request deleted successfully', 'Deleted');
        } else {
          showError(response.error || 'Failed to delete request', 'Error');
        }
      } catch (error: any) {
        console.error('Delete error:', error);
        showError(error.message || 'Failed to delete request', 'Error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (requestId: number) => {
    const result = await Swal.fire({
      title: 'Submit for Approval?',
      text: 'Once submitted, you cannot edit this request.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#FEB71F',
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Submit',
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const response = await budgetRequestService.submit(requestId);
        
        if (response.success && response.data) {
          setData(prev => prev.map(item => 
            item.id === requestId ? response.data! : item
          ));
          showSuccess('Request submitted for approval', 'Success');
        } else {
          showError(response.error || 'Failed to submit request', 'Error');
        }
      } catch (error: any) {
        console.error('Submit error:', error);
        showError(error.message || 'Failed to submit request', 'Error');
      } finally {
        setLoading(false);
      }
    }
  };

  // New admin functions
  const handleApprove = async (requestId: number) => {
    const result = await Swal.fire({
      title: 'Approve Budget Request?',
      text: 'This will approve the budget request and allocate funds.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#FEB71F',
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Approve',
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const approvalData: ApprovalDto = {
          reviewNotes: 'Approved by Finance Admin'
        };
        
        const response = await budgetRequestService.approve(requestId, approvalData);
        
        if (response.success && response.data) {
          setData(prev => prev.map(item => 
            item.id === requestId ? response.data! : item
          ));
          showSuccess('Request approved successfully', 'Approved');
        } else {
          showError(response.error || 'Failed to approve request', 'Error');
        }
      } catch (error: any) {
        console.error('Approve error:', error);
        showError(error.message || 'Failed to approve request', 'Error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReject = async (requestId: number) => {
    const { value: reason } = await Swal.fire({
      title: 'Reject Budget Request',
      input: 'textarea',
      inputLabel: 'Rejection Reason',
      inputPlaceholder: 'Enter reason for rejection...',
      inputAttributes: {
        'aria-label': 'Enter reason for rejection'
      },
      showCancelButton: true,
      confirmButtonText: 'Reject',
      confirmButtonColor: '#FF4949',
      cancelButtonColor: '#FEB71F',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to provide a reason for rejection!'
        }
      }
    });

    if (reason) {
      setLoading(true);
      try {
        const rejectionData: RejectionDto = {
          reviewNotes: reason
        };
        
        const response = await budgetRequestService.reject(requestId, rejectionData);
        
        if (response.success && response.data) {
          setData(prev => prev.map(item => 
            item.id === requestId ? response.data! : item
          ));
          showSuccess('Request rejected successfully', 'Rejected');
        } else {
          showError(response.error || 'Failed to reject request', 'Error');
        }
      } catch (error: any) {
        console.error('Reject error:', error);
        showError(error.message || 'Failed to reject request', 'Error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExportSingle = (item: BudgetRequest) => {
    console.log('Export single:', item);
    showSuccess(`Exporting request ${item.requestCode || item.id}...`, 'Export Started');
    // Implement single request export
  };

    const handleAuditTrail = (requestId: number) => {
        const request = data.find(item => item.id === requestId);
        if (request) {
            setSelectedRequestForAudit(request);
            setShowAuditModal(true);
        }
    };

  // Export functions
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    console.log('Export format:', format);
    showSuccess(`Exporting data as ${format.toUpperCase()}...`, 'Export Started');
    // Implement export functionality based on format
  };

  // Sort handler
  const handleSort = (field: keyof BudgetRequest) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  if (loading) {
          return (
              <div className="card">
                  <h1 className="title">Budget Request</h1>
                  <Loading />
              </div>
          );
      }

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Budget Requests</h1>
        </div>
        
        <div className="settings">
          {/* Search bar */}
          <div className="revenue_searchBar">
            <i className="ri-search-line" />
            <input
              className="searchInput"
              type="text"
              placeholder="Search requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <FilterDropdown
            sections={filterSections}
            onApply={handleFilterApply}
            initialValues={{
              dateRange: { from: dateFrom, to: dateTo },
              status: statusFilter ? statusFilter.split(',') : [],
              category: categoryFilter ? categoryFilter.split(',') : []
            }}
          />

          <div className="filters">
            {/* Export dropdown */}
            <div className="export-dropdown">
              <button className="export-dropdown-toggle">
                <i className="ri-download-line" /> Export
              </button>
              <div className="export-dropdown-menu">
                <button onClick={() => handleExport('csv')}>
                  <i className="ri-file-text-line" /> CSV
                </button>
                <button onClick={() => handleExport('excel')}>
                  <i className="ri-file-excel-line" /> Excel
                </button>
                <button onClick={() => handleExport('pdf')}>
                  <i className="ri-file-pdf-line" /> PDF
                </button>
              </div>
            </div>

            {/* Add New Request */}
            <button onClick={() => setShowAddModal(true)} id="addRequest">
                <i className="ri-add-line" /> New Request
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('createdAt')} className="sortable">
                    Request Date
                    {sortField === 'createdAt' && (
                      <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                    )}
                  </th>
                  <th onClick={() => handleSort('purpose')} className="sortable">
                    Purpose
                    {sortField === 'purpose' && (
                      <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                    )}
                  </th>
                  <th onClick={() => handleSort('category')} className="sortable">
                    Category
                    {sortField === 'category' && (
                      <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                    )}
                  </th>
                  <th onClick={() => handleSort('priority')} className="sortable">
                    Priority
                    {sortField === 'priority' && (
                      <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                    )}
                  </th>
                  <th onClick={() => handleSort('amountRequested')} className="sortable">
                    Amount
                    {sortField === 'amountRequested' && (
                      <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                    )}
                  </th>
                  <th onClick={() => handleSort('status')} className="sortable">
                    Status
                    {sortField === 'status' && (
                      <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                    )}
                  </th>
                  <th onClick={() => handleSort('createdByName')} className="sortable">
                    Requested By
                    {sortField === 'createdByName' && (
                      <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                    )}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map(item => (
                  <tr 
                    key={item.id}
                    onClick={(e) => {
                        // Prevent row click when clicking on action buttons
                        if (!(e.target as HTMLElement).closest('.actionButtonsContainer')) {
                        handleView(item);
                        }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <div className="request-title">
                        <strong title={item.purpose.length > 30 ? item.purpose : undefined}>
                            {item.purpose}
                        </strong>
                        <div 
                            className="request-description" 
                            title={item.justification.length > 60 ? item.justification : undefined}
                        >
                            {item.justification.length > 60 
                            ? `${item.justification.substring(0, 60)}...` 
                            : item.justification
                            }
                        </div>
                      </div>
                    </td>
                    <td>{item.category}</td>
                    <td>
                      {item.priority ? (
                        <span className={`priority-badge priority-${item.priority?.toLowerCase()}`}>
                          {item.priority}
                        </span>
                      ) : (
                        <span className="priority-badge priority-none">N/A</span>
                      )}
                    </td>
                    <td className="amount-cell">
                      ₱{item.amountRequested.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>{item.createdByName}</td>
                    <td className="actionButtons">
                      <div className="actionButtonsContainer">
                        {getActionButtons(item)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentRecords.length === 0 && !loading && (
              <p className="noRecords">No budget requests found.</p>
            )}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />

        {showAddModal && (
            <AddBudgetRequest
                onClose={() => setShowAddModal(false)}
                onAddBudgetRequest={handleAddBudgetRequest}
                currentUser="ftms_user" // Replace with actual user
            />
        )}

        {showAuditModal && selectedRequestForAudit && (
            <AuditTrailBudgetRequest
                requestId={selectedRequestForAudit.requestCode || `REQ-${selectedRequestForAudit.id}`}
                requestTitle={selectedRequestForAudit.purpose}
                onClose={() => {
                setShowAuditModal(false);
                setSelectedRequestForAudit(null);
                }}
            />
        )}

        {showViewModal && selectedRequest && (
            <ViewBudgetRequest
                request={selectedRequest}
                onClose={() => {
                setShowViewModal(false);
                setSelectedRequest(null);
                }}
                onEdit={(request) => {
                console.log('Edit request:', request);
                // Handle edit functionality
                setShowViewModal(false);
                }}
                onExport={(request) => {
                console.log('Export request:', request);
                // Handle export functionality
                }}
                showActions={true}
            />
        )}
      </div>
    </div>
  );
};

export default BudgetRequestPage;