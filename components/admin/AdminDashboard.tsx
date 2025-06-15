
import React from 'react';
// Stats and content previously here are now managed by DashboardOverview or specific routed components.
// This component might be deprecated or serve as a very simple container if needed.
// For now, it won't be directly used if Dashboard routes to overview and specific pages.

const AdminDashboard: React.FC = () => {
  return (
    <div>
      {/* This component's content is now primarily handled by Dashboard.tsx routing to 
          DashboardOverview.tsx for stats and specific components like UserManagement, ProjectManagement, etc.
          If AdminDashboard specific layout beyond the sidebar + content is needed, it would go here.
          Otherwise, this component might not be directly rendered by a route anymore. 
      */}
      <p className="text-gray-500 p-4">Admin area. Select an option from the sidebar.</p>
    </div>
  );
};

export default AdminDashboard;