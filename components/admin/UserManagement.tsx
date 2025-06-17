// In components/admin/UserManagement.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { UserRole } from '../../types'; // Keep UserRole
import {
    adminFetchAllUsersAPI,
    // adminUpdateUserRoleAPI, // Keep for simple role updates if separate button, or merge into full edit
    adminCreateUserAPI,
    adminFetchUserDetailsAPI,
    adminUpdateUserDetailsAPI,
    adminDeleteUserAPI,
    AdminUserView as AdminUserListEntry,
    AdminCreateUserPayload,
    AdminUserDetailsResponse,
    AdminUpdateUserDetailsPayload,
    ApiError as ApiErrorType, // Import and alias ApiError
    Skill,
    fetchAllSkillsAPI
} from '../../apiService';
import Button from '../shared/Button';
import { PencilIcon, TrashIcon, PlusCircleIcon, CheckCircleIcon, XCircleIcon } from '../shared/IconComponents';
import Modal from '../shared/Modal';
import ErrorMessage from '../shared/ErrorMessage'; // Import ErrorMessage
import LoadingSpinner from '../shared/LoadingSpinner';
import { useAuth } from '../AuthContext';


// Extend AdminUserListEntry to include is_active for the main list display
interface AdminUserView extends AdminUserListEntry {
    is_active: boolean;
}

