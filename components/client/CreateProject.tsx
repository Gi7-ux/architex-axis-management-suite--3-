// This component is no longer used for client-side project creation.
// Project creation is now handled by Admins.
// This file can be deleted or its contents repurposed for an Admin form.
import React from 'react';

const CreateProjectPlaceholder: React.FC = () => {
  return (
    <div className="p-6 bg-yellow-50 border border-yellow-300 rounded-md text-yellow-700">
      Project creation is now managed by Administrators. Clients can view their assigned projects in "My Projects".
    </div>
  );
};

export default CreateProjectPlaceholder;
// Original content removed as clients no longer create projects.
// The form logic has been adapted and moved to `components/admin/ProjectManagement.tsx`
// for admin project creation.