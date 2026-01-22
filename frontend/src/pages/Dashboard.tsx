import { useEffect, useState } from 'react';
import { FileText, Calculator, TrendingUp, Activity } from 'lucide-react';
import { formulaApi, timeSeriesApi, healthCheck } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    formulas: 0,
    timeSeries: 0,
    calculations: 0,
  });
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [formulasData, timeSeriesData, healthData] = await Promise.all([
        formulaApi.list(),
        timeSeriesApi.list(),
        healthCheck(),
      ]);

      setStats({
        formulas: formulasData.totalCount || 0,
        timeSeries: timeSeriesData.timeSeries?.length || 0,
        calculations: healthData.stats?.calculations || 0,
      });
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Central Formula Registry</h1>
        <p className="mt-2 text-gray-600">REST API for formula transmission in the energy market</p>
        <p className="mt-1 text-sm text-gray-500">
          Central platform for formula transmission between market participants
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Formulas"
          value={stats.formulas}
          icon={<FileText className="text-blue-600" size={24} />}
          description="Stored formula definitions"
        />
        <StatCard
          title="Time Series"
          value={stats.timeSeries}
          icon={<TrendingUp className="text-green-600" size={24} />}
          description="Available measurement data"
        />
        <StatCard
          title="Calculations"
          value={stats.calculations}
          icon={<Calculator className="text-purple-600" size={24} />}
          description="Executed calculations"
        />
      </div>

      {/* Server Status */}
      {health && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Server Status</h2>
              <p className="mt-1 text-sm text-gray-600">
                Last updated: {new Date(health.timestamp).toLocaleString('en-US')}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Activity size={20} className="text-green-500" />
              <span className="text-sm font-medium text-green-600">
                {health.status === 'healthy' ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickActionButton
            title="Create New Formula"
            description="Create formula from template or from scratch"
            href="/builder"
          />
          <QuickActionButton
            title="Manage Formulas"
            description="View, edit or delete existing formulas"
            href="/formulas"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}

function QuickActionButton({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
    >
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </a>
  );
}
