import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminDashboard from '../../components/admin/AdminDashboard';
import { AuthContext } from '../../contexts/AuthContext'; // Corrected path
import { MemoryRouter } from 'react-router-dom';
import { UserRole } from '../../types';

describe('AdminDashboard', () => {
  it('renders without crashing', () => {
    const authContextValue = {
      user: { id: 1, username: 'admin', name: 'Admin User', email: 'admin@example.com', role: UserRole.ADMIN },
      login: jest.fn(),
      logout: jest.fn(),
      token: 'test-token',
      isLoading: false,
      updateCurrentUserDetails: jest.fn(),
      activeTimerInfo: null,
      startGlobalTimer: jest.fn(),
      stopGlobalTimerAndLog: jest.fn(),
      clearGlobalTimerState: jest.fn(),
    };

    render(
      <AuthContext.Provider value={authContextValue}>
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Admin area. Select an option from the sidebar.')).toBeInTheDocument();
  });
});
