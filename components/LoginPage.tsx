import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Button from './shared/Button';
import { UserRole } from '../types';
import { APP_NAME, NAV_LINKS } from '../constants';
import { ApiError as ApiErrorType, UserLoginData } from '../apiService'; // Renamed ApiError to ApiErrorType
import ErrorMessage from './shared/ErrorMessage'; // Import ErrorMessage

// Define reCAPTCHA site key as a constant (replace with actual environment variable in real app)
const RECAPTCHA_SITE_KEY = "YOUR_RECAPTCHA_SITE_KEY";

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoadCallbackLogin: () => void;
    onRecaptchaChangeLogin: (token: string | null) => void;
  }
}

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<ApiErrorType | string | null>(null); // Updated error state type
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || NAV_LINKS.DASHBOARD_OVERVIEW;
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [isRecaptchaScriptLoaded, setIsRecaptchaScriptLoaded] = useState(false);


  useEffect(() => {
    window.onRecaptchaChangeLogin = (token: string | null) => {
      setRecaptchaToken(token);
      if (token) setError(null); // Clear CAPTCHA error if user completes it
    };

    const scriptId = "recaptcha-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoadCallbackLogin&render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    window.onRecaptchaLoadCallbackLogin = () => {
      setIsRecaptchaScriptLoaded(true);
    };

    return () => {
      // Clean up global callback if component unmounts
      delete (window as any).onRecaptchaChangeLogin;
      delete (window as any).onRecaptchaLoadCallbackLogin;
    };
  }, []);

  useEffect(() => {
    if (isRecaptchaScriptLoaded && recaptchaContainerRef.current && window.grecaptcha && window.grecaptcha.render) {
      try {
         window.grecaptcha.render(recaptchaContainerRef.current, {
            'sitekey': RECAPTCHA_SITE_KEY,
            'callback': window.onRecaptchaChangeLogin,
            'expired-callback': () => {
              setRecaptchaToken(null);
              setError("CAPTCHA expired. Please try again.");
            }
          });
      } catch (e) {
        console.error("Error rendering reCAPTCHA:", e);
        setError("Failed to load CAPTCHA. Please refresh the page.");
      }
    }
  }, [isRecaptchaScriptLoaded]);


  const resetRecaptcha = () => {
    if (window.grecaptcha && recaptchaContainerRef.current?.firstChild) { // Check if widget exists
        // This assumes the widget ID is 0, which is usually the case for the first explicit render.
        // A more robust solution might involve storing the widget ID returned by grecaptcha.render.
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
    setError(null); // Clear previous errors
    if (!email || !password) {
      setError("Please enter both email and password.");
      resetRecaptcha();
      return;
    }
    if (!recaptchaToken) {
      setError("Please complete the CAPTCHA verification.");
      return;
    }

    const loginPayload: UserLoginData = {
      email,
      password,
      recaptcha_token: recaptchaToken
    };

    try {
       const user = await login(loginPayload);
       if (user) {
         if (user.role === UserRole.ADMIN) {
           setError('Administrators must use the Admin Portal login.');
           resetRecaptcha();
           return;
          }
          navigate(from, { replace: true });
        } else {
          // This case might be redundant if login function throws ApiError on failure
          setError('Login failed. Please check your credentials.');
          resetRecaptcha();
        }
    } catch (err) {
        // Ensure err is either an ApiErrorType or a string for the ErrorMessage component
        if (err instanceof ApiErrorType) {
            setError(err);
        } else if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unexpected error occurred. Please try again.');
        }
        resetRecaptcha();
        console.error("Login page error:", err);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: "linear-gradient(to bottom right, var(--color-primary-extralight), var(--color-accent)), url('data:image/svg+xml;charset=UTF-8,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'blueprint\' patternUnits=\'userSpaceOnUse\' width=\'100\' height=\'100\' fill=\'rgba(74,131,121,0.05)\'%3E%3Cpath d=\'M0 50h100M50 0v100\' stroke-width=\'1\' stroke=\'rgba(74,131,121,0.1)\'/%3E%3Cpath d=\'M0 10h100M10 0v100M0 20h100M20 0v100M0 30h100M30 0v100M0 40h100M40 0v100M0 60h100M60 0v100M0 70h100M70 0v100M0 80h100M80 0v100M0 90h100M90 0v100\' stroke-width=\'0.5\' stroke=\'rgba(74,131,121,0.08)\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23blueprint)\'/%3E%3C/svg%3E')"}}>
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-500 hover:shadow-2xl">
        <div className="text-center mb-8">
          <img src="/logo-silhouette.png" alt="Architex Axis Logo Silhouette" className="w-24 h-auto mx-auto mb-4"/>
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
              onChange={handleEmailChange} // Use new handler
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
              onChange={handlePasswordChange} // Use new handler
              className="mt-1 block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          <div className="my-4">
            <div ref={recaptchaContainerRef} id="recaptcha-container-login"></div>
          </div>

          <ErrorMessage error={error} /> {/* Use ErrorMessage component */}

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
