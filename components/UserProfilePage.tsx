import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { User, UserRole } from '../types';
import Button from './shared/Button';
// MOCK_USERS removed, apiService will be used via AuthContext

const UserProfilePage: React.FC = () => {
  const { user, updateCurrentUserDetails, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState<Partial<User>>({});
  const [currentSkill, setCurrentSkill] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email, // Email might not be editable, depending on backend logic
        phoneNumber: user.phoneNumber || '',
        company: user.company || '',
        experience: user.experience || '',
        hourlyRate: user.hourlyRate || undefined,
        avatarUrl: user.avatarUrl || '', // Include avatarUrl if it's part of the form
      });
      setSkills(user.skills || []);
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, hourlyRate: value === '' ? undefined : parseFloat(value) }));
  };

  const handleAddSkill = () => {
    if (currentSkill.trim() && !skills.includes(currentSkill.trim())) {
      setSkills([...skills, currentSkill.trim()]);
      setCurrentSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const updatedUserDetails: Partial<User> = {
      ...formData,
      skills,
    };
    if (user.role !== UserRole.FREELANCER) {
      delete updatedUserDetails.hourlyRate;
    }

    try {
      const success = await updateCurrentUserDetails(updatedUserDetails); // updateCurrentUserDetails now returns a boolean
      if (success) {
        setSuccessMessage('Profile updated successfully!');
        setIsEditing(false);
      } else {
        setErrorMessage('Failed to update profile. The server might have rejected the changes or an error occurred.');
      }
    } catch (error) { // This catch might not be strictly necessary if updateCurrentUserDetails handles its own errors and returns false
      console.error("Profile update error:", error);
      setErrorMessage('Failed to update profile due to an unexpected error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !user) {
    return <div className="p-6 text-center">Loading profile...</div>;
  }

  const renderField = (label: string, value: string | number | undefined, name: keyof User, type: string = "text", isTextarea: boolean = false, readOnly: boolean = false) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
      {isEditing && !readOnly ? (
        isTextarea ? (
          <textarea
            id={name} name={name as string} value={formData[name] as string || ''} onChange={handleChange} rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
        ) : (
          <input
            type={type} id={name} name={name as string} value={formData[name] as string | number || ''} 
            onChange={type === 'number' && name === 'hourlyRate' ? handleRateChange : handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            min={type === 'number' ? "0" : undefined}
          />
        )
      ) : (
        <p className={`mt-1 bg-gray-50 p-2 rounded-md whitespace-pre-wrap min-h-[40px] ${readOnly && isEditing ? 'text-gray-500 italic' : 'text-gray-900'}`}>
            {name === 'hourlyRate' && value ? `R ${value}` : (value || <span className="text-gray-400">Not set</span>) }
            {readOnly && isEditing && <span className="text-xs"> (Not editable)</span>}
        </p>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 bg-white shadow-xl rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="primary">Edit Profile</Button>
        )}
      </div>

      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">{successMessage}</div>}
      {errorMessage && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{errorMessage}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center space-x-4 mb-8">
            <img src={formData.avatarUrl || `https://ui-avatars.com/api/?name=${(formData.name || user.name).replace(' ', '+')}&background=random&color=fff`} alt={formData.name || user.name} className="h-24 w-24 rounded-full shadow-md" />
            <div>
                 <h2 className="text-2xl font-semibold text-gray-700">{formData.name || user.name}</h2>
                 <p className="text-gray-500">{formData.email || user.email} ({user.role})</p>
            </div>
        </div>
        
        {isEditing && renderField("Avatar URL", formData.avatarUrl, "avatarUrl", "url")}

        {renderField("Full Name", formData.name, "name")}
        {renderField("Email Address", formData.email, "email", "email", false, true)} {/* Email generally not editable */}
        {renderField("Phone Number", formData.phoneNumber, "phoneNumber", "tel")}
        {renderField("Company", formData.company, "company")}
        {renderField("Experience / Bio", formData.experience, "experience", "text", true)}

        {user.role === UserRole.FREELANCER && (
            renderField("Hourly Rate (R)", formData.hourlyRate, "hourlyRate", "number")
        )}

        <div>
          <label htmlFor="skills" className="block text-sm font-medium text-gray-700">Skills</label>
          {isEditing ? (
            <>
              <div className="flex items-center mt-1">
                <input
                  type="text" id="skills" value={currentSkill} onChange={(e) => setCurrentSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill();}}}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Add a skill and press Enter"
                />
                <Button type="button" onClick={handleAddSkill} className="rounded-l-none" variant="secondary">Add</Button>
              </div>
              {skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <span key={skill} className="flex items-center px-2.5 py-1 bg-accent text-secondary text-sm rounded-full font-medium">
                      {skill} <button type="button" onClick={() => handleRemoveSkill(skill)} className="ml-1.5 text-secondary hover:text-red-700 font-bold">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
             <div className="mt-1 flex flex-wrap gap-2 bg-gray-50 p-2 rounded-md min-h-[40px]">
                {skills.length > 0 ? skills.map(skill => (
                    <span key={skill} className="px-2.5 py-1 bg-accent text-secondary text-sm rounded-full font-medium">
                    {skill}
                    </span>
                )) : <span className="text-gray-400">No skills added</span>}
            </div>
          )}
        </div>

        {isEditing && (
          <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
            <Button type="button" variant="secondary" onClick={() => { setIsEditing(false); if (user) { setFormData(user); setSkills(user.skills || []); } }} disabled={isSaving}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSaving} disabled={isSaving}>Save Changes</Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default UserProfilePage;
