import React, { useState, useEffect } from 'react'; // Added useEffect
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import GlobalTimerDisplay from './GlobalTimerDisplay'; // Import the GlobalTimerDisplay
import Button from './Button';
import { SHORT_APP_NAME, NAV_LINKS } from '../../constants';
import { UserRole } from '../../types';
import { HomeIcon, UserCircleIcon, ChatBubbleLeftRightIcon, LogoutIcon, BriefcaseIcon, IconProps, BellIcon } from './IconComponents'; // Added BellIcon
import { fetchAdminNotificationsAPI, FetchAdminNotificationsParams } from '../../apiService'; // Import for notifications

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Keep if used, remove if not
  // const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false); // Keep if used

  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const getUnreadCount = async () => {
      if (user && user.role === UserRole.ADMIN) {
        try {
          const params: FetchAdminNotificationsParams = { limit: 1, offset: 0 }; // Fetch minimal data
          const response = await fetchAdminNotificationsAPI(params);
          setUnreadNotifications(response.total_unread);
        } catch (err) {
          console.error("Failed to fetch unread notification count:", err);
          // Optionally set an error state or display a silent error
        }
      } else {
        setUnreadNotifications(0); // Reset for non-admins or logged out users
      }
    };

    getUnreadCount();
    // This effect depends on `user`, so it runs on login/logout or user role change.
    // For real-time updates, a polling mechanism or WebSocket would be needed.
  }, [user]);


  const handleLogout = () => {
    logout();
    navigate(NAV_LINKS.LOGIN);
  };

  return (
    <nav className="bg-white text-text-dark shadow-md sticky top-0 z-50 border-b border-primary-extralight">
      {/* GlobalTimerDisplay will be fixed position, so its location in DOM tree here is not super critical for layout */}
      <GlobalTimerDisplay />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to={user ? NAV_LINKS.DASHBOARD_OVERVIEW : NAV_LINKS.LOGIN} className="flex-shrink-0 flex items-center">
              <img src="/logo-silhouette.png" alt="Architex Axis Logo Silhouette" className="h-10 w-auto mr-2"/>
              <span className="font-logo text-xl md:text-2xl font-bold tracking-tight text-primary">{SHORT_APP_NAME}</span>
            </Link>
          </div>
          <div className="flex items-center">
            <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-1">
                    {user && <NavLinkItem to={NAV_LINKS.DASHBOARD_OVERVIEW} icon={<HomeIcon className="w-5 h-5"/>} currentPath={location.pathname}>Dashboard</NavLinkItem>}

                    {/* Role-specific dashboard links can be consolidated within DashboardPage or stay here if structure demands */}
                    {user && user.role === UserRole.FREELANCER && (
                        <>
                            {/* Freelancer specific nav items if any beyond dashboard sections */}
                        </>
                    )}
                    {user && user.role === UserRole.CLIENT && (
                        <>
                            {/* Client specific nav items if any beyond dashboard sections */}
                        </>
                    )}
                     {user && user.role === UserRole.ADMIN && (
                        <>
                            {/* Admin specific nav items beyond dashboard sections */}
                             <NavLinkItem to={NAV_LINKS.ADMIN_NOTIFICATIONS} icon={<BellIcon className="w-5 h-5"/>} currentPath={location.pathname}>
                                Notifications
                                {unreadNotifications > 0 && (
                                <span className="ml-1.5 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                                    {unreadNotifications}
                                </span>
                                )}
                            </NavLinkItem>
                        </>
                    )}

                    {user && <NavLinkItem to={NAV_LINKS.PROFILE} icon={<UserCircleIcon className="w-5 h-5"/>} currentPath={location.pathname}>My Profile</NavLinkItem>}
                    {user && <NavLinkItem to={NAV_LINKS.MESSAGES} icon={<ChatBubbleLeftRightIcon className="w-5 h-5"/>} currentPath={location.pathname}>Messages</NavLinkItem>}
                    {!user && <NavLinkItem to={NAV_LINKS.PUBLIC_PROJECT_BROWSE} icon={<BriefcaseIcon className="w-5 h-5"/>} currentPath={location.pathname}>Browse Projects</NavLinkItem>}
                </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              {user ? (
                <div className="flex items-center space-x-3">
                   <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=A6C4BD&color=2A5B53`} alt={user.name || user.username} className="h-9 w-9 rounded-full border-2 border-primary-light" />
                  <Button onClick={handleLogout} variant="secondary" size="sm" leftIcon={<LogoutIcon className="w-5 h-5"/>} className="!text-sm">
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="space-x-2">
                    <Button onClick={() => navigate(NAV_LINKS.LOGIN)} variant="primary" size="sm">
                    Login / Sign Up
                    </Button>
                    <Button onClick={() => navigate(NAV_LINKS.ADMIN_LOGIN)} variant="outline" size="sm" className="hidden sm:inline-flex">
                    Admin Portal
                    </Button>
                </div>
              )}
            </div>
          </div>
          {/* Mobile menu button (implement if needed) */}
        </div>
      </div>
    </nav>
  );
};

interface NavLinkItemProps {
  to: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  currentPath: string;
}
const NavLinkItem: React.FC<NavLinkItemProps> = ({ to, children, icon, currentPath }) => {
  const isActive = currentPath === to || 
                   (to !== NAV_LINKS.DASHBOARD_OVERVIEW && currentPath.startsWith(to) && to !== NAV_LINKS.HOME) || 
                   (to === NAV_LINKS.DASHBOARD_OVERVIEW && currentPath.startsWith(NAV_LINKS.DASHBOARD) && currentPath !==NAV_LINKS.PROFILE && currentPath !== NAV_LINKS.MESSAGES && currentPath !== NAV_LINKS.ADMIN_NOTIFICATIONS); // Added ADMIN_NOTIFICATIONS to exception

  return (
  <Link
    to={to}
    className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors
      ${isActive
        ? 'bg-primary-extralight text-primary font-semibold'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
  >
    {icon && React.cloneElement(icon as React.ReactElement<IconProps>, { className: `w-5 h-5 ${isActive ? 'text-primary' : 'text-gray-500'}` })}
    <span>{children}</span>
  </Link>
)};


export default Navbar;
