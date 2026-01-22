import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { formulaApi, FormulaListItem } from '../services/api';

export default function FormulaReceiver() {
  const [formulas, setFormulas] = useState<FormulaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFormula, setSelectedFormula] = useState<FormulaListItem | null>(null);

  useEffect(() => {
    loadReceivedFormulas();
  }, []);

  const loadReceivedFormulas = async () => {
    try {
      const data = await formulaApi.list();
      setFormulas(data.formulas || []);
    } catch (error) {
      console.error('Failed to load received formulas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading received formulas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hub Operations - Formula Validation</h1>
          <p className="mt-2 text-gray-600">
            Central validation and management of submitted formulas
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {formulas.length} submitted formula{formulas.length !== 1 ? 's' : ''} in hub
          </p>
        </div>
        <button
          onClick={loadReceivedFormulas}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {formulas.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={48} />
          <p className="text-gray-500">No formulas in hub</p>
          <p className="mt-2 text-sm text-gray-400">
            Waiting for submission from market participants (MSBs)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {formulas.map((formula) => (
            <ReceivedFormulaCard
              key={formula.formulaId || formula.locationId}
              formula={formula}
              onView={() => setSelectedFormula(formula)}
            />
          ))}
        </div>
      )}

      {/* Formula Detail Modal */}
      {selectedFormula && (
        <FormulaDetailModal
          formula={selectedFormula}
          onClose={() => setSelectedFormula(null)}
        />
      )}
    </div>
  );
}

