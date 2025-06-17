import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'; // Using RTL conventions
import '@testing-library/jest-dom'; // For extended matchers

import AdminBillingPage from './AdminBillingPage';
import * as apiService from '../../../apiService'; // Import all exports
import { InvoiceStatus, UserRole, Invoice, Project } from '../../../types';

// Mock the entire apiService module
jest.mock('../../../apiService', () => ({
  ...jest.requireActual('../../../apiService'), // Import and retain default behavior for non-mocked parts
  fetchUsersAPI: jest.fn(),
  fetchProjectsAPI: jest.fn(),
  createInvoice: jest.fn(),
  listInvoices: jest.fn(),
  updateInvoice: jest.fn(),
  // updateFreelancerRatesAPI is not part of apiService.ts, it's a local mock in AdminBillingPage.tsx
  // We might need to mock that differently if we were testing that specific part deeply here,
  // but for now, we focus on interactions with apiService mocks.
}));

// Mock the Modal component as it's a shared component and not the focus of this test
jest.mock('../../shared/Modal', () => ({
  __esModule: true,
  default: ({ children, title, onClose }: { children: React.ReactNode, title: string, onClose: () => void}) => (
    <div data-testid="mock-modal">
      <h2>{title}</h2>
      {children}
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}));


const mockFreelancers = [
  { id: 'f1', name: 'Freelancer One', email: 'f1@test.com', role: UserRole.FREELANCER, hourlyRate: 100 },
  { id: 'f2', name: 'Freelancer Two', email: 'f2@test.com', role: UserRole.FREELANCER, hourlyRate: 120 },
];

const mockClients = [
  { id: 'c1', name: 'Client Alpha', company: 'Alpha Inc', role: UserRole.CLIENT },
  { id: 'c2', name: 'Client Beta', company: 'Beta Corp', role: UserRole.CLIENT },
];

const mockProjects = [
  { id: 'p1', title: 'Project X', clientId: 'c1', clientName: 'Client Alpha' },
  { id: 'p2', title: 'Project Y', clientId: 'c2', clientName: 'Client Beta' },
  { id: 'p3', title: 'Project Z', clientId: 'c1', clientName: 'Client Alpha' },
] as Project[]; // Cast as Project[] to satisfy type, more fields would exist in reality

const mockInvoicesList: Invoice[] = [
  {
    id: 'inv1', invoiceNumber: 'INV-001', clientId: 'c1', clientName: 'Client Alpha', projectId: 'p1', projectTitle: 'Project X',
    issueDate: '2024-01-15', dueDate: '2024-02-14', items: [{id: 'i1', description: 'Task 1', quantity: 10, unitPrice: 50, totalPrice: 500}],
    subTotal: 500, taxRate: 0.1, taxAmount: 50, totalAmount: 550, status: InvoiceStatus.DRAFT,
    createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: 'inv2', invoiceNumber: 'INV-002', clientId: 'c2', clientName: 'Client Beta', projectId: 'p2', projectTitle: 'Project Y',
    issueDate: '2024-01-20', dueDate: '2024-02-19', items: [{id: 'i2', description: 'Task 2', quantity: 5, unitPrice: 80, totalPrice: 400}],
    subTotal: 400, taxRate: 0.1, taxAmount: 40, totalAmount: 440, status: InvoiceStatus.SENT,
    createdAt: '2024-01-20T00:00:00Z', updatedAt: '2024-01-20T00:00:00Z'
  },
];

describe('AdminBillingPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (apiService.fetchUsersAPI as jest.Mock).mockClear();
    (apiService.fetchProjectsAPI as jest.Mock).mockClear();
    (apiService.createInvoice as jest.Mock).mockClear();
    (apiService.listInvoices as jest.Mock).mockClear();
    (apiService.updateInvoice as jest.Mock).mockClear();

    // Setup default mock implementations
    (apiService.fetchUsersAPI as jest.Mock).mockImplementation(async (role?: UserRole) => {
      if (role === UserRole.FREELANCER) return Promise.resolve(mockFreelancers);
      if (role === UserRole.CLIENT) return Promise.resolve(mockClients);
      return Promise.resolve([]);
    });
    (apiService.fetchProjectsAPI as jest.Mock).mockResolvedValue(mockProjects);
    (apiService.listInvoices as jest.Mock).mockResolvedValue(mockInvoicesList);
    (apiService.createInvoice as jest.Mock).mockImplementation(async (data) => Promise.resolve({ ...data, id: `new-${Date.now()}`, invoiceNumber: `INV-NEW`, status: InvoiceStatus.DRAFT, items: data.items.map((item: any, idx: number) => ({...item, id:`newItem-${idx}`, totalPrice: item.quantity * item.unitPrice})), subTotal: 0, taxAmount:0, totalAmount:0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    (apiService.updateInvoice as jest.Mock).mockImplementation(async (id, data) => Promise.resolve({ ...mockInvoicesList.find(inv => inv.id === id), ...data, updatedAt: new Date().toISOString() }));

  });

  test('renders without crashing and shows main sections', async () => {
    render(<AdminBillingPage />);
    expect(screen.getByText('Billing Management')).toBeInTheDocument();
    expect(screen.getByText('Manage Freelancer Rates')).toBeInTheDocument();
    expect(screen.getByText('View & Manage Invoices')).toBeInTheDocument();

    // Wait for initial data load
    await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalledTimes(1));
    // await waitFor(() => expect(apiService.fetchUsersAPI).toHaveBeenCalledWith(UserRole.FREELANCER)); // Mock for freelancers is local to component
  });

  describe('Invoice Creation Modal', () => {
    test('opens and closes the create invoice modal', async () => {
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled()); // Ensure page loaded

      fireEvent.click(screen.getByText('Create New Invoice'));
      expect(screen.getByTestId('mock-modal')).toBeVisible();
      expect(screen.getByText('Create New Invoice', { selector: 'h2' })).toBeInTheDocument(); // Modal title

      fireEvent.click(screen.getByText('Close Modal')); // Assuming Modal has a close button
      await waitFor(() => expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument());
    });

    test('form input changes update state, calculates totals', async () => {
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());
      fireEvent.click(screen.getByText('Create New Invoice'));

      // Wait for dependent API calls for clients and projects
      await waitFor(() => expect(apiService.fetchUsersAPI).toHaveBeenCalledWith(UserRole.CLIENT));
      await waitFor(() => expect(apiService.fetchProjectsAPI).toHaveBeenCalled());

      // Client and Project selection
      const clientSelect = screen.getByLabelText('Client') as HTMLSelectElement;
      fireEvent.change(clientSelect, { target: { value: 'c1' } });
      expect(clientSelect.value).toBe('c1');
      // Project select would then populate based on client c1

      // Dates
      const issueDateInput = screen.getByLabelText('Issue Date') as HTMLInputElement;
      fireEvent.change(issueDateInput, { target: { value: '2024-03-01' } });
      expect(issueDateInput.value).toBe('2024-03-01');

      // Line items
      const descriptionInput = screen.getByPlaceholderText('Item description') as HTMLInputElement;
      fireEvent.change(descriptionInput, { target: { value: 'Design Work' } });
      expect(descriptionInput.value).toBe('Design Work');

      const qtyInput = screen.getByLabelText('Qty') as HTMLInputElement;
      fireEvent.change(qtyInput, { target: { value: '5' } });

      const unitPriceInput = screen.getByLabelText('Unit Price (R)') as HTMLInputElement;
      fireEvent.change(unitPriceInput, { target: { value: '150' } });

      // Check dynamic total for line item (5 * 150 = 750)
      // This requires the component to re-render and display the calculation.
      // The text might be part of a more complex structure.
      await waitFor(() => {
        const itemTotalText = screen.getAllByText('750.00'); // Could be multiple if subtotal/total also match
        expect(itemTotalText.length).toBeGreaterThanOrEqual(1);
      });

      // Check overall totals (Subtotal: 750, Tax (15%): 112.50, Total: 862.50)
      // These are also dynamic based on items and tax rate.
      expect(screen.getByText('R 750.00')).toBeInTheDocument(); // Subtotal
      expect(screen.getByText('R 112.50')).toBeInTheDocument(); // Tax
      expect(screen.getByText('R 862.50')).toBeInTheDocument(); // Grand Total
    });

    test('submits new invoice data and calls createInvoice API', async () => {
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());
      fireEvent.click(screen.getByText('Create New Invoice'));

      await waitFor(() => expect(apiService.fetchUsersAPI).toHaveBeenCalledWith(UserRole.CLIENT));
      await waitFor(() => expect(apiService.fetchProjectsAPI).toHaveBeenCalled());

      fireEvent.change(screen.getByLabelText('Client'), { target: { value: 'c1' } });
      // Wait for projects to filter based on client selection
      await waitFor(() => { /* Projects for c1 should be available */ });
      fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'p1' } });
      fireEvent.change(screen.getByLabelText('Issue Date'), { target: { value: '2024-03-10' } });
      fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2024-04-09' } });
      fireEvent.change(screen.getByPlaceholderText('Item description'), { target: { value: 'Dev Work' } });
      fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '20' } });
      fireEvent.change(screen.getByLabelText('Unit Price (R)'), { target: { value: '80' } }); // 20 * 80 = 1600

      fireEvent.click(screen.getByText('Save Invoice'));

      await waitFor(() => expect(apiService.createInvoice).toHaveBeenCalledTimes(1));
      expect(apiService.createInvoice).toHaveBeenCalledWith(expect.objectContaining({
        clientId: 'c1',
        projectId: 'p1',
        issueDate: '2024-03-10',
        dueDate: '2024-04-09',
        items: expect.arrayContaining([
          expect.objectContaining({ description: 'Dev Work', quantity: 20, unitPrice: 80 })
        ]),
        taxRate: 0.15, // Default tax rate
      }));
    });
  });

  describe('Invoice Listing, Filtering, and Sorting', () => {
    test('displays invoices in the table', async () => {
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());
      expect(screen.getByText('INV-001')).toBeInTheDocument();
      expect(screen.getByText('Client Alpha')).toBeInTheDocument(); // From inv1
      expect(screen.getByText('INV-002')).toBeInTheDocument();
      expect(screen.getByText('Client Beta')).toBeInTheDocument(); // From inv2
    });

    test('filters invoices by status', async () => {
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());

      const statusFilterSelect = screen.getByLabelText('Filter by Status:') as HTMLSelectElement;
      fireEvent.change(statusFilterSelect, { target: { value: InvoiceStatus.DRAFT } });

      await waitFor(() => {
        expect(screen.getByText('INV-001')).toBeInTheDocument(); // Draft
        expect(screen.queryByText('INV-002')).not.toBeInTheDocument(); // Sent
      });
    });

    test('sorts invoices by invoice number', async () => {
      // Assuming mockInvoicesList is [INV-001, INV-002] initially
      // and default sort is by issueDate descending.
      // We need more controlled mock data for predictable sort tests or ensure mock data is sorted.
      (apiService.listInvoices as jest.Mock).mockResolvedValue([mockInvoicesList[1], mockInvoicesList[0]]); // INV-002 then INV-001

      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());

      // First item in table should be INV-002
      let rows = screen.getAllByRole('row');
      expect(rows[1].textContent).toContain('INV-002'); // Header is row[0]

      const invoiceNumberHeader = screen.getByText('Invoice #');
      fireEvent.click(invoiceNumberHeader); // Sort ascending by invoiceNumber

      await waitFor(() => {
        rows = screen.getAllByRole('row');
        expect(rows[1].textContent).toContain('INV-001'); // Now INV-001 should be first
        expect(rows[2].textContent).toContain('INV-002');
      });

      fireEvent.click(invoiceNumberHeader); // Sort descending by invoiceNumber
       await waitFor(() => {
        rows = screen.getAllByRole('row');
        expect(rows[1].textContent).toContain('INV-002');
        expect(rows[2].textContent).toContain('INV-001');
      });
    });
  });

  describe('Invoice Actions', () => {
    // Mock window.confirm for void action
    const mockConfirm = jest.spyOn(window, 'confirm');

    beforeEach(() => {
        mockConfirm.mockClear();
    });

    test('Send Invoice action calls updateInvoice with SENT status', async () => {
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());

      // Find the "Send Invoice" button for the DRAFT invoice (INV-001)
      // This requires buttons to be uniquely identifiable or by using query selectors carefully
      const sendButtons = screen.getAllByTitle('Send Invoice'); // Assuming icons have titles
      fireEvent.click(sendButtons[0]); // Click the first one (should be for INV-001)

      await waitFor(() => expect(apiService.updateInvoice).toHaveBeenCalledWith('inv1', { status: InvoiceStatus.SENT }));
    });

    test('Mark as Paid action calls updateInvoice with PAID status', async () => {
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());

      const markPaidButtons = screen.getAllByTitle('Mark as Paid'); // For INV-002 (SENT)
      fireEvent.click(markPaidButtons[0]);

      await waitFor(() => expect(apiService.updateInvoice).toHaveBeenCalledWith('inv2', { status: InvoiceStatus.PAID }));
    });

    test('Void Invoice action calls updateInvoice with VOID status after confirmation', async () => {
      mockConfirm.mockReturnValue(true); // Simulate user confirming
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());

      const voidButtons = screen.getAllByTitle('Void Invoice');
      // Let's void the first DRAFT invoice (INV-001)
      // Need to ensure we click the correct void button. The first getAllByTitle might be for INV-001.
      fireEvent.click(voidButtons[0]);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(apiService.updateInvoice).toHaveBeenCalledWith('inv1', { status: InvoiceStatus.VOID }));
    });

    test('Void Invoice action does NOT call updateInvoice if confirmation is cancelled', async () => {
      mockConfirm.mockReturnValue(false); // Simulate user cancelling
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());

      const voidButtons = screen.getAllByTitle('Void Invoice');
      fireEvent.click(voidButtons[0]);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(apiService.updateInvoice).not.toHaveBeenCalled();
    });

    test('Edit Invoice button shows placeholder alert', async () => {
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());

      const editButtons = screen.getAllByTitle('Edit Invoice');
      fireEvent.click(editButtons[0]); // For INV-001 (DRAFT)

      expect(mockAlert).toHaveBeenCalledWith('Edit functionality to be implemented.');
      mockAlert.mockRestore();
    });
  });
});

// Note: These tests use @testing-library/react for rendering and interaction.
// They also rely heavily on the mocks of apiService.ts functions.
// More complex scenarios, like specific API error handling or detailed UI state transitions
// not directly tied to API calls, might require more intricate tests.
// The freelancer rates part is less tested here as its API is local to AdminBillingPage.
// Testing sorting thoroughly requires more controlled mock data for `listInvoices`.
// The `act` wrapper might be needed around state updates that cause re-renders if not covered by RTL's async utils.
// For example, `await act(async () => { fireEvent.click(...) });`
// RTL's `waitFor` usually handles this well for async operations.
