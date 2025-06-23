import React from 'react';
import { render, screen } from '@testing-library/react';
import ClientDashboard from '../../components/client/ClientDashboard';
import { AuthContext } from '../../components/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import { UserRole } from '../../types';

describe('ClientDashboard', () => {
  it('renders without crashing', () => {
    const authContextValue = {
      user: { id: 2, username: 'client', name: 'Client User', email: 'client@example.com', role: UserRole.CLIENT },
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
          <ClientDashboard />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Client area. Select an option from the sidebar.')).toBeInTheDocument();
  });
});
