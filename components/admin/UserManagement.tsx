import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { UserRole } from '../../types'; // Keep UserRole
import {
    adminFetchAllUsersAPI,
    adminUpdateUserRoleAPI,
    AdminUserView, // Use new type
    AdminUpdateUserRolePayload,
    ApiError // Import ApiError
} from '../../apiService';
import Button from '../shared/Button';
import { PencilIcon } from '../shared/IconComponents'; // Removed TrashIcon, PlusCircleIcon
import Modal from '../shared/Modal';
import LoadingSpinner from '../shared/LoadingSpinner';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUserView[]>([]); // Use AdminUserView
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // For editing role, just need user ID and current role to pre-fill
  const [editingUser, setEditingUser] = useState<AdminUserView | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedUsers = await adminFetchAllUsersAPI();
      setUsers(fetchedUsers);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, []); // useCallback for stable reference

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenModal = (userToEdit: AdminUserView) => {
    setEditingUser(userToEdit);
    setSelectedRole(userToEdit.role); // Pre-fill current role
    setIsModalOpen(true);
    setError(null); // Clear previous errors
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setSelectedRole('');
  };

  const handleRoleUpdate = async () => {
    if (!editingUser || !selectedRole) {
        setError("No user selected or role chosen for update.");
        return;
    }
    if (editingUser.role === selectedRole) {
        setError("The new role is the same as the current role.");
        handleCloseModal(); // Close modal as no change
        return;
    }

    setIsSubmitting(true);
    setError(null);
    const payload: AdminUpdateUserRolePayload = {
      user_id: editingUser.id,
      new_role: selectedRole
    };

    try {
      await adminUpdateUserRoleAPI(payload);
      await loadUsers();
      handleCloseModal();
    } catch (err: any) {
      console.error("Error updating user role:", err);
      if (err instanceof ApiError) {
        setError(err.message || "Failed to update user role.");
      } else {
        setError("An unexpected error occurred while updating role.");
      }
      // Keep modal open if error to show message
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter users based on AdminUserView properties
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && users.length === 0) { 
    return <LoadingSpinner text="Loading users..." className="p-6" />;
  }

  return (
    <div className="p-4 md:p-6 bg-white shadow-xl rounded-lg">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-primary">User Management</h2>
        {/* "Add User" button removed for now */}
      </div>

      {error && !isModalOpen && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

      <input 
        type="text"
        placeholder="Search users by username, email, role..."
        className="mb-6 p-2.5 border border-gray-300 rounded-lg w-full sm:w-2/3 lg:w-1/2 focus:ring-primary focus:border-primary bg-white"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {!isLoading && users.length === 0 && !error && (
        <p className="p-6 text-center text-gray-500">No users found.</p>
      )}

      {users.length > 0 && (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Simplified columns based on AdminUserView */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-primary-extralight transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === UserRole.ADMIN ? 'bg-slate-200 text-slate-700' :
                      user.role === UserRole.FREELANCER ? 'bg-accent text-secondary' :
                      'bg-primary-extralight text-primary'
                  }`}>{user.role}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenModal(user)} aria-label="Edit Role" className="text-primary hover:text-primary-hover p-1">
                    <PencilIcon className="w-4 h-4" /> Edit Role
                  </Button>
                  {/* Delete button removed for now */}
                </td>
              </tr>
            ))}
             {filteredUsers.length === 0 && users.length > 0 && (
                <tr><td colSpan={6} className="text-center py-4 text-gray-500">No users match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {isModalOpen && editingUser && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={`Edit Role for ${editingUser.username}`} size="md">
          {/* Modal specific error display */}
          {error && isModalOpen && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
          <form onSubmit={(e) => { e.preventDefault(); handleRoleUpdate(); }} className="space-y-4">
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">New Role</label>
              <select id="role" value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary">
                <option value="" disabled>Select a role</option>
                {Object.values(UserRole).map(role => (
                  <option key={role} value={role} disabled={role === UserRole.ADMIN && editingUser.role !== UserRole.ADMIN && editingUser.id !== 1 /* Example: prevent assigning new admins easily */}>
                  {/* Simple protection: cannot easily make others admin unless they are already admin or a specific superadmin.
                      More robust logic might be needed on backend if this is critical.
                      For now, backend prevents admin changing own role. */}
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting || !selectedRole}>Update Role</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default UserManagement;
