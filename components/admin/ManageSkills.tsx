import React, { useState, useEffect, useCallback } from 'react';
import { Skill, fetchAllSkillsAPI, adminAddSkillAPI, AdminAddSkillPayload, ApiError } from '../../apiService';
import Button from '../shared/Button';
import LoadingSpinner from '../shared/LoadingSpinner';

const ManageSkills: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSkillName, setNewSkillName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSkills = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const fetchedSkills = await fetchAllSkillsAPI();
      setSkills(fetchedSkills.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: any) {
      setError(err.message || "Failed to load skills.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) {
      setError("Skill name cannot be empty.");
      return;
    }
    setIsSubmitting(true); setError(null);
    try {
      const payload: AdminAddSkillPayload = { name: newSkillName.trim() };
      await adminAddSkillAPI(payload);
      setNewSkillName('');
      await loadSkills(); // Refresh list
    } catch (err: any) {
      if (err instanceof ApiError) setError(err.message || "Failed to add skill.");
      else setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpinner text="Loading skills..." />;

  return (
    <div className="p-4 md:p-6 bg-white shadow-xl rounded-lg">
      <h2 className="text-2xl font-semibold text-primary mb-6">Manage Global Skills</h2>
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

      <form onSubmit={handleAddSkill} className="mb-6 flex gap-2 items-start">
        <div className="flex-grow">
          <label htmlFor="newSkillName" className="sr-only">New Skill Name</label>
          <input
            type="text"
            id="newSkillName"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            placeholder="Enter new skill name"
            className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            disabled={isSubmitting}
          />
        </div>
        <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting || !newSkillName.trim()}>
          Add Skill
        </Button>
      </form>

      {skills.length === 0 && !isLoading && <p className="text-gray-500">No skills defined yet.</p>}
      {skills.length > 0 && (
        <div className="max-h-96 overflow-y-auto border rounded-lg">
          <ul className="divide-y divide-gray-200">
            {skills.map(skill => (
              <li key={skill.id} className="px-4 py-3 flex justify-between items-center">
                <span className="text-gray-700">{skill.name} (ID: {skill.id})</span>
                {/* Optional: Edit/Delete buttons for global skills - deferred */}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
export default ManageSkills;
