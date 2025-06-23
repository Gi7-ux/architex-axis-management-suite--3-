import React from 'react';
import { render, screen } from '@testing-library/react';
import FreelancerDashboard from '../../components/freelancer/FreelancerDashboard';
import { AuthContext } from '../../components/AuthContext';
import { MemoryRouter } from 'react-router-dom';
import { UserRole } from '../../types';

describe('FreelancerDashboard', () => {
  it('renders without crashing', () => {
    const authContextValue = {
      user: { id: 3, username: 'freelancer', name: 'Freelancer User', email: 'freelancer@example.com', role: UserRole.FREELANCER },
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
          <FreelancerDashboard />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Freelancer area. Select an option from the sidebar.')).toBeInTheDocument();
  });
});
