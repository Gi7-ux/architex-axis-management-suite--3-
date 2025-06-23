import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { fetchMyJobCardsAPI, MyJobCardItem } from '../../apiService';
import { UserRole } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';
import Button from '../shared/Button'; // If a button is preferred for linking
import { NAV_LINKS } from '../../constants'; // Assuming NAV_LINKS is correctly set up

const FreelancerMyJobCards: React.FC = () => {
  const { user } = useAuth();
  const [myJobCards, setMyJobCards] = useState<MyJobCardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobCards = useCallback(async () => {
    if (!user || user.role !== UserRole.FREELANCER) {
      setError('This page is for freelancers only.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyJobCardsAPI();
      setMyJobCards(data);
    } catch (err) {
      console.error('Error fetching my job cards:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadJobCards();
  }, [loadJobCards]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="p-4 text-red-600 bg-red-100 rounded-md text-center">{error}</div>;
  }

  if (!user || user.role !== UserRole.FREELANCER) {
    // This case should ideally be handled by routing/ProtectedView, but as a fallback:
    return <div className="p-4 text-orange-600 bg-orange-100 rounded-md text-center">Access denied. This page is for freelancers.</div>;
  }

  if (myJobCards.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        You have no job cards assigned to you at the moment.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">My Assigned Job Cards</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myJobCards.map((jobCard) => (
          <div key={jobCard.id} className="bg-white shadow-lg rounded-lg p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold text-indigo-700 mb-2">{jobCard.title}</h2>
              <p className="text-sm text-gray-500 mb-1">
                Project:
                <Link
                  to={NAV_LINKS.PROJECT_DETAILS.replace(':id', String(jobCard.project_id))}
                  className="text-indigo-600 hover:text-indigo-800 font-medium ml-1"
                >
                  {jobCard.project_title}
                </Link>
              </p>
              <p className="text-sm text-gray-700 mb-1">
                Status: <span className={`px-2 py-0.5 inline-block text-xs font-semibold rounded-full ${
                  jobCard.status === 'todo' ? 'bg-gray-200 text-gray-800' :
                  jobCard.status === 'in_progress' ? 'bg-blue-200 text-blue-800' :
                  jobCard.status === 'pending_review' ? 'bg-yellow-200 text-yellow-800' :
                  jobCard.status === 'completed' ? 'bg-green-200 text-green-800' :
                  'bg-gray-200 text-gray-800' // Default
                }`}>{jobCard.status.replace('_', ' ')}</span>
              </p>
              {jobCard.description && (
                <p className="text-gray-600 text-sm mt-2 mb-3 line-clamp-3">
                  {jobCard.description}
                </p>
              )}
              {jobCard.estimated_hours !== null && (
                <p className="text-xs text-gray-500">Estimated Hours: {jobCard.estimated_hours}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">Last Updated: {new Date(jobCard.updated_at).toLocaleDateString()}</p>
            </div>
            <div className="mt-4">
               {/* Example button, could also link to a specific job card detail page if that exists */}
              <Link to={NAV_LINKS.PROJECT_DETAILS.replace(':id', String(jobCard.project_id)) + `?jobCardId=${jobCard.id}`}>
                <Button variant="secondary" size="sm" className="w-full">
                  View Details on Project Page
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FreelancerMyJobCards;
