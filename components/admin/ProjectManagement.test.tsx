import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { AuthContext, AuthUser } from '../AuthContext'; // Adjusted AuthUser import
import { ToastProvider } from '../shared/toast/ToastContext';
import ProjectManagement from './ProjectManagement';
import * as apiService from '../../apiService';
import * as toastHook from '../shared/toast/useToast';
import { ProjectStatus, UserRole } from '../../types'; // For ProjectStatus enum

// Mock API services
jest.mock('../../apiService', () => ({
  ...jest.requireActual('../../apiService'),
  fetchProjectsAPI: jest.fn().mockResolvedValue([]),
  adminFetchAllUsersAPI: jest.fn().mockResolvedValue([]),
  fetchAllSkillsAPI: jest.fn().mockResolvedValue([]),
  createProjectAPI: jest.fn(),
  updateProjectAPI: jest.fn(),
  fetchProjectDetailsAPI: jest.fn(),
  fetchApplicationsForProjectAPI: jest.fn().mockResolvedValue([]),
  deleteProjectAPI: jest.fn(), // Added for potential delete tests
  updateApplicationStatusAPI: jest.fn(), // Added for potential app status tests
}));

// Mock useToast
const mockAddToast = jest.fn();
jest.mock('../shared/toast/useToast', () => ({
  useToast: () => ({
    addToast: mockAddToast,
    removeToast: jest.fn(),
    toasts: [],
  }),
}));

const mockAdminUser: AuthUser = {
  id: 1,
  username: 'Test Admin',
  email: 'admin@example.com',
  role: UserRole.ADMIN, // Use UserRole enum
};

const renderProjectManagement = () => {
  return render(
    <HashRouter>
      <AuthContext.Provider value={{ 
        user: mockAdminUser, 
        token: 'mock-token', // Added
        login: jest.fn(), 
        logout: jest.fn(), 
        isLoading: false, 
        updateCurrentUserDetails: jest.fn().mockResolvedValue(true), // Added
        activeTimerInfo: null, 
        startGlobalTimer: jest.fn(), 
        stopGlobalTimerAndLog: jest.fn(),
        clearGlobalTimerState: jest.fn() // Added
      }}>
        <ToastProvider>
          <ProjectManagement />
        </ToastProvider>
      </AuthContext.Provider>
    </HashRouter>
  );
};

// Helper to find modal buttons more reliably
const getButtonInModal = async (modalTitle: RegExp, buttonName: RegExp) => {
  // Find the h3 element that serves as the visual title of the modal
  const titleElement = await screen.findByRole('heading', { name: modalTitle, level: 3 });
  // Traverse to the modal content container.
  // The structure is: div.fixed -> div.bg-white -> (div.header (with h3), div.content (with form))
  const modalContentContainer = titleElement.closest('div[class*="bg-white rounded-xl"]');
  if (!modalContentContainer) {
    throw new Error(`Modal content container not found for title: ${modalTitle}`);
  }
  // The form and buttons are typically inside the second child of modalContentContainer (the p-6 div)
  // but searching within modalContentContainer should be sufficient.
  return within(modalContentContainer).getByRole('button', { name: buttonName });
};


