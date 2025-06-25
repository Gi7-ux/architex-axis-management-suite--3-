import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Invoice, InvoiceStatus, Project, InvoiceItem } from '../../../types';
import { CurrencyDollarIcon, PlusCircleIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  fetchUsersAPI,
  fetchProjectsAPI,
  createInvoice as apiCreateInvoice,
  listInvoices as apiListInvoices,
  updateInvoice as apiUpdateInvoice, // Import updateInvoice
  // recordPayment as apiRecordPayment, // Optional for mark as paid - not implementing full payment record in this step
} from '../../../apiService';
import Modal from '../../shared/Modal';
import { PaperAirplaneIcon, CheckCircleIcon, ArchiveBoxXMarkIcon, PencilIcon, EyeIcon } from '@heroicons/react/24/solid';

// Mock User data for freelancers - Can be replaced by API call
const mockFreelancersData: User[] = [
  { id: 'user-freelancer-1', name: 'Alice Wonderland', email: 'alice@example.com', role: UserRole.FREELANCER, hourlyRate: 500 },
  { id: 'user-freelancer-2', name: 'Bob The Builder', email: 'bob@example.com', role: UserRole.FREELANCER, hourlyRate: 650 },
  { id: 'user-freelancer-3', name: 'Carol Danvers', email: 'carol@example.com', role: UserRole.FREELANCER, hourlyRate: 700 },
];

// Mock API call to update freelancer rates (replace with actual API call later)
const updateFreelancerRatesAPI = async (updatedRates: Record<string, number>): Promise<boolean> => {
  console.log('Mock API: Updating freelancer rates...', updatedRates);
  mockFreelancersData.forEach(f => {
    if (updatedRates[f.id] !== undefined) {
      f.hourlyRate = updatedRates[f.id];
    }
  });
  return new Promise(resolve => setTimeout(() => resolve(true), 700));
};


// --- Create Invoice Form Initial State ---
const initialInvoiceFormData = {
  clientId: '',
  projectId: '',
  issueDate: new Date().toISOString().split('T')[0], // Defaults to today
  dueDate: '',
  items: [{ description: '', quantity: 1, unitPrice: 0 }],
  taxRate: 0.15, // Default 15% tax
};

interface NewInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}


