import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useAuth } from './AuthContext';
import { fetchMyFullProfileAPI, updateMyProfileAPI, fetchAllSkillsAPI, MyFullProfileResponse, UpdateMyProfilePayload, Skill } from '../apiService';
import Button from './shared/Button';
import { UserRole } from '../types'; // Assuming UserRole is in types.ts

// Helper to initialize form data
const getInitialFormData = (profile: MyFullProfileResponse | null): UpdateMyProfilePayload => {
  if (!profile) {
    return {
      name: '',
      phone_number: '',
      company: '',
      experience: '',
      avatar_url: '',
      hourly_rate: null,
      skill_ids: []
    };
  }
  return {
    name: profile.name || '',
    phone_number: profile.phone_number || '',
    company: profile.company || '',
    experience: profile.experience || '',
    avatar_url: profile.avatar_url || '',
    hourly_rate: profile.role === UserRole.FREELANCER ? profile.hourly_rate : null,
    skill_ids: profile.skills?.map(s => s.id) || []
  };
};


const UserProfilePage: React.FC = () => {
  const { user } = useAuth(); // Basic user info from AuthContext

  const [profileData, setProfileData] = useState<MyFullProfileResponse | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<UpdateMyProfilePayload>(getInitialFormData(null));
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [allSkillsOptions, setAllSkillsOptions] = useState<Skill[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMyFullProfileAPI();
      setProfileData(data);
      setFormData(getInitialFormData(data));
      setSelectedSkillIds(data.skills?.map(s => s.id) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile details.');
      console.error("Error fetching profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (editMode) {
      fetchAllSkillsAPI()
        .then(setAllSkillsOptions)
        .catch(err => {
          console.error("Failed to fetch all skills:", err);
          setError("Could not load skill options. Please try again.");
        });
    }
  }, [editMode]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, hourly_rate: value === '' ? null : parseFloat(value) }));
  };

  const handleSkillSelectionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value, 10));
    setSelectedSkillIds(selectedOptions);
  };

  const toggleEditMode = () => {
    if (editMode && profileData) { // If canceling edit mode
      setFormData(getInitialFormData(profileData)); // Reset form to profile data
      setSelectedSkillIds(profileData.skills?.map(s => s.id) || []);
    }
    setEditMode(!editMode);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmitProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const payload: UpdateMyProfilePayload = {
      ...formData,
      skill_ids: selectedSkillIds,
    };
     if (profileData?.role !== UserRole.FREELANCER) {
        delete payload.hourly_rate; // Ensure non-freelancers don't send this
    }


    try {
      await updateMyProfileAPI(payload);
      setSuccessMessage("Profile updated successfully!");
      setEditMode(false);
      fetchProfile(); // Refresh profile data
    } catch (err) {
      const apiError = err as any;
      setError(apiError.data?.error || apiError.message || 'Failed to update profile.');
      console.error("Error updating profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading profile...</div>;
  }

  if (error && !profileData && !editMode) { // Show full page error if initial load failed
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }

  const displayUsername = profileData?.username || user?.username || 'User';
  const displayEmail = profileData?.email || user?.email || 'N/A';
  const displayRole = profileData?.role || user?.role || 'N/A';
  const avatarSrc = profileData?.avatar_url || `https://ui-avatars.com/api/?name=${displayUsername.replace(' ', '+')}&background=random&color=fff&size=96`;


  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 bg-white shadow-xl rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
        {!editMode && (
          <Button onClick={toggleEditMode} variant="primary">Edit Profile</Button>
        )}
      </div>

      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">{successMessage}</div>}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
      
      <form onSubmit={handleSubmitProfileUpdate} className="space-y-6">
        <div className="flex items-center space-x-4 mb-8">
            <img
              src={avatarSrc}
              alt={displayUsername}
              className="h-24 w-24 rounded-full shadow-md object-cover"
            />
            <div>
                 <h2 className="text-2xl font-semibold text-gray-700">{profileData?.name || displayUsername}</h2>
                 <p className="text-gray-500">{displayEmail} ({displayRole})</p>
            </div>
        </div>
        
        {!editMode ? (
          <>
            {profileData?.name && <div><span className="block text-sm font-medium text-gray-700">Full Name</span><p className="mt-1 bg-gray-50 p-3 rounded-md">{profileData.name}</p></div>}
            {profileData?.phone_number && <div><span className="block text-sm font-medium text-gray-700">Phone</span><p className="mt-1 bg-gray-50 p-3 rounded-md">{profileData.phone_number}</p></div>}
            {profileData?.company && <div><span className="block text-sm font-medium text-gray-700">Company</span><p className="mt-1 bg-gray-50 p-3 rounded-md">{profileData.company}</p></div>}
            {profileData?.experience && <div><span className="block text-sm font-medium text-gray-700">Experience/Bio</span><p className="mt-1 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{profileData.experience}</p></div>}
            {profileData?.role === UserRole.FREELANCER && profileData.hourly_rate !== null && (
              <div><span className="block text-sm font-medium text-gray-700">Hourly Rate</span><p className="mt-1 bg-gray-50 p-3 rounded-md">${profileData.hourly_rate.toFixed(2)}</p></div>
            )}
            {profileData?.skills && profileData.skills.length > 0 && (
              <div>
                <span className="block text-sm font-medium text-gray-700">Skills</span>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {profileData.skills.map(skill => (
                    <li key={skill.id} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">{skill.name}</li>
                  ))}
                </ul>
              </div>
            )}
             <div className="mt-4"><span className="block text-sm font-medium text-gray-700">Username</span><p className="mt-1 bg-gray-100 p-3 rounded-md text-gray-600 cursor-not-allowed">{displayUsername}</p></div>
             <div className="mt-4"><span className="block text-sm font-medium text-gray-700">Email</span><p className="mt-1 bg-gray-100 p-3 rounded-md text-gray-600 cursor-not-allowed">{displayEmail}</p></div>
             <div className="mt-4"><span className="block text-sm font-medium text-gray-700">Role</span><p className="mt-1 bg-gray-100 p-3 rounded-md text-gray-600 cursor-not-allowed">{displayRole}</p></div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
              <input type="text" name="name" id="name" value={formData.name || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input type="text" name="phone_number" id="phone_number" value={formData.phone_number || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700">Company</label>
              <input type="text" name="company" id="company" value={formData.company || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="experience" className="block text-sm font-medium text-gray-700">Experience/Bio</label>
              <textarea name="experience" id="experience" value={formData.experience || ''} onChange={handleInputChange} rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700">Avatar URL</label>
              <input type="url" name="avatar_url" id="avatar_url" value={formData.avatar_url || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="https://example.com/avatar.png" />
            </div>
            {profileData?.role === UserRole.FREELANCER && (
              <div>
                <label htmlFor="hourly_rate" className="block text-sm font-medium text-gray-700">Hourly Rate ($)</label>
                <input type="number" name="hourly_rate" id="hourly_rate" value={formData.hourly_rate === null || formData.hourly_rate === undefined ? '' : formData.hourly_rate} onChange={handleRateChange} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
            )}
            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-gray-700">Skills</label>
              <select
                multiple
                name="skills"
                id="skills"
                value={selectedSkillIds.map(String)} // Value needs to be array of strings for multi-select
                onChange={handleSkillSelectionChange}
                className="mt-1 block w-full h-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                {allSkillsOptions.map(skill => (
                  <option key={skill.id} value={skill.id}>{skill.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple skills.</p>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
              <Button type="button" variant="secondary" onClick={toggleEditMode} disabled={isSaving}>Cancel</Button>
              <Button type="submit" variant="primary" isLoading={isSaving} disabled={isSaving}>Save Changes</Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default UserProfilePage;
