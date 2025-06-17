import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // Added within
import '@testing-library/jest-dom';
import { vi } from 'vitest';

import AdminBillingPage from './AdminBillingPage';
import * as apiService from '../../../apiService';
import { InvoiceStatus, UserRole, Invoice, Project } from '../../../types';

vi.mock('../../../apiService', async (importOriginal) => {
  const actual = await importOriginal() as typeof apiService;
  return {
    ...actual,
    fetchUsersAPI: vi.fn(),
    fetchProjectsAPI: vi.fn(),
    createInvoice: vi.fn(),
    listInvoices: vi.fn(),
    updateInvoice: vi.fn(),
  };
});

vi.mock('../../shared/Modal', () => ({
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
];
const mockClients = [
  { id: 'c1', name: 'Client Alpha', company: 'Alpha Inc', role: UserRole.CLIENT },
];
const mockProjects = [
  { id: 'p1', title: 'Project X', clientId: 'c1', clientName: 'Client Alpha' },
] as Project[];

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
  let alertSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(apiService.fetchUsersAPI).mockClear();
    vi.mocked(apiService.fetchProjectsAPI).mockClear();
    vi.mocked(apiService.createInvoice).mockClear();
    vi.mocked(apiService.listInvoices).mockClear();
    vi.mocked(apiService.updateInvoice).mockClear();

    vi.mocked(apiService.fetchUsersAPI).mockImplementation(async (role?: UserRole) => {
      if (role === UserRole.FREELANCER) return Promise.resolve(mockFreelancers);
      if (role === UserRole.CLIENT) return Promise.resolve(mockClients);
      return Promise.resolve([]);
    });
    vi.mocked(apiService.fetchProjectsAPI).mockResolvedValue(mockProjects);
    // Return a fresh copy of mockInvoicesList for each test to avoid modification across tests
    vi.mocked(apiService.listInvoices).mockResolvedValue(mockInvoicesList.map(inv => ({...inv})));
    vi.mocked(apiService.createInvoice).mockImplementation(async (data) => Promise.resolve({ ...data, id: `new-${Date.now()}`, invoiceNumber: `INV-NEW`, status: InvoiceStatus.DRAFT, items: data.items.map((item: any, idx: number) => ({...item, id:`newItem-${idx}`, totalPrice: item.quantity * item.unitPrice})), subTotal: 0, taxAmount:0, totalAmount:0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Invoice));
    vi.mocked(apiService.updateInvoice).mockImplementation(async (id, data) => {
        const currentInvoice = mockInvoicesList.find(inv => inv.id === id);
        return Promise.resolve({ ...currentInvoice, ...data, updatedAt: new Date().toISOString() } as Invoice);
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  test('renders without crashing and shows main sections', async () => {
    render(<AdminBillingPage />);
    expect(screen.getByText('Billing Management')).toBeInTheDocument();
    await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalledTimes(1));
  });

  // Other describe blocks for Invoice Creation, Listing, Filtering are omitted for brevity
  // but should be kept in the actual file.

  describe('Invoice Actions', () => {
    let mockConfirm: ReturnType<typeof vi.spyOn<typeof window, 'confirm'>>;

    beforeEach(() => {
        mockConfirm = vi.spyOn(window, 'confirm');
    });
    afterEach(() => {
        mockConfirm.mockRestore();
    });

    test('Send Invoice action calls updateInvoice with SENT status', async () => {
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());

      const inv1Row = screen.getByText('INV-001').closest('tr');
      if (!inv1Row) throw new Error('Row for INV-001 not found');
      const sendButtonInv1 = within(inv1Row).getByTitle('Send Invoice');
      fireEvent.click(sendButtonInv1);
      await waitFor(() => expect(apiService.updateInvoice).toHaveBeenCalledWith('inv1', { status: InvoiceStatus.SENT }));
    });

    test('Mark as Paid action calls updateInvoice with PAID status', async () => {
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());

      const inv2Row = screen.getByText('INV-002').closest('tr');
      if (!inv2Row) throw new Error('Row for INV-002 not found');
      const markPaidButtonInv2 = within(inv2Row).getByTitle('Mark as Paid');
      fireEvent.click(markPaidButtonInv2);
      await waitFor(() => expect(apiService.updateInvoice).toHaveBeenCalledWith('inv2', { status: InvoiceStatus.PAID }));
    });

    test('Void Invoice action calls updateInvoice with VOID status after confirmation', async () => {
      mockConfirm.mockReturnValue(true);
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());

      const inv1Row = screen.getByText('INV-001').closest('tr');
      if (!inv1Row) throw new Error('Row for INV-001 not found');
      const voidButtonInv1 = within(inv1Row).getByTitle('Void Invoice');
      fireEvent.click(voidButtonInv1);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(apiService.updateInvoice).toHaveBeenCalledWith('inv1', { status: InvoiceStatus.VOID }));
    });

    test('Void Invoice action does NOT call updateInvoice if confirmation is cancelled', async () => {
      mockConfirm.mockReturnValue(false);
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());

      const inv1Row = screen.getByText('INV-001').closest('tr');
      if (!inv1Row) throw new Error('Row for INV-001 not found');
      const voidButtonInv1 = within(inv1Row).getByTitle('Void Invoice');
      fireEvent.click(voidButtonInv1);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(apiService.updateInvoice).not.toHaveBeenCalled();
    });

    test('Edit Invoice button shows placeholder alert', async () => {
      render(<AdminBillingPage />);
      await waitFor(() => expect(apiService.listInvoices).toHaveBeenCalled());

      const inv1Row = screen.getByText('INV-001').closest('tr');
      if (!inv1Row) throw new Error('Row for INV-001 not found');
      const editButtonInv1 = within(inv1Row).getByTitle('Edit Invoice');
      fireEvent.click(editButtonInv1);

      expect(alertSpy).toHaveBeenCalledWith('Edit functionality to be implemented.');
    });
  });
});
