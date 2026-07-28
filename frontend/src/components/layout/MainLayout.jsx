import React from 'react';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';

export default function MainLayout({ children }) {
  return (
    <div className="bg-[#f8f9fa] min-h-screen flex">
      {/* Reusable Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-grow ml-[72px] flex flex-col min-h-screen">
        {/* Reusable TopBar */}
        <TopBar />

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