const UserManagement: React.FC = () => {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<ApiErrorType | string | null>(null); // Renamed for page-level errors
  const [modalError, setModalError] = useState<ApiErrorType | string | null>(null); // For modal specific errors
  const [isModalOpen, setIsModalOpen] = useState(false);

  // For Add/Edit form.
  const [currentUserFormData, setCurrentUserFormData] = useState<Partial<AdminUserDetailsResponse & AdminCreateUserPayload>>({});
  const [isEditMode, setIsEditMode] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [allGlobalSkills, setAllGlobalSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<number>>(new Set());

  const loadUsersAndSkills = useCallback(async () => {
    setIsLoading(true); setPageError(null); // Use pageError
    try {
      const [fetchedUsers, fetchedSkills] = await Promise.all([
        adminFetchAllUsersAPI(),
        fetchAllSkillsAPI()
      ]);
      setUsers(fetchedUsers as AdminUserView[]);
      setAllGlobalSkills(fetchedSkills.sort((a,b) => a.name.localeCompare(b.name)));
    } catch (err) {
        if (err instanceof ApiErrorType) setPageError(err);
        else if (err instanceof Error) setPageError(err.message);
        else setPageError("Failed to load initial user and skill data.");
    } finally {setIsLoading(false);}
  }, []);

  useEffect(() => { loadUsersAndSkills(); }, [loadUsersAndSkills]);

  const handleOpenModal = async (userToEdit: AdminUserView | null = null) => {
    setModalError(null); // Clear previous modal errors
    if (userToEdit) {
      setIsEditMode(true);
      try {
        setIsSubmitting(true);
        const fullDetails = await adminFetchUserDetailsAPI(userToEdit.id);
        setCurrentUserFormData(fullDetails);
        if (fullDetails.skills) {
          setSelectedSkillIds(new Set(fullDetails.skills.map(s => s.id)));
        } else {
          setSelectedSkillIds(new Set());
        }
      } catch (err) {
        if (err instanceof ApiErrorType) setModalError(err);
        else if (err instanceof Error) setModalError(err.message);
        else setModalError("Failed to fetch user details.");
        setCurrentUserFormData({ // Fallback
            id: userToEdit.id,
            username: userToEdit.username,
            email: userToEdit.email,
            role: userToEdit.role,
            is_active: userToEdit.is_active,
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsEditMode(false);
      setCurrentUserFormData({
        username: '', email: '', password: '', role: UserRole.FREELANCER,
        name: '', phoneNumber: null, company: null, experience: null,
        hourlyRate: null, avatarUrl: null, is_active: true
      });
      setSelectedSkillIds(new Set());
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false); setCurrentUserFormData({}); setIsEditMode(false); setModalError(null); setSelectedSkillIds(new Set());
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue: any = value;
    if (type === 'checkbox') {
        processedValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'hourlyRate') {
        processedValue = value === '' ? null : parseFloat(value);
    }
    setCurrentUserFormData(prev => ({ ...prev, [name]: processedValue }));
    if (modalError) setModalError(null); // Clear modal error on form change
  };

  const handleSkillCheckboxChange = (skillId: number, isChecked: boolean) => {
    const newSet = new Set(selectedSkillIds);
    if (isChecked) newSet.add(skillId);
    else newSet.delete(skillId);
    setSelectedSkillIds(newSet);
    if (modalError) setModalError(null); // Clear modal error on skill change
  };

  const handleSaveUser = async () => {
    if (!currentUserFormData) return;
    setIsSubmitting(true); setModalError(null); // Use modalError

    try {
      if (isEditMode && currentUserFormData.id) {
        const {
            id, created_at, updated_at, // Non-payload fields
            password, // Password changes handled separately
            skills, // skills are handled via skill_ids
            ...editableFields
        } = currentUserFormData as AdminUserDetailsResponse & { password?: string };

        const updatePayload: AdminUpdateUserDetailsPayload = {
            ...editableFields,
            skill_ids: Array.from(selectedSkillIds) // Add selected skill IDs
        };

        if (typeof updatePayload.is_active !== 'boolean' && updatePayload.is_active !== undefined) {
             updatePayload.is_active = String(updatePayload.is_active).toLowerCase() === 'true';
        }

        await adminUpdateUserDetailsAPI(currentUserFormData.id, updatePayload);
      } else {
        // Ensure all required fields for AdminCreateUserPayload are present
        const createPayload = currentUserFormData as AdminCreateUserPayload;
        if (!createPayload.username || !createPayload.email || !createPayload.password || !createPayload.role) {
            throw new Error("Username, email, password, and role are required for new user.");
        }
        // Backend admin_create_user doesn't support skill_ids on creation yet.
        // If it did: createPayload.skill_ids = Array.from(selectedSkillIds);
        await adminCreateUserAPI(createPayload);
      }
      await loadUsersAndSkills();
      handleCloseModal();
    } catch (err) {
      console.error("Error saving user:", err);
      if (err instanceof ApiErrorType) setModalError(err);
      else if (err instanceof Error) setModalError(err.message);
      else setModalError("Failed to save user. An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: number, currentStatus: boolean) => {
    const actionText = currentStatus ? "deactivate" : "activate";
    if (window.confirm(`Are you sure you want to ${actionText} this user? This will ${currentStatus ? 'invalidate their session' : 'allow them to log in'}.`)) {
        setIsSubmitting(true); setPageError(null); // Use pageError for this action
        try {
            if (currentStatus) {
                 await adminDeleteUserAPI(userId);
            } else {
                 await adminUpdateUserDetailsAPI(userId, { is_active: true });
            }
            await loadUsersAndSkills();
        } catch (err) {
            console.error(`Failed to ${actionText} user:`, err);
            if (err instanceof ApiErrorType) setPageError(err);
            else if (err instanceof Error) setPageError(err.message);
            else setPageError(`Failed to ${actionText} user.`);
        } finally {
            setIsSubmitting(false);
        }
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 bg-white shadow-xl rounded-lg">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-primary">User Management</h2>
        <Button onClick={() => handleOpenModal()} leftIcon={<PlusCircleIcon className="w-5 h-5"/>} variant="primary">
          Add User
        </Button>
      </div>

      <ErrorMessage error={pageError} /> {/* Display page-level errors */}
      <input type="text" placeholder="Search users (by username, email, or role)..." value={searchTerm}
        onChange={(e) => {setSearchTerm(e.target.value); if(pageError) setPageError(null);}}
        className="mb-6 p-2.5 border border-gray-300 rounded-lg w-full sm:w-1/2 focus:ring-primary focus:border-primary"/>

      {isLoading && <LoadingSpinner text="Loading users..." />}
      {!isLoading && users.length === 0 && !pageError && <p className="text-center text-gray-500 py-5">No users found.</p>}
      {!isLoading && filteredUsers.length === 0 && users.length > 0 && !pageError && <p className="text-center text-gray-500 py-5">No users match your search.</p>}

      {!isLoading && filteredUsers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={`${!user.is_active ? 'bg-gray-100 opacity-70' : ''} hover:bg-gray-50`}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{user.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{user.username}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{user.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                     <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${ user.role === UserRole.ADMIN ? 'bg-slate-200 text-slate-700' : user.role === UserRole.FREELANCER ? 'bg-accent text-secondary' : 'bg-primary-extralight text-primary' }`}>
                        {user.role}
                     </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {user.is_active ? <CheckCircleIcon className="w-5 h-5 text-green-500"/> : <XCircleIcon className="w-5 h-5 text-red-500"/>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(user)}><PencilIcon className="w-4 h-4"/></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id, user.is_active)}
                            className={`${user.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'}`}
                            disabled={user.id === authUser?.id && user.is_active} // Prevent admin deactivating self via this button
                            title={user.id === authUser?.id && user.is_active ? "Cannot deactivate self" : (user.is_active ? "Deactivate User" : "Activate User")}
                            >
                      {user.is_active ? <TrashIcon className="w-4 h-4"/> : <CheckCircleIcon className="w-4 h-4"/>}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={isEditMode ? `Edit User: ${currentUserFormData.username || ''}` : 'Add New User'} size="2xl">
          <ErrorMessage error={modalError} />
          <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className="space-y-4 max-h-[75vh] overflow-y-auto p-1">
            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700">Username:*</label><input type="text" name="username" value={currentUserFormData.username || ''} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/></div>
              <div><label className="block text-sm font-medium text-gray-700">Email:*</label><input type="email" name="email" value={currentUserFormData.email || ''} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/></div>
            </div>
            {!isEditMode && <div><label className="block text-sm font-medium text-gray-700">Password:*</label><input type="password" name="password" value={currentUserFormData.password || ''} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" minLength={8}/></div>}
            <div><label className="block text-sm font-medium text-gray-700">Full Name:</label><input type="text" name="name" value={currentUserFormData.name || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700">Role:*</label>
                <select name="role" value={currentUserFormData.role || ''} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white">
                  {Object.values(UserRole).map(r => <option key={r} value={r} disabled={r === UserRole.ADMIN && currentUserFormData.id === authUser?.id}>{r}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700">Phone Number:</label><input type="tel" name="phoneNumber" value={currentUserFormData.phoneNumber || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700">Company:</label><input type="text" name="company" value={currentUserFormData.company || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/></div>
              <div><label className="block text-sm font-medium text-gray-700">Avatar URL:</label><input type="url" name="avatarUrl" value={currentUserFormData.avatarUrl || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700">Experience/Bio:</label><textarea name="experience" value={currentUserFormData.experience || ''} onChange={handleFormChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/></div>
            { (currentUserFormData.role === UserRole.FREELANCER || (!isEditMode && currentUserFormData.role === UserRole.FREELANCER) ) &&
              <div><label className="block text-sm font-medium text-gray-700">Hourly Rate (R):</label><input type="number" name="hourlyRate" value={currentUserFormData.hourlyRate === null ? '' : currentUserFormData.hourlyRate || ''} onChange={handleFormChange} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/></div>
            }
            {isEditMode &&
              <div className="flex items-center pt-2">
                <input type="checkbox" id="is_active_checkbox" name="is_active" checked={currentUserFormData.is_active ?? false} onChange={handleFormChange} className="h-4 w-4 text-primary border-gray-300 rounded-md mr-2 focus:ring-primary" disabled={currentUserFormData.id === authUser?.id} />
                <label htmlFor="is_active_checkbox" className="text-sm font-medium text-gray-700">User is Active</label>
              </div>
            }

            {isEditMode && currentUserFormData.id && (
            <div className="pt-3">
              <label className="block text-sm font-medium text-gray-700">Skills</label>
              <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1 bg-gray-50">
                {allGlobalSkills.map(skill => (
                  <div key={skill.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`skill-${skill.id}-user-${currentUserFormData.id}`}
                      checked={selectedSkillIds.has(skill.id)}
                      onChange={(e) => handleSkillCheckboxChange(skill.id, e.target.checked)}
                      className="h-4 w-4 text-primary border-gray-300 rounded-md mr-2 focus:ring-primary"
                    />
                    <label htmlFor={`skill-${skill.id}-user-${currentUserFormData.id}`} className="text-sm text-gray-700">{skill.name}</label>
                  </div>
                ))}
                {allGlobalSkills.length === 0 && <p className="text-xs text-gray-400">No global skills defined yet. Add them in 'Manage Skills'.</p>}
              </div>
            </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-gray-200">
              <Button type="button" variant="ghost" size="md" onClick={handleCloseModal} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} disabled={isSubmitting}>Save User</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
export default UserManagement;
