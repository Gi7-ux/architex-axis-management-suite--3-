
import React from 'react';
import { CurrencyDollarIcon, UsersIcon } from '../shared/IconComponents';
import { User, UserRole } from '../../types'; // Import User type

const AdminBillingPlaceholder: React.FC = () => {
  // MOCK_USERS is removed. If actual data is needed, it should be fetched via API.
  // For a placeholder, we can use an empty array.
  const freelancers: User[] = []; 

  return (
    <div className="p-6 bg-white shadow-md rounded-lg">
      <div className="flex items-center mb-6">
        <CurrencyDollarIcon className="w-10 h-10 text-green-500 mr-3" />
        <h2 className="text-2xl font-semibold text-gray-700">Billing & Invoicing Overview</h2>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-6">
        <p className="text-blue-700">
          This section is a placeholder for future billing and invoicing functionalities. 
          Admins will be able to manage freelancer rates, generate reports on billable hours, 
          and potentially create invoices directly from here.
        </p>
      </div>

      <h3 className="text-xl font-semibold text-gray-700 mb-4">Freelancer Hourly Rates (Sample Data - API TODO)</h3>
      {freelancers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Freelancer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hourly Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {freelancers.map(freelancer => (
                <tr key={freelancer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{freelancer.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{freelancer.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {freelancer.hourlyRate ? `R ${freelancer.hourlyRate.toFixed(2)} / hr` : 'Not Set'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">No freelancer data available to display rates. (API integration needed)</p>
      )}

      <div className="mt-8">
        <h4 className="text-lg font-medium text-gray-700">Future Enhancements:</h4>
        <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1 text-sm">
          <li>Detailed billable hours reports per project/freelancer.</li>
          <li>Invoice generation and tracking.</li>
          <li>Payment gateway integration.</li>
          <li>Expense tracking related to projects.</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminBillingPlaceholder;