describe('ProjectManagement Component - Toast Interactions', () => {
  beforeEach(() => {
    mockAddToast.mockClear();
    (apiService.createProjectAPI as jest.Mock).mockClear();
    (apiService.updateProjectAPI as jest.Mock).mockClear();
    (apiService.deleteProjectAPI as jest.Mock).mockClear();
    (apiService.fetchProjectsAPI as jest.Mock).mockResolvedValue([]);
    (apiService.adminFetchAllUsersAPI as jest.Mock).mockResolvedValue([]);
    (apiService.fetchAllSkillsAPI as jest.Mock).mockResolvedValue([]);
    (apiService.fetchProjectDetailsAPI as jest.Mock).mockResolvedValue(
      { id: 1, title: 'Initial Project', description: 'Desc', status: ProjectStatus.OPEN, client_id: 1, skills_required: [] }
    );
  });

  test('handleCreateProject should call addToast with success on successful API call', async () => {
    (apiService.createProjectAPI as jest.Mock).mockResolvedValueOnce({ message: 'Project created', project_id: 1 });

    renderProjectManagement();

    // Wait for initial loading to complete
    await waitFor(() => expect(screen.queryByText(/Loading projects.../i)).not.toBeInTheDocument());

    await act(async () => {
      // Target the main "Create Project" button more specifically if needed,
      // but often the first one found by this text outside a dialog is the correct one.
      const mainCreateButton = screen.getAllByText(/Create Project/i).find(
        // Heuristic: the main button is likely a direct child of a div, not nested deep within a form/dialog
        // This could be improved with a more specific data-testid if available on the button
        (btn) => btn.closest('form') === null && btn.closest('div[role="dialog"]') === null
      );
      fireEvent.click(mainCreateButton || screen.getByText(/Create Project/i)); // Fallback if heuristic fails
    });

    await screen.findByLabelText(/Project Title/i); // Wait for modal to open

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Project Title/i), { target: { value: 'New Test Project' } });
      fireEvent.change(screen.getByLabelText(/Project Description/i), { target: { value: 'A description' } });
      // More specific modal and button targeting
      const createButtonInModal = await getButtonInModal(/Create New Project \(Admin\)/i, /Create Project/i);
      fireEvent.click(createButtonInModal);
    });

    await waitFor(() => expect(apiService.createProjectAPI).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('Project created successfully.', 'success'));
  });

  test('handleCreateProject should call addToast with error on failed API call', async () => {
    const errorMessage = 'Network Error';
    (apiService.createProjectAPI as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    renderProjectManagement();
    // Wait for initial loading to complete
    await waitFor(() => expect(screen.queryByText(/Loading projects.../i)).not.toBeInTheDocument());

    await act(async () => {
       const mainCreateButton = screen.getAllByText(/Create Project/i).find(
        (btn) => btn.closest('form') === null && btn.closest('div[role="dialog"]') === null
      );
      fireEvent.click(mainCreateButton || screen.getByText(/Create Project/i));
    });
    await screen.findByLabelText(/Project Title/i);

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Project Title/i), { target: { value: 'Error Project' } });
      fireEvent.change(screen.getByLabelText(/Project Description/i), { target: { value: 'Desc' } });
      // More specific modal and button targeting
      const createButtonInModal = await getButtonInModal(/Create New Project \(Admin\)/i, /Create Project/i);
      fireEvent.click(createButtonInModal);
    });

    await waitFor(() => expect(apiService.createProjectAPI).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith(errorMessage, 'error'));
  });

  test('handleUpdateProjectDetails should call addToast with success on successful API call', async () => {
    const projectToEdit = { id: 1, title: 'Test Project to Edit', description: 'Initial Description', status: ProjectStatus.OPEN, client_id: 1, client_username: 'Client A', freelancer_id: null, freelancer_username: null, created_at: new Date().toISOString(), skills_required: [] };
    (apiService.fetchProjectsAPI as jest.Mock).mockResolvedValueOnce([projectToEdit]);
    // Ensure fetchProjectDetailsAPI returns the specific project being edited for this test
    (apiService.fetchProjectDetailsAPI as jest.Mock).mockResolvedValueOnce(projectToEdit);
    (apiService.updateProjectAPI as jest.Mock).mockResolvedValueOnce({ message: 'Project updated' });

    renderProjectManagement();
    await screen.findByText('Test Project to Edit');

    await act(async () => {
      fireEvent.click(screen.getAllByLabelText(/View Details/i)[0]);
    });

    await screen.findByLabelText('Title*');
    await act(async () => {
      // Target description within the edit modal specifically
      // First, ensure the modal is found by its title (h3)
      const titleElement = await screen.findByRole('heading', { name: /Edit Project: Test Project to Edit/i, level: 3 });
      const modalContentContainer = titleElement.closest('div[class*="bg-white rounded-xl"]');
      expect(modalContentContainer).toBeInTheDocument();

      fireEvent.change(within(modalContentContainer!).getByLabelText(/Description/i), { target: { value: 'Updated Description' } });
      const saveButtonInModal = await getButtonInModal(/Edit Project: Test Project to Edit/i, /Save Changes/i);
      fireEvent.click(saveButtonInModal);
    });

    await waitFor(() => expect(apiService.updateProjectAPI).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('Project details updated successfully.', 'success'));
  });

  test('handleUpdateProjectDetails should call addToast with error on failed API call', async () => {
    const errorMessage = 'Update Failed';
    const projectToEditFail = { id: 1, title: 'Test Project Update Fail', description: 'Desc', status: ProjectStatus.OPEN, client_id: 1, skills_required: [] };
    (apiService.fetchProjectsAPI as jest.Mock).mockResolvedValueOnce([projectToEditFail]);
    // Ensure fetchProjectDetailsAPI returns the specific project for this test
    (apiService.fetchProjectDetailsAPI as jest.Mock).mockResolvedValueOnce(projectToEditFail);
    (apiService.updateProjectAPI as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    renderProjectManagement();
    await screen.findByText('Test Project Update Fail');
    await act(async () => {
       fireEvent.click(screen.getAllByLabelText(/View Details/i)[0]);
    });

    await screen.findByLabelText('Title*');
    await act(async () => {
      // Target description within the edit modal specifically
      const titleElement = await screen.findByRole('heading', { name: /Edit Project: Test Project Update Fail/i, level: 3 });
      const modalContentContainer = titleElement.closest('div[class*="bg-white rounded-xl"]');
      expect(modalContentContainer).toBeInTheDocument();

      fireEvent.change(within(modalContentContainer!).getByLabelText(/Description/i), { target: { value: 'Attempted Update' } });
      const saveButtonInModal = await getButtonInModal(/Edit Project: Test Project Update Fail/i, /Save Changes/i);
      fireEvent.click(saveButtonInModal);
    });

    await waitFor(() => expect(apiService.updateProjectAPI).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith(errorMessage, 'error'));
  });

});