const AdminBillingPage: React.FC = () => {
  const [freelancers, setFreelancers] = useState<User[]>([]);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [isLoadingFreelancers, setIsLoadingFreelancers] = useState(true);
  const [isSavingRates, setIsSavingRates] = useState(false);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);

  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);
  const [clients, setClients] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);

  const [newInvoiceData, setNewInvoiceData] = useState<{
    clientId: string;
    projectId: string;
    issueDate: string;
    dueDate: string;
    items: NewInvoiceItem[];
    taxRate: number;
  }>(initialInvoiceFormData);
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  const [selectedInvoiceForViewing, setSelectedInvoiceForViewing] = useState<Invoice | null>(null);
  const [isViewInvoiceModalOpen, setIsViewInvoiceModalOpen] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: keyof Invoice | null; direction: 'ascending' | 'descending' }>({ key: 'issueDate', direction: 'descending' });
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});


  // Fetch initial data: freelancers and invoices
  const loadFreelancers = useCallback(async () => {
    setIsLoadingFreelancers(true);
    try {
      const data = await new Promise<User[]>(resolve => setTimeout(() => resolve(mockFreelancersData), 300));
      setFreelancers(data);
      const initialRates: Record<string, string> = {};
      data.forEach(f => {
        initialRates[f.id] = String(f.hourlyRate || 0);
      });
      setRates(initialRates);
    } catch (error) {
      console.error('Failed to fetch freelancers:', error);
    } finally {
      setIsLoadingFreelancers(false);
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    setIsLoadingInvoices(true);
    try {
      const fetchedInvoices = await apiListInvoices();
      setInvoices(fetchedInvoices);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setIsLoadingInvoices(false);
    }
  }, []);

  useEffect(() => {
    loadFreelancers();
    loadInvoices();
  }, [loadFreelancers, loadInvoices]);

  useEffect(() => {
    if (isCreateInvoiceModalOpen) {
      fetchUsersAPI(UserRole.CLIENT)
        .then(setClients)
        .catch(error => console.error('Failed to fetch clients:', error));
      fetchProjectsAPI()
        .then(setProjects)
        .catch(error => console.error('Failed to fetch projects:', error));
    }
  }, [isCreateInvoiceModalOpen]);

  useEffect(() => {
    if (newInvoiceData.clientId && projects.length > 0) {
      setAvailableProjects(projects.filter(p => p.clientId === newInvoiceData.clientId));
    } else {
      setAvailableProjects([]);
    }
    setNewInvoiceData(prev => ({ ...prev, projectId: '' }));
  }, [newInvoiceData.clientId, projects]);


  const handleRateChange = (freelancerId: string, value: string) => {
    setRates(prev => ({ ...prev, [freelancerId]: value }));
  };

  const handleSaveFreelancerRates = async () => {
    setIsSavingRates(true);
    const ratesToUpdate: Record<string, number> = {};
    for (const id in rates) {
      const rateNum = parseFloat(rates[id]);
      if (!isNaN(rateNum)) ratesToUpdate[id] = rateNum;
      else console.warn(`Invalid rate for freelancer ${id}: ${rates[id]}`);
    }
    try {
      await updateFreelancerRatesAPI(ratesToUpdate);
      alert('Rates updated successfully! (Mock)');
    } catch (error) {
      console.error('Failed to update rates:', error);
      alert('Failed to update rates. (Mock)');
    } finally {
      setIsSavingRates(false);
    }
  };

  const openCreateInvoiceModal = () => {
    setNewInvoiceData(initialInvoiceFormData);
    setIsCreateInvoiceModalOpen(true);
  };

  const handleInvoiceFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewInvoiceData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, field: keyof NewInvoiceItem, value: string | number) => {
    const updatedItems = [...newInvoiceData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: field === 'description' ? value : Number(value) };
    setNewInvoiceData(prev => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setNewInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    const updatedItems = newInvoiceData.items.filter((_, i) => i !== index);
    setNewInvoiceData(prev => ({ ...prev, items: updatedItems }));
  };

  const calculateTotals = () => {
    const subTotal = newInvoiceData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = subTotal * newInvoiceData.taxRate;
    const totalAmount = subTotal + taxAmount;
    return { subTotal, taxAmount, totalAmount };
  };

  const { subTotal, taxAmount, totalAmount } = calculateTotals();

  const sortedAndFilteredInvoices = React.useMemo(() => {
    let sortableItems = [...invoices];
    if (statusFilter) {
      sortableItems = sortableItems.filter(invoice => invoice.status === statusFilter);
    }
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key!];
        let valB = b[sortConfig.key!];
        if (typeof valA === 'string' && typeof valB === 'string') {
          if (['issueDate', 'dueDate'].includes(sortConfig.key!)) {
            valA = new Date(valA).toISOString();
            valB = new Date(valB).toISOString();
          }
        }
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [invoices, sortConfig, statusFilter]);

  const requestSort = (key: keyof Invoice) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as InvoiceStatus | '');
  };

  const getSortIndicator = (key: keyof Invoice) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    }
    return '';
  };

  const handleInvoiceAction = async (invoiceId: string, action: 'send' | 'mark_paid' | 'void') => {
    setActionLoading(prev => ({ ...prev, [invoiceId]: true }));
    let newStatus: InvoiceStatus | null = null;
    let successMessage = '';

    try {
      switch (action) {
        case 'send':
          newStatus = InvoiceStatus.SENT;
          await apiUpdateInvoice(invoiceId, { status: newStatus });
          successMessage = 'Invoice marked as Sent.';
          break;
        case 'mark_paid': {
          newStatus = InvoiceStatus.PAID;
          const invoiceToPay = invoices.find(inv => inv.id === invoiceId);
          if (invoiceToPay) {
            await apiUpdateInvoice(invoiceId, { status: newStatus });
            // Consider calling apiRecordPayment here if needed in future
            successMessage = 'Invoice marked as Paid.';
          } else {
            throw new Error('Invoice not found for payment.');
          }
          break;
        }
        case 'void':
          if (window.confirm('Are you sure you want to void this invoice? This action cannot be undone easily.')) {
            newStatus = InvoiceStatus.VOID;
            await apiUpdateInvoice(invoiceId, { status: newStatus });
            successMessage = 'Invoice has been voided.';
          } else {
            // User cancelled, ensure loading state is reset and return early
            setActionLoading(prev => ({ ...prev, [invoiceId]: false }));
            return;
          }
          break;
        default:
          throw new Error('Unknown action');
      }

      if (successMessage) {
        alert(successMessage);
        loadInvoices(); // Refresh list
      }
    } catch (error) {
      console.error(`Failed to ${action} invoice ${invoiceId}:`, error);
      alert(`Error: Could not ${action} invoice.`);
    } finally {
      setActionLoading(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  const handleViewInvoiceDetails = (invoice: Invoice) => {
    setSelectedInvoiceForViewing(invoice);
    setIsViewInvoiceModalOpen(true);
  };

  const handleSaveInvoice = async () => {
    setIsSubmittingInvoice(true);
    const selectedClient = clients.find(c => c.id === newInvoiceData.clientId);
    const selectedProject = projects.find(p => p.id === newInvoiceData.projectId);

    if (!selectedClient || !selectedProject) {
        alert('Client and Project must be selected.');
        setIsSubmittingInvoice(false);
        return;
    }

    const invoiceToCreate = {
        clientId: newInvoiceData.clientId,
        clientName: selectedClient.name,
        projectId: newInvoiceData.projectId,
        projectTitle: selectedProject.title,
        issueDate: newInvoiceData.issueDate,
        dueDate: newInvoiceData.dueDate,
        items: newInvoiceData.items.map(item => ({ ...item, })),
        taxRate: newInvoiceData.taxRate,
    };

    try {
      await apiCreateInvoice(invoiceToCreate as any);
      alert('Invoice created successfully! (Mock)');
      setIsCreateInvoiceModalOpen(false);
      loadInvoices();
    } catch (error) {
      console.error('Failed to create invoice:', error);
      alert('Failed to create invoice. (Mock)');
    } finally {
      setIsSubmittingInvoice(false);
    }
  };


  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <CurrencyDollarIcon className="h-8 w-8 mr-3 text-green-600" />
          Billing Management
        </h1>
      </header>

      {/* Section 1: Managing Freelancer Rates */}
      <section className="mb-12 p-6 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">Manage Freelancer Rates</h2>
        {isLoadingFreelancers ? (
          <p>Loading freelancers...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Hourly Rate (R)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Rate (R)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {freelancers.map(freelancer => (
                  <tr key={freelancer.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{freelancer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{freelancer.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{freelancer.hourlyRate || 'Not set'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={rates[freelancer.id] || ''}
                        onChange={(e) => handleRateChange(freelancer.id, e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter new rate"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-6 text-right">
              <button
                onClick={handleSaveFreelancerRates}
                disabled={isSavingRates || isLoadingFreelancers}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isSavingRates ? 'Saving...' : 'Save All Rate Changes'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Section 2: Viewing/Managing Invoices */}
      <section className="mb-12 p-6 bg-white shadow-lg rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-700">View & Manage Invoices</h2>
          <button
            onClick={openCreateInvoiceModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Create New Invoice
          </button>
        </div>

        <div className="my-4 flex justify-start items-center space-x-4">
          <div>
            <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700 mr-2">Filter by Status:</label>
            <select
              id="statusFilter"
              name="statusFilter"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              {Object.values(InvoiceStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoadingInvoices ? <p>Loading invoices...</p> : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('invoiceNumber')}>Invoice #{getSortIndicator('invoiceNumber')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('issueDate')}>Issue Date{getSortIndicator('issueDate')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('dueDate')}>Due Date{getSortIndicator('dueDate')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('totalAmount')}>Total (R){getSortIndicator('totalAmount')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('status')}>Status{getSortIndicator('status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAndFilteredInvoices.length > 0 ? sortedAndFilteredInvoices.map(invoice => {
                const issueDate = new Date(invoice.issueDate).toLocaleDateString();
                const dueDate = new Date(invoice.dueDate).toLocaleDateString();
                return (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:underline cursor-pointer">{invoice.invoiceNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.clientName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.projectTitle || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{issueDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dueDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">R {invoice.totalAmount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      invoice.status === InvoiceStatus.PAID ? 'bg-green-100 text-green-800' :
                      invoice.status === InvoiceStatus.SENT ? 'bg-yellow-100 text-yellow-800' :
                      invoice.status === InvoiceStatus.DRAFT ? 'bg-gray-200 text-gray-800' :
                      invoice.status === InvoiceStatus.VOID ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleViewInvoiceDetails(invoice)}
                        className="p-1 text-indigo-600 hover:text-indigo-800"
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>

                      {actionLoading[invoice.id] ? <span className="text-xs text-gray-500">Processing...</span> : (
                        <>
                          {invoice.status === InvoiceStatus.DRAFT && (
                            <>
                              <button
                                onClick={() => handleInvoiceAction(invoice.id, 'send')}
                                className="p-1 text-green-500 hover:text-green-700"
                                title="Send Invoice"
                                disabled={actionLoading[invoice.id]}
                              >
                                <PaperAirplaneIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => alert('Edit functionality to be implemented.')}
                                className="p-1 text-yellow-500 hover:text-yellow-700"
                                title="Edit Invoice"
                                disabled={actionLoading[invoice.id]}
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleInvoiceAction(invoice.id, 'void')}
                                className="p-1 text-red-500 hover:text-red-700"
                                title="Void Invoice"
                                disabled={actionLoading[invoice.id]}
                              >
                                <ArchiveBoxXMarkIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}
                          {invoice.status === InvoiceStatus.SENT && (
                            <>
                              <button
                                onClick={() => handleInvoiceAction(invoice.id, 'mark_paid')}
                                className="p-1 text-green-500 hover:text-green-700"
                                title="Mark as Paid"
                                disabled={actionLoading[invoice.id]}
                              >
                                <CheckCircleIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleInvoiceAction(invoice.id, 'void')}
                                className="p-1 text-red-500 hover:text-red-700"
                                title="Void Invoice"
                                disabled={actionLoading[invoice.id]}
                              >
                                <ArchiveBoxXMarkIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}
                          {invoice.status === InvoiceStatus.PAID && (
                             <button
                                onClick={() => alert('View Payment Details functionality to be implemented.')}
                                className="p-1 text-blue-500 hover:text-blue-700"
                                title="View Payment Details"
                                disabled={actionLoading[invoice.id]}
                              >
                               <EyeIcon className="h-5 w-5" />
                              </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    No invoices found{statusFilter ? ` with status "${statusFilter}"` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </section>

      {/* Create Invoice Modal - Content remains the same */}
      {isCreateInvoiceModalOpen && (
        <Modal title="Create New Invoice" onClose={() => setIsCreateInvoiceModalOpen(false)} size="2xl">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {/* Client and Project Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">Client</label>
                <select
                  id="clientId"
                  name="clientId"
                  value={newInvoiceData.clientId}
                  onChange={handleInvoiceFormChange}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">Select Client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name} ({client.company || 'N/A'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="projectId" className="block text-sm font-medium text-gray-700">Project</label>
                <select
                  id="projectId"
                  name="projectId"
                  value={newInvoiceData.projectId}
                  onChange={handleInvoiceFormChange}
                  disabled={!newInvoiceData.clientId || availableProjects.length === 0}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50"
                >
                  <option value="">Select Project</option>
                  {availableProjects.map(project => (
                    <option key={project.id} value={project.id}>{project.title}</option>
                  ))}
                </select>
                {!newInvoiceData.clientId && <p className="text-xs text-gray-500 mt-1">Please select a client first.</p>}
                {newInvoiceData.clientId && availableProjects.length === 0 && <p className="text-xs text-gray-500 mt-1">No projects found for this client.</p>}
              </div>
            </div>

            {/* Issue Date and Due Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700">Issue Date</label>
                <input
                  type="date"
                  id="issueDate"
                  name="issueDate"
                  value={newInvoiceData.issueDate}
                  onChange={handleInvoiceFormChange}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Due Date</label>
                <input
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  value={newInvoiceData.dueDate}
                  onChange={handleInvoiceFormChange}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Line Items</h3>
              {newInvoiceData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-center mb-3 p-3 border rounded-md">
                  <div className="col-span-5">
                    <label htmlFor={`item-desc-${index}`} className="block text-xs font-medium text-gray-700">Description</label>
                    <input
                      type="text"
                      id={`item-desc-${index}`}
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="mt-1 block w-full py-2 px-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor={`item-qty-${index}`} className="block text-xs font-medium text-gray-700">Qty</label>
                    <input
                      type="number"
                      id={`item-qty-${index}`}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                      min="0"
                      className="mt-1 block w-full py-2 px-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor={`item-price-${index}`} className="block text-xs font-medium text-gray-700">Unit Price (R)</label>
                    <input
                      type="number"
                      id={`item-price-${index}`}
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full py-2 px-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                    />
                  </div>
                  <div className="col-span-2 text-right">
                     <label className="block text-xs font-medium text-gray-700">Total (R)</label>
                    <p className="mt-1 text-sm py-2">{(item.quantity * item.unitPrice).toFixed(2)}</p>
                  </div>
                  <div className="col-span-1 flex items-end justify-center">
                    {newInvoiceData.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 p-1">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addItem}
                className="mt-2 inline-flex items-center px-3 py-1.5 border border-dashed border-gray-400 text-sm font-medium rounded-md text-gray-700 bg-gray-50 hover:bg-gray-100"
              >
                <PlusCircleIcon className="h-5 w-5 mr-2 text-green-500" />
                Add Line Item
              </button>
            </div>

            {/* Totals Display */}
            <div className="mt-6 border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm font-medium text-gray-700">
                <p>Subtotal:</p><p>R {subTotal.toFixed(2)}</p>
              </div>
              <div className="flex justify-between text-sm font-medium text-gray-700">
                <p>Tax ({newInvoiceData.taxRate * 100}%):</p><p>R {taxAmount.toFixed(2)}</p>
              </div>
              <hr/>
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <p>Total Amount:</p><p>R {totalAmount.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsCreateInvoiceModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInvoice}
                disabled={isSubmittingInvoice || !newInvoiceData.clientId || !newInvoiceData.projectId || newInvoiceData.items.some(item => !item.description)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmittingInvoice ? 'Saving...' : 'Save Invoice'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Invoice Details Modal - Content remains the same */}
      {isViewInvoiceModalOpen && selectedInvoiceForViewing && (
        <Modal title={`Invoice Details: ${selectedInvoiceForViewing.invoiceNumber}`} onClose={() => setIsViewInvoiceModalOpen(false)} size="3xl">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 pb-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Client Details</h3>
                <p className="text-sm text-gray-600"><strong>Name:</strong> {selectedInvoiceForViewing.clientName || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Project Details</h3>
                <p className="text-sm text-gray-600"><strong>Title:</strong> {selectedInvoiceForViewing.projectTitle || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Invoice Meta</h3>
                <p className="text-sm text-gray-600"><strong>Invoice #:</strong> {selectedInvoiceForViewing.invoiceNumber}</p>
                <p className="text-sm text-gray-600"><strong>Status:</strong>
                  <span className={`ml-2 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedInvoiceForViewing.status === InvoiceStatus.PAID ? 'bg-green-100 text-green-800' :
                      selectedInvoiceForViewing.status === InvoiceStatus.SENT ? 'bg-yellow-100 text-yellow-800' :
                      selectedInvoiceForViewing.status === InvoiceStatus.DRAFT ? 'bg-gray-200 text-gray-800' :
                      selectedInvoiceForViewing.status === InvoiceStatus.VOID ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedInvoiceForViewing.status}
                  </span>
                </p>
                <p className="text-sm text-gray-600"><strong>Issue Date:</strong> {new Date(selectedInvoiceForViewing.issueDate).toLocaleDateString()}</p>
                <p className="text-sm text-gray-600"><strong>Due Date:</strong> {new Date(selectedInvoiceForViewing.dueDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Line Items</h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price (R)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price (R)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedInvoiceForViewing.items.map((item, index) => (
                      <tr key={item.id || `item-${index}`}>
                        <td className="px-4 py-3 whitespace-normal text-sm text-gray-700">{item.description}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">R {item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">R {item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Payment Information</h3>
                    {selectedInvoiceForViewing.paymentDetails && selectedInvoiceForViewing.paymentDetails.length > 0 ? (
                        <ul className="text-sm text-gray-600 space-y-1">
                        {selectedInvoiceForViewing.paymentDetails.map(p => (
                            <li key={p.id}>Paid R {p.amountPaid.toFixed(2)} on {new Date(p.paymentDate).toLocaleDateString()} via {p.paymentMethod}</li>
                        ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500">No payment information recorded yet.</p>
                    )}
                </div>
                <div className="space-y-2 text-right">
                    <div className="flex justify-between text-md font-medium text-gray-700">
                        <p>Subtotal:</p><p>R {selectedInvoiceForViewing.subTotal.toFixed(2)}</p>
                    </div>
                    {selectedInvoiceForViewing.taxAmount !== undefined && selectedInvoiceForViewing.taxRate !== undefined && (
                        <div className="flex justify-between text-md font-medium text-gray-700">
                        <p>Tax ({selectedInvoiceForViewing.taxRate * 100}%):</p>
                        <p>R {selectedInvoiceForViewing.taxAmount.toFixed(2)}</p>
                        </div>
                    )}
                    <hr className="my-1"/>
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                        <p>Total Amount:</p><p>R {selectedInvoiceForViewing.totalAmount.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => setIsViewInvoiceModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Section 3: Generating Reports */}
      <section className="p-6 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">Generate Reports</h2>
        <p className="text-gray-600">
          This section will allow for the generation of various billing and financial reports.
        </p>
        <div className="mt-4">
            <button className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                Generate Sample Report (Coming Soon)
            </button>
        </div>
      </section>
    </div>
  );
};

export default AdminBillingPage;
