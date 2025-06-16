import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerAPI, UserRegistrationData, ApiError } from '../apiService';
import { UserRole } from '../types';
import Button from './shared/Button';
import { APP_NAME, NAV_LINKS } from '../constants';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.FREELANCER);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!username || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    const registrationData: UserRegistrationData = { username, email, password, role };

    try {
      const response = await registerAPI(registrationData);
      setSuccessMessage(response.message + " You can now log in.");
      // Optionally redirect to login after a delay or clear form
      setTimeout(() => navigate(NAV_LINKS.LOGIN), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Registration failed. Please try again.');
      } else {
        setError('An unexpected error occurred during registration.');
      }
      console.error("Registration page error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary font-logo">{APP_NAME} - Register</h1>
          <p className="text-gray-500 mt-1">Create your account.</p>
        </div>

        {successMessage && <p className="mb-4 text-sm text-green-600 bg-green-100 p-3 rounded-lg">{successMessage}</p>}
        {error && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
            <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"/>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"/>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"/>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"/>
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Register as</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} required className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white">
              <option value={UserRole.FREELANCER}>Freelancer</option>
              <option value={UserRole.CLIENT}>Client</option>
              {/* <option value={UserRole.ADMIN}>Admin</option> */} {/* Usually admin registration is handled separately */}
            </select>
          </div>
          <div>
            <Button type="submit" className="w-full !py-2.5" isLoading={isLoading} variant="primary">Register</Button>
          </div>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account? <Link to={NAV_LINKS.LOGIN} className="font-medium text-primary hover:text-primary-hover">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
