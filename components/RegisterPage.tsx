import React, { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerAPI, UserRegistrationData, ApiError as ApiErrorType } from '../apiService'; // Use ApiErrorType
import { UserRole } from '../types';
import Button from './shared/Button';
import { APP_NAME, NAV_LINKS } from '../constants';
import ErrorMessage from './shared/ErrorMessage'; // Import ErrorMessage

const RECAPTCHA_SITE_KEY = "YOUR_RECAPTCHA_SITE_KEY"; // Placeholder

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoadCallbackRegister: () => void;
    onRecaptchaChangeRegister: (token: string | null) => void;
  }
}

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.FREELANCER);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<ApiErrorType | string | null>(null); // Updated error state type
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [isRecaptchaScriptLoaded, setIsRecaptchaScriptLoaded] = useState(false);

  useEffect(() => {
    window.onRecaptchaChangeRegister = (token: string | null) => {
      setRecaptchaToken(token);
      if (token) setError(null); // Clear CAPTCHA error if user completes it
    };

    const scriptId = "recaptcha-script"; // Use same ID to avoid multiple script loads
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoadCallbackRegister&render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else if (window.grecaptcha && window.grecaptcha.render) { // If script already loaded by another page
        setIsRecaptchaScriptLoaded(true);
    }

    window.onRecaptchaLoadCallbackRegister = () => {
      setIsRecaptchaScriptLoaded(true);
    };

    return () => {
      delete (window as any).onRecaptchaChangeRegister;
      delete (window as any).onRecaptchaLoadCallbackRegister;
    };
  }, []);

  useEffect(() => {
    if (isRecaptchaScriptLoaded && recaptchaContainerRef.current && window.grecaptcha && window.grecaptcha.render && !recaptchaContainerRef.current.hasChildNodes()) {
      try {
        window.grecaptcha.render(recaptchaContainerRef.current, {
          'sitekey': RECAPTCHA_SITE_KEY,
          'callback': window.onRecaptchaChangeRegister,
          'expired-callback': () => {
            setRecaptchaToken(null);
            setError("CAPTCHA expired. Please try again.");
          }
        });
      } catch (e) {
        console.error("Error rendering reCAPTCHA for Register:", e);
        setError("Failed to load CAPTCHA. Please refresh the page.");
      }
    }
  }, [isRecaptchaScriptLoaded]);

  const resetRecaptcha = () => {
    if (window.grecaptcha && recaptchaContainerRef.current?.firstChild) {
       try {
            window.grecaptcha.reset();
        } catch(e) {
            console.error("Error resetting reCAPTCHA:", e);
        }
    }
    setRecaptchaToken(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!username || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      resetRecaptcha();
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      resetRecaptcha();
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      resetRecaptcha();
      return;
    }
    if (!recaptchaToken) {
      setError("Please complete the CAPTCHA verification.");
      return;
    }

    setIsLoading(true);
    const registrationData: UserRegistrationData = {
      username,
      email,
      password,
      role,
      recaptcha_token: recaptchaToken
    };

    try {
      const response = await registerAPI(registrationData);
      setSuccessMessage(response.message + " You can now log in.");
      // Clear form fields after successful registration
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setRole(UserRole.FREELANCER);
      resetRecaptcha(); // Reset recaptcha as well
      setTimeout(() => navigate(NAV_LINKS.LOGIN), 3000);
    } catch (err) {
      if (err instanceof ApiErrorType) {
        setError(err); // Pass the full error object
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during registration.');
      }
      resetRecaptcha();
      console.error("Registration page error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers to clear error on input change
  const handleInputChange = <T extends string | UserRole>(setter: React.Dispatch<React.SetStateAction<T>>) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(e.target.value as T);
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary font-logo">{APP_NAME} - Register</h1>
          <p className="text-gray-500 mt-1">Create your account.</p>
        </div>

        {successMessage && <p className="mb-4 text-sm text-green-600 bg-green-100 p-3 rounded-lg border border-green-200">{successMessage}</p>}
        <ErrorMessage error={error} /> {/* Use ErrorMessage component */}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
            <input id="username" type="text" value={username} onChange={handleInputChange(setUsername)} required className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"/>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input id="email" type="email" value={email} onChange={handleInputChange(setEmail)} required className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"/>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" type="password" value={password} onChange={handleInputChange(setPassword)} required className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"/>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input id="confirmPassword" type="password" value={confirmPassword} onChange={handleInputChange(setConfirmPassword)} required className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"/>
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Register as</label>
            <select id="role" value={role} onChange={handleInputChange(setRole)} required className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white">
              <option value={UserRole.FREELANCER}>Freelancer</option>
              <option value={UserRole.CLIENT}>Client</option>
            </select>
          </div>

          <div className="my-4"> {/* Added margin for spacing */}
             <div ref={recaptchaContainerRef} id="recaptcha-container-register"></div>
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
