import { useState } from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Dashboard from './pages/dashboard/Dashboard';

function App() {
  const [activeTab, setActiveTab] = useState('kham-pha');

  return (
    <div className="min-h-screen flex flex-col bg-background font-body-md text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Fixed Header */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1">
        <Dashboard />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
