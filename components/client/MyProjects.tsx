import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { Project, UserRole, ProjectStatus, Invoice, InvoiceStatus } from '../../types'; // Added Invoice, InvoiceStatus
import { fetchProjectsAPI, listInvoices as listInvoicesAPI } from '../../apiService'; // Added listInvoicesAPI
import { NAV_LINKS } from '../../constants';
import ProjectCard from '../shared/ProjectCard';
import { useAuth } from '../AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import { Link } from 'react-router-dom';
import { BriefcaseIcon } from '../shared/IconComponents';

const MyProjects: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // No need to store all invoices at this level, each ProjectInvoicesList will fetch its own.

  useEffect(() => {
    const loadProjects = async () => {
      if (!user || user.role !== UserRole.CLIENT) {
        setIsLoading(false);
        setError("User not authenticated as Client.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const clientProjects = await fetchProjectsAPI({ clientId: user.id });
        setProjects(clientProjects.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err: any) {
        console.error("Failed to load client projects:", err);
        setError(err.message || "Could not load your projects. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, [user]);


  if (isLoading && projects.length === 0) {
    return <LoadingSpinner text="Loading your projects..." className="p-6" />;
  }

  if (!user) {
    return <p className="p-6 text-center text-red-500">You must be logged in to view your projects.</p>;
  }

  if (error) {
    return <p className="p-6 text-center text-red-500 bg-red-50 rounded-md">{error}</p>;
  }

  if (projects.length === 0 && !isLoading) {
    return (
        <div className="p-6 text-center text-gray-500">
            <BriefcaseIcon className="w-16 h-16 mx-auto mb-4 text-gray-300"/>
            <h3 className="text-xl font-semibold">No Projects Assigned</h3>
            <p className="mt-1">You have not been assigned to any projects yet.</p>
            <p className="text-sm mt-1">Projects will appear here once an administrator creates and assigns them to you.</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">My Assigned Projects</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-8"> {/* Adjusted grid for more space */}
        {projects.map((project) => (
          <div key={project.id} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-200">
            <ProjectCard project={project} />
            {user && <ProjectInvoicesList projectId={project.id} clientId={user.id} />}
          </div>
        ))}
      </div>
    </div>
  );
};

// Sub-component to fetch and display invoices for a single project
interface ProjectInvoicesListProps {
  projectId: string;
  clientId: string;
}

const ProjectInvoicesList: React.FC<ProjectInvoicesListProps> = ({ projectId, clientId }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoicesForProject = async () => {
      setIsLoadingInvoices(true);
      setInvoiceError(null);
      try {
        const projectInvoices = await listInvoicesAPI({ projectId, clientId });
        setInvoices(projectInvoices.sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()));
      } catch (err: any) {
        console.error(`Failed to load invoices for project ${projectId}:`, err);
        setInvoiceError(err.message || "Could not load invoices for this project.");
      } finally {
        setIsLoadingInvoices(false);
      }
    };
    loadInvoicesForProject();
  }, [projectId, clientId]);

  if (isLoadingInvoices) {
    return <p className="mt-4 text-sm text-gray-500 animate-pulse">Loading invoices...</p>;
  }

  if (invoiceError) {
    return <p className="mt-4 text-sm text-red-500 bg-red-50 p-2 rounded-md">Error: {invoiceError}</p>;
  }

  const getStatusClass = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID: return 'bg-green-100 text-green-800';
      case InvoiceStatus.SENT: return 'bg-yellow-100 text-yellow-800';
      case InvoiceStatus.DRAFT: return 'bg-gray-100 text-gray-800';
      case InvoiceStatus.VOID: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };


  return (
    <div className="mt-6 pt-4 border-t border-gray-200">
      <h4 className="text-lg font-semibold text-gray-700 mb-3">Project Invoices</h4>
      {invoices.length === 0 ? (
        <p className="text-sm text-gray-500">No invoices found for this project.</p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {invoices.map(invoice => (
            <div key={invoice.id} className="p-3 bg-gray-50 rounded-md border border-gray-100 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Invoice #{invoice.invoiceNumber}</span>
                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>
              <p className="text-gray-600 mt-1">Issued: {new Date(invoice.issueDate).toLocaleDateString()} - Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
              <p className="text-gray-600 font-semibold">Total: R {invoice.totalAmount.toFixed(2)}</p>
              <button
                onClick={() => alert(`Viewing details for Invoice ID: ${invoice.id}\n(Full view not implemented in this step)`)}
                className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1 px-2 rounded-md border border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                View Invoice
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


export default MyProjects;
