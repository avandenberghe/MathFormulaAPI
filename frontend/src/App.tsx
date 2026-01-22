import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home, FileText, Calculator, Activity, Inbox } from 'lucide-react';
import FormulaBuilder from './pages/FormulaBuilder';
import FormulaList from './pages/FormulaList';
import FormulaReceiver from './pages/FormulaReceiver';
import Dashboard from './pages/Dashboard';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-primary-600">
                      Formula Registry
                    </h1>
                    <p className="text-xs text-gray-500">Energy Time Series API - Proof of Concept</p>
                  </div>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <NavLink to="/" icon={<Home size={18} />}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/builder" icon={<Calculator size={18} />}>
                    Submit Formula
                  </NavLink>
                  <NavLink to="/receiver" icon={<Inbox size={18} />}>
                    Hub Operations
                  </NavLink>
                  <NavLink to="/formulas" icon={<FileText size={18} />}>
                    Formula Registry
                  </NavLink>
                </div>
              </div>
              <div className="flex items-center">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Activity size={16} className="text-green-500" />
                  <span>Server: Online</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/builder" element={<FormulaBuilder />} />
            <Route path="/receiver" element={<FormulaReceiver />} />
            <Route path="/formulas" element={<FormulaList />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function NavLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
    >
      <span className="mr-2">{icon}</span>
      {children}
    </Link>
  );
}

export default App;
