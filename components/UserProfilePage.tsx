import React, { useEffect } from 'react'; // Removed useState as form is simplified
import { useAuth } from '../contexts/AuthContext';
// import { UserRole } from '../types'; // UserRole might be needed if displaying role-specific info not in AuthUser
// import Button from './shared/Button'; // Button not needed for simplified view

const UserProfilePage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  // user is now AuthUser: { id: number, username: string, email: string, role: UserRole }

  // const [formData, setFormData] = useState<Partial<AuthUser>>({}); // Not needed for display-only
  // const [skills, setSkills] = useState<string[]>([]); // Not in AuthUser
  // const [isEditing, setIsEditing] = useState(false); // Editing disabled for now
  // const [successMessage, setSuccessMessage] = useState<string | null>(null); // Not needed
  // const [errorMessage, setErrorMessage] = useState<string | null>(null); // Not needed
  // const [isSaving, setIsSaving] = useState(false); // Not needed

  useEffect(() => {
    if (user) {
      // No need to setFormData as we're displaying directly from user object
      // AuthUser doesn't have: name (using username), phoneNumber, company, experience, hourlyRate, avatarUrl, skills
      // setSkills([]); // Clear skills as they are not in AuthUser
    }
  }, [user]);

  // handleSubmit, handleChange, handleRateChange, handleAddSkill, handleRemoveSkill, renderField are removed
  // as editing functionality is temporarily disabled.

  if (authLoading || !user) {
    return <div className="p-6 text-center">Loading profile...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 bg-white shadow-xl rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
        {/* Edit button removed for now */}
        {/*
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="primary">Edit Profile</Button>
          )}
        */}
      </div>

      {/* Messages removed */}
      {/* {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">{successMessage}</div>} */}
      {/* {errorMessage && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{errorMessage}</div>} */}
      
      <div className="space-y-6"> {/* Changed from form to div */}
        <div className="flex items-center space-x-4 mb-8">
            <img
              src={`https://ui-avatars.com/api/?name=${user.username.replace(' ', '+')}&background=random&color=fff&size=96`}
              alt={user.username}
              className="h-24 w-24 rounded-full shadow-md"
            />
            <div>
                 <h2 className="text-2xl font-semibold text-gray-700">{user.username}</h2>
                 <p className="text-gray-500">{user.email} ({user.role})</p>
            </div>
        </div>
        
        {/* Simplified display of available AuthUser fields */}
        <div>
          <span className="block text-sm font-medium text-gray-700">Username</span>
          <p className="mt-1 bg-gray-50 p-3 rounded-md text-gray-900">{user.username}</p>
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-700">Email Address</span>
          <p className="mt-1 bg-gray-50 p-3 rounded-md text-gray-900">{user.email}</p>
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-700">Role</span>
          <p className="mt-1 bg-gray-50 p-3 rounded-md text-gray-900">{user.role}</p>
        </div>

        {/* Placeholder for future fields and editing */}
        <p className="mt-8 pt-4 border-t text-sm text-gray-500">
          Full profile details and editing functionality will be available in a future update.
        </p>

        {/* Editing form and buttons removed */}
        {/*
        {isEditing && (
          <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
            <Button type="button" variant="secondary" onClick={() => { setIsEditing(false); if (user) { setFormData(user); setSkills(user.skills || []); } }} disabled={isSaving}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSaving} disabled={isSaving}>Save Changes</Button>
          </div>
        )}
        */}
      </div>
    </div>
  );
};

export default UserProfilePage;
