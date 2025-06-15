import React from 'react';
// import { Link } from 'react-router-dom';
// import Button from './shared/Button';
// import { APP_NAME, NAV_LINKS } from '../constants';
// import { BriefcaseIcon, UsersIcon, CurrencyDollarIcon, ClockIcon, IconProps } from './shared/IconComponents'; 

// const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
//   <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 text-center transform hover:scale-105 border-t-4 border-primary-light">
//     <div className="text-primary w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-primary-extralight rounded-full">
//       {React.cloneElement(icon as React.ReactElement<IconProps>, { className: "w-8 h-8" })}
//     </div>
//     <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
//     <p className="text-gray-600 text-sm">{description}</p>
//   </div>
// );

const HomePage: React.FC = () => {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold">Home Page (No Longer Displayed)</h1>
      <p className="mt-4 text-gray-600">
        This component is no longer directly accessible. The application now routes
        to the login page or dashboard based on authentication status.
      </p>
    </div>
  );
  // Original content commented out as this page is no longer used.
  /*
  return (
    <div className="min-h-screen"> 
      <section className="py-20 md:py-32 bg-gradient-to-r from-secondary to-primary text-white">
        <div className="container mx-auto px-6 text-center">
          <img src="/logo-silhouette.png" alt="Architex Axis Logo Silhouette" className="w-32 h-auto mx-auto mb-6"/>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight font-logo">
            {APP_NAME}
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto">
            The comprehensive suite for administrators to manage architectural projects, teams, client relations, time, and billing with precision and control.
          </p>
          <div className="space-x-4">
            <Link to={NAV_LINKS.DASHBOARD_OVERVIEW}>
              <Button variant="primary" size="lg" className="!bg-accent !text-secondary hover:!bg-primary-light">Access Dashboard</Button>
            </Link>
            <Link to={NAV_LINKS.LOGIN}>
               <Button variant="outline" size="lg" className="border-accent text-accent hover:bg-accent hover:text-secondary">Login / Sign Up</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 text-center mb-16">
            Suite Capabilities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BriefcaseIcon />}
              title="Centralized Project Control"
              description="Admins create, assign, and oversee all architectural projects. Clients and freelancers access assigned work."
            />
            <FeatureCard
              icon={<UsersIcon />}
              title="User & Role Management"
              description="Dedicated dashboards and tools for Admins to manage Client and Freelancer accounts and permissions."
            />
            <FeatureCard
              icon={<ClockIcon />}
              title="Integrated Time Tracking"
              description="Freelancers log time against tasks. Admins and Clients monitor progress and billable hours."
            />
             <FeatureCard
              icon={<CurrencyDollarIcon />}
              title="Billing & Rate Configuration"
              description="Set custom hourly rates for freelancers. Foundation for future invoicing and financial reporting."
            />
             <FeatureCard
              icon={<UsersIcon />}
              title="Client Progress View"
              description="Clients can easily track the progress of their assigned projects through intuitive dashboards and task updates."
            />
             <FeatureCard
              icon={<BriefcaseIcon />}
              title="Admin Oversight"
              description="Full administrative control over platform operations, approvals, and system settings."
            />
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary-extralight">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-secondary mb-6">Streamline Your Architectural Management</h2>
          <p className="text-gray-700 mb-8 max-w-xl mx-auto">
            Leverage {APP_NAME} for unparalleled control and efficiency in your architectural endeavors.
          </p>
          <Link to={NAV_LINKS.LOGIN}>
            <Button variant="primary" size="lg">Get Started</Button>
          </Link>
        </div>
      </section>
    </div>
  );
  */
};

export default HomePage;