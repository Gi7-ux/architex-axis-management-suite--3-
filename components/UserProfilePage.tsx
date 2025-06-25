import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useAuth } from './AuthContext';
import { fetchMyFullProfileAPI, updateMyProfileAPI, fetchAllSkillsAPI, MyFullProfileResponse, UpdateMyProfilePayload, Skill, ApiError as ApiErrorType } from '../apiService'; // Import ApiErrorType
import Button from './shared/Button';
import { UserRole } from '../types';
import ErrorMessage from './shared/ErrorMessage'; // Import ErrorMessage component

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
  const { user, refreshAuthUser } = useAuth(); // Get refreshAuthUser
  const [profileData, setProfileData] = useState<MyFullProfileResponse | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<UpdateMyProfilePayload>(getInitialFormData(null));
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [allSkillsOptions, setAllSkillsOptions] = useState<Skill[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<ApiErrorType | string | null>(null); // Updated error state type
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
      if (err instanceof ApiErrorType) {
        setError(err);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch profile details.');
      }
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
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
  };

  const handleRateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, hourly_rate: value === '' ? null : parseFloat(value) }));
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
  };

  const handleSkillSelectionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value, 10));
    setSelectedSkillIds(selectedOptions);
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
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
      const updateResponse = await updateMyProfileAPI(payload);
      setSuccessMessage(updateResponse.message || "Profile updated successfully!");
      setEditMode(false);
      await fetchProfile(); // Refresh profile data from DB
      if (user && profileData) { // Refresh user in AuthContext if name/avatar changed
        const updatedUserForAuth = {
            ...user,
            name: payload.name || user.name,
            avatarUrl: payload.avatar_url || user.avatarUrl,
        };
        refreshAuthUser(updatedUserForAuth);
      }
    } catch (err) {
      if (err instanceof ApiErrorType) {
        setError(err);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update profile.');
      }
      console.error("Error updating profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-600">Loading profile...</div>;
  }

  // Show full page error only if initial load failed and not in edit mode
  if (error && !profileData && !editMode && !isSaving) {
    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8">
            <ErrorMessage error={error} />
        </div>
    );
  }

  const displayUsername = profileData?.username || user?.username || 'User';
  const displayEmail = profileData?.email || user?.email || 'N/A';
  const displayRole = profileData?.role || user?.role || 'N/A';
  const avatarSrc = formData.avatar_url || profileData?.avatar_url || `https://ui-avatars.com/api/?name=${displayUsername.replace(' ', '+')}&background=random&color=fff&size=128`;


  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 bg-white shadow-xl rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 pb-4 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 sm:mb-0">My Profile</h1>
        {!editMode && (
          <Button onClick={toggleEditMode} variant="primary" size="md">Edit Profile</Button>
        )}
      </div>

      {successMessage && <div className="mb-6 p-3 bg-green-100 text-green-700 border border-green-200 rounded-md text-sm">{successMessage}</div>}
      {/* Display error message using the component, not shown during initial load error handled above or during active saving */}
      {editMode && error && !isSaving && <ErrorMessage error={error} />}
      
      <form onSubmit={handleSubmitProfileUpdate} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
            <img
              src={avatarSrc}
              alt={displayUsername}
              className="h-32 w-32 rounded-full shadow-lg object-cover border-4 border-white"
            />
            <div className="text-center sm:text-left">
                 <h2 className="text-2xl font-semibold text-gray-800">{profileData?.name || displayUsername}</h2>
                 <p className="text-gray-600">{displayEmail}</p>
                 <p className="text-sm text-gray-500 capitalize">{displayRole}</p>
            </div>
        </div>
        
        {!editMode ? (
          <div className="space-y-4">
            {profileData?.name && <div><label className="block text-sm font-medium text-gray-500">Full Name</label><p className="mt-1 text-gray-800 bg-gray-50 p-3 rounded-md border border-gray-200">{profileData.name}</p></div>}
            {profileData?.phone_number && <div><label className="block text-sm font-medium text-gray-500">Phone</label><p className="mt-1 text-gray-800 bg-gray-50 p-3 rounded-md border border-gray-200">{profileData.phone_number}</p></div>}
            {profileData?.company && <div><label className="block text-sm font-medium text-gray-500">Company</label><p className="mt-1 text-gray-800 bg-gray-50 p-3 rounded-md border border-gray-200">{profileData.company}</p></div>}
            {profileData?.experience && <div><label className="block text-sm font-medium text-gray-500">Experience/Bio</label><p className="mt-1 text-gray-800 bg-gray-50 p-3 rounded-md whitespace-pre-wrap border border-gray-200">{profileData.experience}</p></div>}
            {profileData?.role === UserRole.FREELANCER && profileData.hourly_rate !== null && (
              <div><label className="block text-sm font-medium text-gray-500">Hourly Rate</label><p className="mt-1 text-gray-800 bg-gray-50 p-3 rounded-md border border-gray-200">${profileData.hourly_rate.toFixed(2)}</p></div>
            )}
            {profileData?.skills && profileData.skills.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Skills</label>
                <ul className="flex flex-wrap gap-2">
                  {profileData.skills.map(skill => (
                    <li key={skill.id} className="bg-primary-extralight text-primary px-3 py-1.5 rounded-full text-xs font-medium border border-primary-light">{skill.name}</li>
                  ))}
                </ul>
              </div>
            )}
             <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
                <div><label className="block text-sm font-medium text-gray-500">Username</label><p className="mt-1 text-gray-600 bg-gray-100 p-3 rounded-md border border-gray-200 cursor-not-allowed">{displayUsername}</p></div>
                <div><label className="block text-sm font-medium text-gray-500">Email</label><p className="mt-1 text-gray-600 bg-gray-100 p-3 rounded-md border border-gray-200 cursor-not-allowed">{displayEmail}</p></div>
                <div><label className="block text-sm font-medium text-gray-500">Role</label><p className="mt-1 text-gray-600 bg-gray-100 p-3 rounded-md border border-gray-200 cursor-not-allowed capitalize">{displayRole}</p></div>
             </div>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
              <input type="text" name="name" id="name" value={formData.name || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input type="text" name="phone_number" id="phone_number" value={formData.phone_number || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700">Company</label>
              <input type="text" name="company" id="company" value={formData.company || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div>
              <label htmlFor="experience" className="block text-sm font-medium text-gray-700">Experience/Bio</label>
              <textarea name="experience" id="experience" value={formData.experience || ''} onChange={handleInputChange} rows={4} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div>
              <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700">Avatar URL</label>
              <input type="url" name="avatar_url" id="avatar_url" value={formData.avatar_url || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" placeholder="https://example.com/avatar.png" />
            </div>
            {profileData?.role === UserRole.FREELANCER && (
              <div>
                <label htmlFor="hourly_rate" className="block text-sm font-medium text-gray-700">Hourly Rate ($)</label>
                <input type="number" name="hourly_rate" id="hourly_rate" value={formData.hourly_rate === null || formData.hourly_rate === undefined ? '' : formData.hourly_rate} onChange={handleRateChange} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
              </div>
            )}
            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-gray-700">Skills</label>
              <select
                multiple
                name="skills"
                id="skills"
                value={selectedSkillIds.map(String)}
                onChange={handleSkillSelectionChange}
                className="mt-1 block w-full h-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              >
                {allSkillsOptions.map(skill => (
                  <option key={skill.id} value={skill.id}>{skill.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple skills.</p>
            </div>
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-8">
              <Button type="button" variant="ghost" size="md" onClick={toggleEditMode} disabled={isSaving}>Cancel</Button>
              <Button type="submit" variant="primary" size="md" isLoading={isSaving} disabled={isSaving}>Save Changes</Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default UserProfilePage;
