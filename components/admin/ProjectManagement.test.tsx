import React from 'react';
<<<<<<< Updated upstream
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
=======
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      <AuthContext.Provider value={{ user: mockAdminUser, login: jest.fn(), logout: jest.fn(), isLoading: false, activeTimerInfo: null, startGlobalTimer: jest.fn(), stopGlobalTimerAndLog: jest.fn(), fetchCurrentUser: jest.fn() }}>
=======
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
>>>>>>> Stashed changes
        <ToastProvider>
          <ProjectManagement />
        </ToastProvider>
      </AuthContext.Provider>
    </HashRouter>
  );
};

// Helper to find modal buttons more reliably
<<<<<<< Updated upstream
const getButtonInModal = (name: RegExp) => {
  const buttons = screen.getAllByRole('button');
  // This is a simple heuristic; might need refinement based on actual modal structure
  // It assumes the modal is one of the last complex elements rendered.
  return buttons.find(button => name.test(button.textContent || ''));
=======
const getButtonInModal = async (modalTitle: RegExp, buttonName: RegExp) => {
  // Wait for the modal with the specific title to be present
  const modal = await screen.findByRole('dialog', { name: modalTitle });
  // Then find the button within that modal
  return within(modal).getByRole('button', { name: buttonName });
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
    // Wait for initial loading to complete
    await waitFor(() => expect(screen.queryByText(/Loading projects.../i)).not.toBeInTheDocument());

>>>>>>> Stashed changes
    await act(async () => {
      fireEvent.click(screen.getByText(/Create Project/i));
    });

    await screen.findByLabelText(/Project Title/i); // Wait for modal to open

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Project Title/i), { target: { value: 'New Test Project' } });
      fireEvent.change(screen.getByLabelText(/Project Description/i), { target: { value: 'A description' } });
<<<<<<< Updated upstream
      fireEvent.click(getButtonInModal(/Create Project/i)!);
=======
      // More specific modal and button targeting
      const createButtonInModal = await getButtonInModal(/Create New Project/i, /Create Project/i);
      fireEvent.click(createButtonInModal);
>>>>>>> Stashed changes
    });

    await waitFor(() => expect(apiService.createProjectAPI).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('Project created successfully.', 'success'));
  });

  test('handleCreateProject should call addToast with error on failed API call', async () => {
    const errorMessage = 'Network Error';
    (apiService.createProjectAPI as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    renderProjectManagement();
<<<<<<< Updated upstream
=======
    // Wait for initial loading to complete
    await waitFor(() => expect(screen.queryByText(/Loading projects.../i)).not.toBeInTheDocument());

>>>>>>> Stashed changes
    await act(async () => {
      fireEvent.click(screen.getByText(/Create Project/i));
    });
    await screen.findByLabelText(/Project Title/i);

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Project Title/i), { target: { value: 'Error Project' } });
      fireEvent.change(screen.getByLabelText(/Project Description/i), { target: { value: 'Desc' } });
<<<<<<< Updated upstream
      fireEvent.click(getButtonInModal(/Create Project/i)!);
=======
      // More specific modal and button targeting
      const createButtonInModal = await getButtonInModal(/Create New Project/i, /Create Project/i);
      fireEvent.click(createButtonInModal);
>>>>>>> Stashed changes
    });

    await waitFor(() => expect(apiService.createProjectAPI).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith(errorMessage, 'error'));
  });

  test('handleUpdateProjectDetails should call addToast with success on successful API call', async () => {
    (apiService.fetchProjectsAPI as jest.Mock).mockResolvedValueOnce([
      { id: 1, title: 'Test Project to Edit', description: 'Initial Description', status: ProjectStatus.OPEN, client_id: 1, client_username: 'Client A', freelancer_id: null, freelancer_username: null, created_at: new Date().toISOString(), skills_required: [] }
    ]);
    (apiService.updateProjectAPI as jest.Mock).mockResolvedValueOnce({ message: 'Project updated' });

    renderProjectManagement();
    await screen.findByText('Test Project to Edit');

    await act(async () => {
      fireEvent.click(screen.getAllByLabelText(/View Details/i)[0]);
    });

    await screen.findByLabelText('Title*');
    await act(async () => {
<<<<<<< Updated upstream
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Updated Description' } });
      fireEvent.click(getButtonInModal(/Save Changes/i)!);
=======
      // Target description within the edit modal specifically
      const modal = await screen.findByRole('dialog', { name: /Edit Project: Test Project to Edit/i });
      fireEvent.change(within(modal).getByLabelText(/Description/i), { target: { value: 'Updated Description' } });
      const saveButtonInModal = await getButtonInModal(/Edit Project: Test Project to Edit/i, /Save Changes/i);
      fireEvent.click(saveButtonInModal);
>>>>>>> Stashed changes
    });

    await waitFor(() => expect(apiService.updateProjectAPI).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('Project details updated successfully.', 'success'));
  });

  test('handleUpdateProjectDetails should call addToast with error on failed API call', async () => {
    const errorMessage = 'Update Failed';
    (apiService.fetchProjectsAPI as jest.Mock).mockResolvedValueOnce([
      { id: 1, title: 'Test Project Update Fail', description: 'Desc', status: ProjectStatus.OPEN, client_id: 1, skills_required: [] }
    ]);
    (apiService.updateProjectAPI as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    renderProjectManagement();
    await screen.findByText('Test Project Update Fail');
    await act(async () => {
       fireEvent.click(screen.getAllByLabelText(/View Details/i)[0]);
    });

    await screen.findByLabelText('Title*');
    await act(async () => {
<<<<<<< Updated upstream
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Attempted Update' } });
      fireEvent.click(getButtonInModal(/Save Changes/i)!);
=======
      // Target description within the edit modal specifically
      const modal = await screen.findByRole('dialog', { name: /Edit Project: Test Project Update Fail/i });
      fireEvent.change(within(modal).getByLabelText(/Description/i), { target: { value: 'Attempted Update' } });
      const saveButtonInModal = await getButtonInModal(/Edit Project: Test Project Update Fail/i, /Save Changes/i);
      fireEvent.click(saveButtonInModal);
>>>>>>> Stashed changes
    });

    await waitFor(() => expect(apiService.updateProjectAPI).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith(errorMessage, 'error'));
  });

});
