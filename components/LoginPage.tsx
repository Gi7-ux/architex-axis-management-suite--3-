import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Corrected path
import Button from './shared/Button';
import { UserRole } from '../types';
import { APP_NAME, NAV_LINKS } from '../constants';
import { ApiError } from '../apiService'; // Import ApiError

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || NAV_LINKS.DASHBOARD_OVERVIEW;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    try {
      // The login function from useAuth now expects UserLoginData: {email, password}
      const user = await login({ email, password }); // Pass as an object
      if (user) {
        // User object here is AuthUser
        if (user.role === UserRole.ADMIN) {
          setError('Administrators must use the Admin Portal login.');
          // navigate(NAV_LINKS.ADMIN_LOGIN); // Keep if admin login is separate
          return;
        }
        navigate(from, { replace: true });
      } else {
        // This case might not be reached if login throws ApiError for failed attempts
        setError('Login failed. Please check your credentials.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Login failed. Please check your credentials.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error("Login page error:", err);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: "linear-gradient(to bottom right, var(--color-primary-extralight), var(--color-accent)), url('data:image/svg+xml;charset=UTF-8,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'blueprint\' patternUnits=\'userSpaceOnUse\' width=\'100\' height=\'100\' fill=\'rgba(74,131,121,0.05)\'%3E%3Cpath d=\'M0 50h100M50 0v100\' stroke-width=\'1\' stroke=\'rgba(74,131,121,0.1)\'/%3E%3Cpath d=\'M0 10h100M10 0v100M0 20h100M20 0v100M0 30h100M30 0v100M0 40h100M40 0v100M0 60h100M60 0v100M0 70h100M70 0v100M0 80h100M80 0v100M0 90h100M90 0v100\' stroke-width=\'0.5\' stroke=\'rgba(74,131,121,0.08)\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23blueprint)\'/%3E%3C/svg%3E')" }}>
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-500 hover:shadow-2xl">
        <div className="text-center mb-8">
          <img src="/logo-silhouette.png" alt="Architex Axis Logo Silhouette" className="w-24 h-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-primary font-logo">{APP_NAME}</h1>
          <p className="text-gray-500 mt-1">Access your architectural project hub.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}

          <div>
            <Button type="submit" className="w-full !py-2.5" isLoading={isLoading} variant="primary">
              Sign In
            </Button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          Administrator? <Link to={NAV_LINKS.ADMIN_LOGIN} className="font-medium text-primary hover:text-primary-hover">Admin Login</Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-500">
          Don't have an account? <Link to="/register" className="font-medium text-primary hover:text-primary-hover">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
