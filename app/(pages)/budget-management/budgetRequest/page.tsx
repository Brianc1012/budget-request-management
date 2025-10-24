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



interface BudgetRequest {
  id: number;
  requestCode?: string;
  purpose: string;
  justification: string;
  amountRequested: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  category: string;
  priority?: string;
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
}

const BudgetRequestPage = () => {
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

  // Mock data - replace with actual API call
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data
        const mockData: BudgetRequest[] = [
          {
            id: 1,
            requestCode: 'BR-2025-001',
            purpose: 'New Bus Maintenance Equipment',
            justification: 'Purchase of diagnostic equipment for bus maintenance including computerized diagnostic tools and specialized repair equipment for improving service quality.',
            amountRequested: 50000,
            status: 'SUBMITTED',
            category: 'Maintenance',
            department: 'Operations',
            createdBy: 101,
            createdByName: 'John Doe',
            createdByEmail: 'john.doe@example.com',
            fiscalYear: 2025,
            fiscalPeriod: 'Q1',
            createdAt: '2024-03-15T10:00:00Z'
          },
          {
            id: 2,
            requestCode: 'BR-2025-002',
            purpose: 'Marketing Campaign Q2',
            justification: 'Budget for digital marketing campaign including social media advertising, website improvements, and promotional materials to increase ridership.',
            amountRequested: 25000,
            reservedAmount: 26250,
            bufferPercentage: 5,
            status: 'APPROVED',
            category: 'Marketing',
            department: 'Operations',
            createdBy: 102,
            createdByName: 'Jane Smith',
            reviewedBy: 201,
            reviewedByName: 'Finance Admin',
            fiscalYear: 2025,
            fiscalPeriod: 'Q2',
            createdAt: '2024-03-10T14:30:00Z'
          },
          {
            id: 3,
            requestCode: 'BR-2025-003',
            purpose: 'Driver Training Program',
            justification: 'Quarterly driver safety training program covering defensive driving techniques and vehicle maintenance basics for all fleet drivers.',
            amountRequested: 15000,
            status: 'DRAFT',
            category: 'Training',
            department: 'HR',
            createdBy: 103,
            createdByName: 'Mike Johnson',
            fiscalYear: 2025,
            fiscalPeriod: 'Q1',
            createdAt: '2024-03-20T09:15:00Z'
          },
          {
            id: 4,
            requestCode: 'BR-2025-004',
            purpose: 'GPS Tracking System Upgrade',
            justification: 'Upgrade existing GPS tracking systems across the fleet with new hardware and software capabilities for better route optimization.',
            amountRequested: 75000,
            status: 'REJECTED',
            category: 'Equipment',
            department: 'Operations',
            createdBy: 104,
            createdByName: 'Sarah Wilson',
            reviewedBy: 201,
            reviewedByName: 'Finance Admin',
            reviewNotes: 'Budget constraints for Q1',
            fiscalYear: 2025,
            fiscalPeriod: 'Q1',
            createdAt: '2024-03-08T11:20:00Z'
          },
          {
            id: 5,
            requestCode: 'BR-2025-005',
            purpose: 'Terminal Infrastructure Repair',
            justification: 'Essential repairs to bus terminal facilities including roof repairs, electrical system updates, and passenger waiting areas renovation.',
            amountRequested: 120000,
            reservedAmount: 126000,
            bufferPercentage: 5,
            status: 'APPROVED',
            category: 'Infrastructure',
            department: 'Operations',
            createdBy: 105,
            createdByName: 'Tom Brown',
            reviewedBy: 201,
            reviewedByName: 'Finance Admin',
            fiscalYear: 2025,
            fiscalPeriod: 'Q1',
            createdAt: '2024-02-25T16:45:00Z'
          },
          {
            id: 6,
            requestCode: 'BR-2025-006',
            purpose: 'Fleet Expansion Vehicles',
            justification: 'Purchase of 3 additional buses to expand route coverage and reduce passenger wait times during peak hours.',
            amountRequested: 450000,
            status: 'SUBMITTED',
            category: 'Operations',
            department: 'Operations',
            createdBy: 106,
            createdByName: 'David Lee',
            fiscalYear: 2025,
            fiscalPeriod: 'Q2',
            createdAt: '2024-03-18T13:30:00Z'
          },
          {
            id: 7,
            requestCode: 'BR-2025-007',
            purpose: 'Office Equipment Upgrade',
            justification: 'Replacement of outdated computers and office equipment for administrative staff to improve operational efficiency.',
            amountRequested: 18000,
            status: 'DRAFT',
            category: 'Other',
            department: 'Operations',
            createdBy: 107,
            createdByName: 'Lisa Martinez',
            fiscalYear: 2025,
            fiscalPeriod: 'Q1',
            createdAt: '2024-03-22T08:45:00Z'
          },
          {
            id: 8,
            requestCode: 'BR-2025-008',
            purpose: 'Safety Equipment Update',
            justification: 'Purchase of updated safety equipment including first aid kits, fire extinguishers, and emergency communication devices for all vehicles.',
            amountRequested: 8500,
            reservedAmount: 8925,
            bufferPercentage: 5,
            status: 'APPROVED',
            category: 'Equipment',
            department: 'Operations',
            createdBy: 108,
            createdByName: 'Robert Garcia',
            reviewedBy: 201,
            reviewedByName: 'Finance Admin',
            fiscalYear: 2025,
            fiscalPeriod: 'Q1',
            createdAt: '2024-03-12T10:20:00Z'
          }
        ];
        
        setData(mockData);
      } catch (error) {
        console.error('Error fetching data:', error);
        showError('Failed to load budget requests', 'Error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
        try {
            // Here you would make an API call to save the budget request
            console.log('New budget request:', newRequest);
            
            // For now, add to local state (replace with actual API call)
            const mockRequest: BudgetRequest = {
                id: data.length + 1,
                requestCode: `BR-2025-${String(data.length + 1).padStart(3, '0')}`,
                purpose: newRequest.purpose,
                justification: newRequest.justification,
                amountRequested: newRequest.amountRequested,
                status: newRequest.status as 'DRAFT' | 'SUBMITTED',
                category: newRequest.category || 'Operations',
                createdBy: 999, // Mock user ID
                createdByName: newRequest.createdByName,
                department: newRequest.department || 'Operations',
                fiscalYear: newRequest.fiscalYear || 2025,
                fiscalPeriod: newRequest.fiscalPeriod || 'Q1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            setData(prev => [mockRequest, ...prev]);
            showSuccess('Budget request created successfully', 'Success');
            setShowAddModal(false);
        } catch (error) {
            console.error('Error creating budget request:', error);
            showError('Failed to create budget request', 'Error');
        }
    };


  // Action handlers
  const handleView = (item: BudgetRequest) => {
    setSelectedRequest(item);
    setShowViewModal(true);
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
      try {
        // Implement delete API call
        setData(prev => prev.filter(item => item.id !== requestId));
        showSuccess('Request deleted successfully', 'Deleted');
      } catch (error) {
        console.error('Delete error:', error);
        showError('Failed to delete request', 'Error');
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
      try {
        // Implement submit API call
        setData(prev => prev.map(item => 
          item.id === requestId 
            ? { ...item, status: 'SUBMITTED' as const }
            : item
        ));
        showSuccess('Request submitted for approval', 'Success');
      } catch (error) {
        console.error('Submit error:', error);
        showError('Failed to submit request', 'Error');
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
      try {
        // Implement approve API call
        setData(prev => prev.map(item => 
          item.id === requestId 
            ? { 
                ...item, 
                status: 'APPROVED' as const,
                reviewedByName: 'Finance Admin'
              }
            : item
        ));
        showSuccess('Request approved successfully', 'Approved');
      } catch (error) {
        console.error('Approve error:', error);
        showError('Failed to approve request', 'Error');
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
      try {
        // Implement reject API call
        setData(prev => prev.map(item => 
          item.id === requestId 
            ? { 
                ...item, 
                status: 'REJECTED' as const,
                reviewNotes: reason,
                reviewedByName: 'Finance Admin'
              }
            : item
        ));
        showSuccess('Request rejected successfully', 'Rejected');
      } catch (error) {
        console.error('Reject error:', error);
        showError('Failed to reject request', 'Error');
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