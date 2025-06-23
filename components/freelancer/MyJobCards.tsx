import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const MyJobCards: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">My Job Cards</h2>
      <div className="bg-white rounded-lg shadow p-4">
        {/* Job cards content will go here */}
        <p className="text-gray-600">No job cards available at the moment.</p>
        {user && <p className="text-sm text-gray-500 mt-2">Viewing as: {user.username}</p>} 
      </div>
    </div>
  );
};

export default MyJobCards;