function ReceivedFormulaCard({
  formula,
  onView,
}: {
  formula: FormulaListItem;
  onView: () => void;
}) {
  // Validate formula structure
  const hasCustomExpression = !!(formula.metadata && (formula.metadata as Record<string, unknown>).customExpression);
  const isValid = (formula.formulaId || formula.locationId) && formula.expression && formula.expression.function;

  // More lenient validation for custom expressions - they may not have inputTimeSeries
  const hasAllParameters = hasCustomExpression ||
    (formula.inputTimeSeries && formula.inputTimeSeries.length > 0) ||
    (formula.expression?.parameters && formula.expression.parameters.length > 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            {isValid && hasAllParameters ? (
              <CheckCircle className="text-green-500" size={20} />
            ) : (
              <XCircle className="text-red-500" size={20} />
            )}
            <h3 className="text-lg font-semibold text-gray-900">{formula.name || formula.locationId}</h3>
            {formula.category && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                {formula.category}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-3">{formula.description || 'No description'}</p>

          {/* Transmission Details */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-xs">
              <span className="font-medium text-gray-700">Formula ID:</span>
              <span className="ml-2 text-gray-600">{formula.formulaId || formula.locationId}</span>
            </div>
            <div className="text-xs">
              <span className="font-medium text-gray-700">Function:</span>
              <span className="ml-2 text-gray-600">{formula.expression?.function || 'N/A'}</span>
            </div>
            <div className="text-xs">
              <span className="font-medium text-gray-700">Inputs:</span>
              <span className="ml-2 text-gray-600">{formula.inputTimeSeries?.length || 0}</span>
            </div>
            <div className="text-xs">
              <span className="font-medium text-gray-700">Output:</span>
              <span className="ml-2 text-gray-600">
                {formula.outputUnit || 'N/A'} @ {formula.outputResolution || 'N/A'}
              </span>
            </div>
          </div>

          {/* Validation Status */}
          <div className="flex items-center space-x-4 text-xs">
            <ValidationBadge
              label="Structure"
              valid={!!formula.expression}
            />
            <ValidationBadge
              label="Parameters"
              valid={!!hasAllParameters}
            />
            <ValidationBadge
              label="Metadata"
              valid={!!formula.outputUnit && !!formula.outputResolution}
            />
            <ValidationBadge
              label="Category"
              valid={!!formula.category}
            />
            {hasCustomExpression && (
              <div className="flex items-center space-x-1">
                <CheckCircle className="text-purple-500" size={12} />
                <span className="text-purple-700">Custom Formula</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onView}
          className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded transition-colors"
          title="View details"
        >
          <Eye size={18} />
        </button>
      </div>
    </div>
  );
}

function ValidationBadge({ label, valid }: { label: string; valid: boolean }) {
  return (
    <div className="flex items-center space-x-1">
      {valid ? (
        <CheckCircle className="text-green-500" size={12} />
      ) : (
        <XCircle className="text-red-500" size={12} />
      )}
      <span className={valid ? 'text-green-700' : 'text-red-700'}>{label}</span>
    </div>
  );
}

function FormulaDetailModal({ formula, onClose }: { formula: FormulaListItem; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Hub Formula: {formula.name || formula.locationId}</h2>
          <p className="text-sm text-gray-500 mt-1">Formula ID: {formula.formulaId || formula.locationId}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Custom Expression (if present) */}
          {!!(formula.metadata && (formula.metadata as Record<string, unknown>).customExpression) && (
            <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <CheckCircle className="text-purple-600" size={16} />
                Custom Mathematical Formula
              </h3>
              <pre className="bg-white p-3 rounded border border-purple-200 font-mono text-sm text-purple-900 overflow-x-auto">
                {(formula.metadata as Record<string, unknown>).customExpression as string}
              </pre>
              <p className="text-xs text-purple-700 mt-2">
                This formula uses free mathematical notation
              </p>
            </div>
          )}

          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Basic Information</h3>
            <div className="bg-gray-50 rounded p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-medium text-gray-600">Name:</span>
                  <p className="text-sm">{formula.name || formula.locationId}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-600">Category:</span>
                  <p className="text-sm">{formula.category || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-600">Output Unit:</span>
                  <p className="text-sm">{formula.outputUnit || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-600">Resolution:</span>
                  <p className="text-sm">{formula.outputResolution || 'N/A'}</p>
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-600">Description:</span>
                <p className="text-sm mt-1">{formula.description || 'No description'}</p>
              </div>
            </div>
          </div>

          {/* Expression Details */}
          {formula.expression && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Formula Expression</h3>
            <div className="bg-gray-50 rounded p-4">
              <div className="mb-2">
                <span className="text-xs font-medium text-gray-600">Function:</span>
                <p className="text-sm font-mono bg-white px-2 py-1 rounded mt-1">
                  {formula.expression.function}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-600">
                  Parameter ({formula.expression.parameters?.length || 0}):
                </span>
                <div className="mt-2 space-y-2">
                  {formula.expression.parameters?.map((param: { name?: string; type: string; value: unknown }, idx: number) => (
                    <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium text-gray-600">Name:</span>
                          <span className="ml-2">{param.name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Type:</span>
                          <span className="ml-2">{param.type}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium text-gray-600">Value:</span>
                          <pre className="ml-2 mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {typeof param.value === 'object'
                              ? JSON.stringify(param.value, null, 2)
                              : String(param.value)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Input Time Series */}
          {formula.inputTimeSeries && formula.inputTimeSeries.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Input Time Series</h3>
            <div className="bg-gray-50 rounded p-4">
              <ul className="space-y-1">
                {formula.inputTimeSeries.map((ts: string, idx: number) => (
                  <li key={idx} className="text-sm font-mono bg-white px-2 py-1 rounded">
                    {ts}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          )}

          {/* Complete JSON */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Complete JSON Structure (Hub Registry)
            </h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(formula, null, 2)}
            </pre>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
          <div className="space-x-2">
            <button
              onClick={() => {
                // In production, this would send a rejection API call
                alert(`Formula "${formula.name || formula.locationId}" was rejected.\n\nIn production, this would send an API request to the Formula Registry.`);
                onClose();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={() => {
                // In production, this would send an acceptance API call
                alert(`Formula "${formula.name || formula.locationId}" was accepted and confirmed!\n\nIn production, this would send an API request to the Formula Registry.`);
                onClose();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Accept & Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
