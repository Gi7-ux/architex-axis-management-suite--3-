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
    AdminUserView as AdminUserListEntry, // Rename for clarity if AdminUserDetailsResponse is also User like
    AdminCreateUserPayload,
    AdminUserDetailsResponse,
    AdminUpdateUserDetailsPayload,
    // AdminActionResponse, // Not directly used in component state, but for API calls
    ApiError,
    Skill, // Import Skill
    fetchAllSkillsAPI // Import fetchAllSkillsAPI
} from '../../apiService';
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { fetchUsersAPI, addUserAPI, updateUserAPI, deleteUserAPI, getUsersFromPhp, createUserInPhp } from '../../apiService';
import Button from '../shared/Button';
import { PencilIcon, TrashIcon, PlusCircleIcon, CheckCircleIcon, XCircleIcon } from '../shared/IconComponents';
import Modal from '../shared/Modal';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useAuth } from '../AuthContext'; // Import useAuth to get current admin ID


// Extend AdminUserListEntry to include is_active for the main list display
interface AdminUserView extends AdminUserListEntry {
    is_active: boolean;
}

const UserManagement: React.FC = () => {
  const { user: authUser } = useAuth(); // Get authenticated admin user
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [phpUsers, setPhpUsers] = useState<User[]>([]);
  const [isPhpUsersLoading, setIsPhpUsersLoading] = useState(true);
  const [phpUsersError, setPhpUsersError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // For Add/Edit form. Can hold data for new user or full details of existing user.
  const [currentUserFormData, setCurrentUserFormData] = useState<Partial<AdminUserDetailsResponse & AdminCreateUserPayload>>({});
  const [isEditMode, setIsEditMode] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New state for creating user via PHP backend
  const [showPhpCreateForm, setShowPhpCreateForm] = useState(false);
  const [phpUserFormData, setPhpUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: UserRole.CLIENT, // Default role
    first_name: '',
    last_name: ''
  });
  const [isCreatingPhpUser, setIsCreatingPhpUser] = useState(false);
  const [createPhpUserError, setCreatePhpUserError] = useState<string | null>(null);

  const [allGlobalSkills, setAllGlobalSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<number>>(new Set());

  const loadUsersAndSkills = useCallback(async () => { // Combined initial load
    setIsLoading(true); setError(null);
    try {
      const [fetchedUsers, fetchedSkills] = await Promise.all([
        adminFetchAllUsersAPI(),
        fetchAllSkillsAPI()
      ]);
      setUsers(fetchedUsers as AdminUserView[]);
      setAllGlobalSkills(fetchedSkills.sort((a,b) => a.name.localeCompare(b.name)));
    } catch (err: any) {setError(err.message || "Failed to load initial data.");}
    finally {setIsLoading(false);}
  }, []);

  const loadPhpUsers = async () => {
    setIsPhpUsersLoading(true);
    setPhpUsersError(null);
    try {
      const fetchedPhpUsers = await getUsersFromPhp();
      setPhpUsers(fetchedPhpUsers);
    } catch (err: any) {
      console.error("Error fetching PHP users:", err);
      setPhpUsersError(err.message || "Failed to load users from PHP backend.");
    } finally {
      setIsPhpUsersLoading(false);
    }
  };

  useEffect(() => {
    loadPhpUsers();
  }, []);

  useEffect(() => { loadUsersAndSkills(); }, [loadUsersAndSkills]); // Use combined loader

  const handleOpenModal = async (userToEdit: AdminUserView | null = null) => {
    setError(null); // Clear modal error
    if (userToEdit) {
      setIsEditMode(true);
      try {
        setIsSubmitting(true); // Use isSubmitting for loading state of modal form
        const fullDetails = await adminFetchUserDetailsAPI(userToEdit.id);
        setCurrentUserFormData(fullDetails);
        if (fullDetails.skills) {
          setSelectedSkillIds(new Set(fullDetails.skills.map(s => s.id)));
        } else {
          setSelectedSkillIds(new Set());
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch user details.");
        // Fallback to list data if full fetch fails, though some fields might be missing
        setCurrentUserFormData({
            id: userToEdit.id,
            username: userToEdit.username,
            email: userToEdit.email,
            role: userToEdit.role,
            is_active: userToEdit.is_active,
            // other fields will be undefined
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
    setIsModalOpen(false); setCurrentUserFormData({}); setIsEditMode(false); setError(null); setSelectedSkillIds(new Set());
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue: any = value;
    if (type === 'checkbox') { // For is_active
        processedValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'hourlyRate') {
        processedValue = value === '' ? null : parseFloat(value);
    } else if (name === 'is_active_text_input_for_some_reason') { // Example if not checkbox
        processedValue = value.toLowerCase() === 'true';
    }
    setCurrentUserFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSaveUser = async () => {
    if (!currentUserFormData) return;
    setIsSubmitting(true); setError(null);

    try {
      if (isEditMode && currentUserFormData.id) {
        // Exclude fields not part of AdminUpdateUserDetailsPayload or that shouldn't be sent
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
      await loadUsersAndSkills(); // Refresh users and skills list
      handleCloseModal();
    } catch (err: any) {
      if (err instanceof ApiError) setError(err.data?.message || err.message || "Failed to save user.");
      else setError(String(err)); // Show other errors like validation message
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: number, currentStatus: boolean) => {
    const actionText = currentStatus ? "deactivate" : "activate";
    if (window.confirm(`Are you sure you want to ${actionText} this user? This will ${currentStatus ? 'invalidate their session' : 'allow them to log in'}.`)) {
        setIsSubmitting(true); setError(null);
        try {
            if (currentStatus) { // If active, call delete (deactivate)
                 await adminDeleteUserAPI(userId);
            } else { // If inactive, call update to activate
                 await adminUpdateUserDetailsAPI(userId, { is_active: true });
            }
            await loadUsersAndSkills();
        } catch (err: any) {
            setError(err.message || `Failed to ${actionText} user.`);
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
    user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.skills && user.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handlePhpUserFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPhpUserFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreatePhpUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingPhpUser(true);
    setCreatePhpUserError(null);
    try {
      // Basic validation frontend side (can be more extensive)
      if (!phpUserFormData.username || !phpUserFormData.email || !phpUserFormData.password) {
        throw new Error("Username, email, and password are required.");
      }
      await createUserInPhp({
        username: phpUserFormData.username,
        email: phpUserFormData.email,
        password: phpUserFormData.password, // Sending raw password
        role: phpUserFormData.role,
        first_name: phpUserFormData.first_name || undefined,
        last_name: phpUserFormData.last_name || undefined,
      });
      setShowPhpCreateForm(false); // Close form on success
      setPhpUserFormData({ username: '', email: '', password: '', role: UserRole.CLIENT, first_name: '', last_name: '' }); // Reset form
      await loadPhpUsers(); // Refresh the list of PHP users
      alert('User created successfully via PHP backend!'); // Simple feedback
    } catch (err: any) {
      console.error("Error creating PHP user:", err);
      setCreatePhpUserError(err.message || "Failed to create user via PHP backend.");
    } finally {
      setIsCreatingPhpUser(false);
    }
  };

  if (isLoading && users.length === 0) { 
    return (
      <div className="p-6 text-center flex flex-col items-center justify-center h-64">
        <LoadingSpinner text="Loading users..." />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-white shadow-xl rounded-lg">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-primary">User Management (Existing API)</h2>
        <Button onClick={() => handleOpenModal()} leftIcon={<PlusCircleIcon className="w-5 h-5"/>} variant="primary">
          Add User
        </Button>
      </div>

      {error && !isModalOpen && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
      <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-6 p-2.5 border rounded-lg w-full sm:w-1/2"/>

      {isLoading && <LoadingSpinner text="Loading users..." />}
      {!isLoading && users.length === 0 && !error && <p>No users found.</p>}

      {!isLoading && users.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
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
                            disabled={user.role === UserRole.ADMIN} // Prevent (de)activation of any admin account
                            title={user.role === UserRole.ADMIN ? "Admin accounts cannot be (de)activated here" : (user.is_active ? "Deactivate User" : "Activate User")}
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
          {error && isModalOpen && <div className="mb-3 p-2 bg-red-100 text-red-600 rounded-md text-sm">{error}</div>}
          <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className="space-y-3 max-h-[75vh] overflow-y-auto p-1">
            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium">Username:*</label><input type="text" name="username" value={currentUserFormData.username || ''} onChange={handleFormChange} required className="w-full mt-1 p-2 border rounded"/></div>
              <div><label className="block text-sm font-medium">Email:*</label><input type="email" name="email" value={currentUserFormData.email || ''} onChange={handleFormChange} required className="w-full mt-1 p-2 border rounded"/></div>
            </div>
            {!isEditMode && <div><label className="block text-sm font-medium">Password:*</label><input type="password" name="password" value={currentUserFormData.password || ''} onChange={handleFormChange} required className="w-full mt-1 p-2 border rounded" minLength={8}/></div>}
            <div><label className="block text-sm font-medium">Full Name:</label><input type="text" name="name" value={currentUserFormData.name || ''} onChange={handleFormChange} className="w-full mt-1 p-2 border rounded"/></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium">Role:*</label>
                <select name="role" value={currentUserFormData.role || ''} onChange={handleFormChange} required className="w-full mt-1 p-2 border rounded bg-white">
                  {Object.values(UserRole).map(r => <option key={r} value={r} disabled={r === UserRole.ADMIN && currentUserFormData.id === authUser?.id}>{r}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium">Phone Number:</label><input type="tel" name="phoneNumber" value={currentUserFormData.phoneNumber || ''} onChange={handleFormChange} className="w-full mt-1 p-2 border rounded"/></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium">Company:</label><input type="text" name="company" value={currentUserFormData.company || ''} onChange={handleFormChange} className="w-full mt-1 p-2 border rounded"/></div>
              <div><label className="block text-sm font-medium">Avatar URL:</label><input type="url" name="avatarUrl" value={currentUserFormData.avatarUrl || ''} onChange={handleFormChange} className="w-full mt-1 p-2 border rounded"/></div>
            </div>
            <div><label className="block text-sm font-medium">Experience/Bio:</label><textarea name="experience" value={currentUserFormData.experience || ''} onChange={handleFormChange} rows={3} className="w-full mt-1 p-2 border rounded"/></div>
            { (currentUserFormData.role === UserRole.FREELANCER || (!isEditMode && currentUserFormData.role === UserRole.FREELANCER) ) && // Show if role is freelancer or if adding a freelancer
              <div><label className="block text-sm font-medium">Hourly Rate (R):</label><input type="number" name="hourlyRate" value={currentUserFormData.hourlyRate === null ? '' : currentUserFormData.hourlyRate || ''} onChange={handleFormChange} min="0" step="0.01" className="w-full mt-1 p-2 border rounded"/></div>
            }
            {isEditMode &&
              <div className="flex items-center pt-2">
                <input type="checkbox" id="is_active_checkbox" name="is_active" checked={currentUserFormData.is_active ?? false} onChange={handleFormChange} className="h-4 w-4 text-primary border-gray-300 rounded mr-2" disabled={currentUserFormData.id === authUser?.id} />
                <label htmlFor="is_active_checkbox" className="text-sm font-medium">User is Active</label>
              </div>
            }

            {isEditMode && currentUserFormData.id && (
            <div className="pt-3">
              <label className="block text-sm font-medium text-gray-700">Skills</label>
              <div className="mt-1 max-h-40 overflow-y-auto border rounded p-2 space-y-1 bg-gray-50">
                {allGlobalSkills.map(skill => (
                  <div key={skill.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`skill-${skill.id}-user-${currentUserFormData.id}`}
                      checked={selectedSkillIds.has(skill.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedSkillIds);
                        if (e.target.checked) newSet.add(skill.id);
                        else newSet.delete(skill.id);
                        setSelectedSkillIds(newSet);
                      }}
                      className="h-4 w-4 text-primary border-gray-300 rounded mr-2 focus:ring-primary-focus"
                    />
                    <label htmlFor={`skill-${skill.id}-user-${currentUserFormData.id}`} className="text-sm text-gray-700">{skill.name}</label>
                  </div>
                ))}
                {allGlobalSkills.length === 0 && <p className="text-xs text-gray-400">No global skills defined yet. Add them in 'Manage Skills'.</p>}
              </div>
            </div>
            )}

            <div className="flex justify-end space-x-2 pt-4 mt-2 border-t">
              <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>Save User</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* New Section for Users from PHP Backend */}
      <div className="mt-12 pt-6 border-t border-gray-300">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-primary">Users from PHP Backend</h3>
            <Button onClick={() => setShowPhpCreateForm(!showPhpCreateForm)} variant="secondary" size="sm">
                {showPhpCreateForm ? 'Cancel' : 'Add User (PHP Backend)'}
            </Button>
        </div>

        {showPhpCreateForm && (
            <form onSubmit={handleCreatePhpUser} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="text-md font-semibold mb-3">New PHP User Form</h4>
                {createPhpUserError && <div className="mb-3 p-2 bg-red-100 text-red-700 rounded-md">{createPhpUserError}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                        <label htmlFor="php_username" className="block text-sm font-medium text-gray-700 mb-1">Username*</label>
                        <input type="text" name="username" id="php_username" value={phpUserFormData.username} onChange={handlePhpUserFormChange} required className="p-2 border border-gray-300 rounded-md w-full" />
                    </div>
                    <div>
                        <label htmlFor="php_email" className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
                        <input type="email" name="email" id="php_email" value={phpUserFormData.email} onChange={handlePhpUserFormChange} required className="p-2 border border-gray-300 rounded-md w-full" />
                    </div>
                    <div>
                        <label htmlFor="php_password" className="block text-sm font-medium text-gray-700 mb-1">Password*</label>
                        <input type="password" name="password" id="php_password" value={phpUserFormData.password} onChange={handlePhpUserFormChange} required className="p-2 border border-gray-300 rounded-md w-full" />
                    </div>
                    <div>
                        <label htmlFor="php_role" className="block text-sm font-medium text-gray-700 mb-1">Role*</label>
                        <select name="role" id="php_role" value={phpUserFormData.role} onChange={handlePhpUserFormChange} className="p-2 border border-gray-300 rounded-md w-full bg-white">
                            <option value={UserRole.CLIENT}>Client</option>
                            <option value={UserRole.FREELANCER}>Freelancer</option>
                            <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="php_first_name" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input type="text" name="first_name" id="php_first_name" value={phpUserFormData.first_name} onChange={handlePhpUserFormChange} className="p-2 border border-gray-300 rounded-md w-full" />
                    </div>
                    <div>
                        <label htmlFor="php_last_name" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input type="text" name="last_name" id="php_last_name" value={phpUserFormData.last_name} onChange={handlePhpUserFormChange} className="p-2 border border-gray-300 rounded-md w-full" />
                    </div>
                </div>
                <Button type="submit" variant="primary" disabled={isCreatingPhpUser} isLoading={isCreatingPhpUser}>
                    {isCreatingPhpUser ? 'Creating...' : 'Create PHP User'}
                </Button>
            </form>
        )}

        {phpUsersError && !showPhpCreateForm && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{phpUsersError}</div>}

        {isPhpUsersLoading ? (
          <div className="p-6 text-center flex flex-col items-center justify-center h-40">
            <LoadingSpinner text="Loading users from PHP backend..." />
          </div>
        ) : phpUsers.length === 0 && !phpUsersError ? (
          <div className="p-6 text-center text-gray-500">
            <p>No users found from the PHP backend.</p>
          </div>
        ) : phpUsers.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Name</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {phpUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-green-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.first_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.last_name || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
};
export default UserManagement;
