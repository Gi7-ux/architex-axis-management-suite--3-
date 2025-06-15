import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { fetchUsersAPI, addUserAPI, updateUserAPI, deleteUserAPI } from '../../apiService';
import Button from '../shared/Button';
import { PencilIcon, TrashIcon, PlusCircleIcon } from '../shared/IconComponents';
import Modal from '../shared/Modal';
import LoadingSpinner from '../shared/LoadingSpinner';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [currentSkill, setCurrentSkill] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedUsers = await fetchUsersAPI();
      setUsers(fetchedUsers);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || "Failed to load users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenModal = (userToEdit: User | null = null) => {
    if (userToEdit) {
        setEditingUser({ ...userToEdit, skills: userToEdit.skills ? [...userToEdit.skills] : [] });
    } else {
        setEditingUser({ name: '', email: '', role: UserRole.CLIENT, hourlyRate: undefined, skills: [], company:'', experience:'', phoneNumber:'' });
    }
    setCurrentSkill('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setCurrentSkill('');
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);
    setError(null);

    const userToSave = { ...editingUser };
    if (userToSave.role !== UserRole.FREELANCER) {
      delete userToSave.hourlyRate; 
    } else {
      userToSave.hourlyRate = userToSave.hourlyRate ? Number(userToSave.hourlyRate) : undefined;
    }
    userToSave.skills = userToSave.skills || [];

    try {
        if ('id' in userToSave && userToSave.id) {
          await updateUserAPI(userToSave.id, userToSave as User);
        } else {
          await addUserAPI(userToSave as Omit<User, 'id' | 'avatarUrl'>);
        }
        await loadUsers(); 
        handleCloseModal();
    } catch (err: any) {
        console.error("Error saving user:", err);
        setError(err.message || "Failed to save user data.");
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        setIsSubmitting(true);
        setError(null);
        try {
            await deleteUserAPI(userId);
            await loadUsers(); 
        } catch (err: any) {
            console.error("Error deleting user:", err);
            setError(err.message || "Failed to delete user.");
        } finally {
            setIsSubmitting(false);
        }
    }
  };

  const handleAddSkillToEditingUser = () => {
    if (currentSkill.trim() && editingUser && !editingUser.skills?.includes(currentSkill.trim())) {
      setEditingUser(prev => ({...prev, skills: [...(prev?.skills || []), currentSkill.trim()]}));
      setCurrentSkill('');
    }
  };

  const handleRemoveSkillFromEditingUser = (skillToRemove: string) => {
    if (editingUser) {
        setEditingUser(prev => ({...prev, skills: prev?.skills?.filter(skill => skill !== skillToRemove)}));
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.skills && user.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase())))
  );

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
        <h2 className="text-2xl font-semibold text-primary">User Management</h2>
        <Button onClick={() => handleOpenModal()} leftIcon={<PlusCircleIcon className="w-5 h-5"/>} variant="primary">
          Add User
        </Button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

      <input 
        type="text"
        placeholder="Search users by name, email, role, skill..."
        className="mb-6 p-2.5 border border-gray-300 rounded-lg w-full sm:w-2/3 lg:w-1/2 focus:ring-primary focus:border-primary bg-white"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {!isLoading && users.length === 0 && !error && (
        <div className="p-6 text-center text-gray-500">
            <p>No users found in the system.</p>
            <p className="text-sm mt-1">You can add new users using the "Add User" button.</p>
        </div>
      )}

      {users.length > 0 && (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avatar</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email & Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role & Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate (R/hr)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skills</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-primary-extralight transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <img className="h-10 w-10 rounded-full border border-gray-200" src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name.replace(' ', '+')}&background=A6C4BD&color=2A5B53`} alt={user.name} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{user.email}</div>
                    <div className="text-xs text-gray-400">{user.phoneNumber || 'No phone'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === UserRole.ADMIN ? 'bg-slate-200 text-slate-700' : 
                        user.role === UserRole.FREELANCER ? 'bg-accent text-secondary' : 
                        'bg-primary-extralight text-primary'
                    }`}>
                        {user.role}
                    </span>
                    <div className="text-xs text-gray-400 mt-1">{user.company || 'No company'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.role === UserRole.FREELANCER && user.hourlyRate ? `R ${user.hourlyRate}` : 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                        {(user.skills && user.skills.length > 0) ? user.skills.slice(0,3).map(skill => (
                            <span key={skill} className="px-2 py-0.5 text-xs bg-accent text-secondary rounded-full font-medium">{skill}</span>
                        )) : <span className="text-xs text-gray-400">No skills</span> }
                        {user.skills && user.skills.length > 3 && <span className="text-xs text-gray-400">...</span>}
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenModal(user)} aria-label="Edit" className="text-primary hover:text-primary-hover p-1">
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  {user.role !== UserRole.ADMIN && ( 
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)} aria-label="Delete" className="text-red-500 hover:text-red-700 p-1" disabled={isSubmitting}>
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
             {filteredUsers.length === 0 && users.length > 0 && (
                <tr>
                    <td colSpan={7} className="text-center py-4 text-gray-500">No users match your search criteria.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {isModalOpen && editingUser && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={('id' in editingUser && editingUser.id) ? 'Edit User' : 'Add User'} size="2xl">
          <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
              <input type="text" id="name" value={editingUser.name || ''} onChange={(e) => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white" required />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" id="email" value={editingUser.email || ''} onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white" required />
            </div>
            { !('id' in editingUser && editingUser.id) && ( // Only show password for new users
                 <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                    <input type="password" id="password" onChange={(e) => setEditingUser(prev => ({ ...prev, password: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white" required />
                </div>
            )}
             <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input type="tel" id="phoneNumber" value={editingUser.phoneNumber || ''} onChange={(e) => setEditingUser(prev => ({ ...prev, phoneNumber: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white" />
            </div>
             <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700">Company</label>
              <input type="text" id="company" value={editingUser.company || ''} onChange={(e) => setEditingUser(prev => ({ ...prev, company: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white" />
            </div>
             <div>
                <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700">Avatar URL</label>
                <input type="url" id="avatarUrl" value={editingUser.avatarUrl || ''} onChange={(e) => setEditingUser(prev => ({ ...prev, avatarUrl: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white" placeholder="https://example.com/avatar.png" />
            </div>
            <div>
              <label htmlFor="experience" className="block text-sm font-medium text-gray-700">Experience / Bio</label>
              <textarea id="experience" value={editingUser.experience || ''} onChange={(e) => setEditingUser(prev => ({ ...prev, experience: e.target.value }))} rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white" />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
              <select id="role" value={editingUser.role || UserRole.CLIENT}
                onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value as UserRole, hourlyRate: (e.target.value as UserRole) === UserRole.FREELANCER ? prev?.hourlyRate || undefined : undefined }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary">
                {Object.values(UserRole).map(role => (
                  <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                ))}
              </select>
            </div>
            {editingUser.role === UserRole.FREELANCER && (
              <div>
                <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700">Hourly Rate (R)</label>
                <input type="number" id="hourlyRate" value={editingUser.hourlyRate || ''}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || undefined }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white"
                  placeholder="e.g., 500" min="0"/>
              </div>
            )}
            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-gray-700">Skills</label>
              <div className="flex items-center mt-1">
                <input type="text" id="skills" value={currentSkill} onChange={(e) => setCurrentSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkillToEditingUser();}}}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white" placeholder="Type skill and press Enter" />
                <Button type="button" onClick={handleAddSkillToEditingUser} className="rounded-l-none !py-2" variant="secondary">Add</Button>
              </div>
              {editingUser.skills && editingUser.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {editingUser.skills.map(skill => (
                    <span key={skill} className="flex items-center px-2.5 py-1 bg-accent text-secondary text-sm rounded-full font-medium">
                      {skill} <button type="button" onClick={() => handleRemoveSkillFromEditingUser(skill)} className="ml-1.5 text-secondary hover:text-red-700 font-bold">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>Save User</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default UserManagement;
