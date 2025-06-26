
import React from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom'; // Using NavLink for active styling
import { APP_NAME } from '../../constants'; // If needed for branding in sidebar
import { LogoutIcon, IconProps } from './IconComponents'; // Import IconProps
import { useAuth } from '../../contexts/AuthContext'; // For logout

export interface SidebarNavItem {
  label: string;
  to: string; // This will be the full path, e.g., /dashboard/users
  icon?: React.ReactNode;
  // subItems?: SidebarNavItem[]; // For future nested menus
}

interface SidebarProps {
  navItems: SidebarNavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ navItems }) => {
  const location = useLocation();
  const { logout, user } = useAuth(); // If logout needed directly from sidebar

  const baseLinkClasses = "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out";
  const activeLinkClasses = "bg-primary text-white shadow-md";
  const inactiveLinkClasses = "text-gray-200 hover:bg-bg-dark-sidebar-hover hover:text-white";
  
  return (
    <div className="w-64 bg-bg-dark-sidebar text-text-light flex flex-col h-full shadow-lg">
      <div className="p-5 border-b border-slate-700">
        {/* Optional: User avatar/name if not in top Navbar */}
        {user && (
            <div className="flex flex-col items-center text-center">
                 <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name.replace(' ', '+')}&background=4A5568&color=F0F4F8`} alt={user.name} className="h-16 w-16 rounded-full border-2 border-primary-light mb-2" />
                 <span className="font-semibold text-base">{user.name}</span>
                 <span className="text-xs text-gray-400">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
            </div>
        )}
      </div>
      <nav className="flex-grow p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <RouterNavLink
            key={item.label}
            to={item.to} // Ensure `item.to` is the full path
            className={({ isActive }) => 
              `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
            }
          >
            {item.icon && React.cloneElement(item.icon as React.ReactElement<IconProps>, { className: 'w-5 h-5 mr-3 flex-shrink-0' })}
            <span className="flex-grow">{item.label}</span>
          </RouterNavLink>
        ))}
      </nav>
      {/* Optional: Logout button at the bottom of the sidebar */}
      {/* <div className="p-4 mt-auto border-t border-slate-700">
        <button
          onClick={logout}
          className={`${baseLinkClasses} ${inactiveLinkClasses} w-full justify-start`}
        >
          <LogoutIcon className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div> */}
    </div>
  );
};

export default Sidebar;
