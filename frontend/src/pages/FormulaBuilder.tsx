import { useState } from 'react';
import { Check, X, Plus, Trash2 } from 'lucide-react';
import { formulaApi } from '../services/api';
import { formulaTemplates } from '../data/templates';
import type { FormulaUI, FormulaTemplate, FormulaFunction, FormulaCategory, FormulaParameter } from '../types/formula';

export default function FormulaBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<FormulaTemplate | null>(null);
  const [formula, setFormula] = useState<Partial<FormulaUI> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleTemplateSelect = (template: FormulaTemplate) => {
    setSelectedTemplate(template);
    setFormula({
      ...template.formula,
      formulaId: `FORM-${Date.now()}`,
    });
  };

  const handleCreateFromScratch = () => {
    setSelectedTemplate(null);
    setFormula({
      formulaId: `FORM-${Date.now()}`,
      name: '',
      description: '',
      outputUnit: 'KWH',
      outputResolution: 'PT15M',
      category: 'BILANZIERUNG' as FormulaCategory,
      inputTimeSeries: [],
      expression: {
        function: 'Grp_Sum',
        parameters: [],
      },
    });
  };

  const [useCustomExpression, setUseCustomExpression] = useState(false);
  const [customExpressionText, setCustomExpressionText] = useState('');

  const handleSave = async () => {
    if (!formula) return;

    setSaving(true);
    try {
      // Convert UI formula to EDI@Energy FormulaLocation format
      const formulaLocation = {
        maloId: `${Date.now()}`.padStart(11, '0').slice(-11), // Generate 11-digit maloId
        calculationFormulaTimeSlices: [{
          timeSliceId: 1,
          timeSliceQuality: 'Gültige Daten' as const,
          periodOfUseFrom: new Date().toISOString(),
          periodOfUseTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          calculationFormula: {
            operand: {
              const: '0', // Placeholder - actual conversion would be more complex
            },
          },
        }],
      };

      await formulaApi.submit(formulaLocation);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save formula:', error);
      alert('Error saving formula');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Submit Formula to Registry</h1>
        <p className="mt-2 text-gray-600">Portal for formula submission</p>
        <p className="mt-1 text-sm text-gray-500">Choose a template or create a new formula from scratch</p>
      </div>

      {!formula ? (
        <div className="space-y-6">
          {/* Create from Scratch Option */}
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border-2 border-primary-300 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Create New Formula from Scratch
                </h2>
                <p className="text-sm text-gray-600 mb-1">
                  Create a custom formula without using a template
                </p>
              </div>
              <button
                onClick={handleCreateFromScratch}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm"
              >
                Create from Scratch
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">or select a template</span>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Predefined Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formulaTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => handleTemplateSelect(template)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={formula.name || ''}
                  onChange={(e) => setFormula({ ...formula, name: e.target.value })}
                  className="text-2xl font-bold text-gray-900 border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2"
                  placeholder="Formula name"
                />
              </div>
              <button
                onClick={() => {
                  setFormula(null);
                  setSelectedTemplate(null);
                }}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              value={formula.description || ''}
              onChange={(e) => setFormula({ ...formula, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Description"
              rows={2}
            />

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formula.category || ''}
                  onChange={(e) => setFormula({ ...formula, category: e.target.value as FormulaCategory })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select...</option>
                  <option value="BALANCING">Balancing</option>
                  <option value="GRID_USAGE">Grid Usage</option>
                  <option value="SELF_CONSUMPTION">Self-Consumption</option>
                  <option value="LOSSES">Losses</option>
                  <option value="AGGREGATION">Aggregation</option>
                  <option value="MATHEMATICAL">Mathematical</option>
                  <option value="TRANSFORMATION">Transformation</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Output Unit
                  </label>
                  <input
                    type="text"
                    value={formula.outputUnit || ''}
                    onChange={(e) => setFormula({ ...formula, outputUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. KWH"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resolution
                  </label>
                  <select
                    value={formula.outputResolution || ''}
                    onChange={(e) => setFormula({ ...formula, outputResolution: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select...</option>
                    <option value="PT15M">15 Minutes</option>
                    <option value="PT1H">1 Hour</option>
                    <option value="P1D">1 Day</option>
                  </select>
                </div>
              </div>

              {/* Function Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Calculation Function
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useCustomExpression}
                      onChange={(e) => {
                        setUseCustomExpression(e.target.checked);
                        if (e.target.checked && formula) {
                          // Store current function as custom expression
                          setCustomExpressionText(formula.expression?.function || '');
                        }
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-600">Free mathematical formula</span>
                  </label>
                </div>

                {useCustomExpression ? (
                  <div className="space-y-2">
                    <textarea
                      value={customExpressionText}
                      onChange={(e) => {
                        setCustomExpressionText(e.target.value);
                        // Store in metadata for now
                        setFormula({
                          ...formula,
                          metadata: {
                            ...formula.metadata,
                            customExpression: e.target.value,
                          }
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                      rows={3}
                      placeholder="e.g. y = a*x^3 + b*x^2 + c*x + d&#10;or: y = (cos(x))^3&#10;or: result = sqrt(a^2 + b^2)"
                    />
                    <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="font-semibold mb-1">Examples of mathematical expressions:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><code>y = a*x^3 + b*x^2 + c*x + d</code> - Cubic polynomial</li>
                        <li><code>y = (cos(x))^3</code> - Trigonometric function</li>
                        <li><code>result = sqrt(a^2 + b^2)</code> - Square root</li>
                        <li><code>output = exp(x) * sin(y)</code> - Exponential & sine</li>
                        <li><code>z = log(x) + ln(y)</code> - Logarithm</li>
                      </ul>
                      <p className="mt-2 text-gray-500">
                        Use standard mathematical notation. Variables like a, b, c, x can be defined as parameters below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <select
                    value={formula.expression?.function || ''}
                    onChange={(e) => setFormula({
                      ...formula,
                      expression: {
                        ...formula.expression!,
                        function: e.target.value as FormulaFunction,
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Grp_Sum">Grp_Sum - Sum</option>
                    <option value="Wenn_Dann">Wenn_Dann - If-Then-Else</option>
                    <option value="Anteil_Groesser_Als">Anteil_Groesser_Als - Portion above threshold</option>
                    <option value="Anteil_Kleiner_Als">Anteil_Kleiner_Als - Portion below threshold</option>
                    <option value="Quer_Max">Quer_Max - Maximum across time series</option>
                    <option value="Quer_Min">Quer_Min - Minimum across time series</option>
                    <option value="Groesser_Als">Groesser_Als - Greater than comparison</option>
                    <option value="Round">Round - Rounding</option>
                    <option value="Conv_RKMG">Conv_RKMG - RLM/SLP conversion</option>
                    <option value="IMax">IMax - Maximum within time series</option>
                    <option value="IMin">IMin - Minimum within time series</option>
                  </select>
                )}
              </div>

              {/* Input Time Series */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Input Time Series
                  <span className="ml-2 text-xs text-gray-500">(optional - for time series-based calculations)</span>
                </label>
                <div className="space-y-2">
                  {formula.inputTimeSeries && formula.inputTimeSeries.length > 0 ? (
                    formula.inputTimeSeries.map((ts: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={ts}
                          onChange={(e) => {
                            const newTimeSeries = [...(formula.inputTimeSeries || [])];
                            newTimeSeries[idx] = e.target.value;
                            setFormula({ ...formula, inputTimeSeries: newTimeSeries });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                          placeholder="e.g. lineA, production, consumption, x"
                        />
                        <button
                          onClick={() => {
                            const newTimeSeries = formula.inputTimeSeries?.filter((_: string, i: number) => i !== idx);
                            setFormula({ ...formula, inputTimeSeries: newTimeSeries });
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      No input time series - use parameters for single values or mathematical expressions
                    </p>
                  )}
                  <button
                    onClick={() => {
                      const newTimeSeries = [...(formula.inputTimeSeries || []), ''];
                      setFormula({ ...formula, inputTimeSeries: newTimeSeries });
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  >
                    <Plus size={16} />
                    Add Time Series/Variable
                  </button>
                </div>
              </div>

              {/* Function Parameters */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Function Parameters
                  <span className="ml-2 text-xs text-gray-500">(Constants, Variables, Expressions)</span>
                </label>
                <div className="space-y-3">
                  {formula.expression?.parameters && formula.expression.parameters.length > 0 ? (
                    formula.expression.parameters.map((param: FormulaParameter, idx: number) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-3">
                            <select
                              value={param.type}
                              onChange={(e) => {
                                const newParams = [...(formula.expression?.parameters || [])];
                                newParams[idx] = { ...param, type: e.target.value as FormulaParameter['type'] };
                                setFormula({
                                  ...formula,
                                  expression: { ...formula.expression!, parameters: newParams }
                                });
                              }}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            >
                              <option value="constant">Constant</option>
                              <option value="timeseries_ref">Variable/Time Series</option>
                              <option value="string">Text</option>
                              <option value="expression">Expression</option>
                            </select>
                          </div>
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={param.name || ''}
                              onChange={(e) => {
                                const newParams = [...(formula.expression?.parameters || [])];
                                newParams[idx] = { ...param, name: e.target.value };
                                setFormula({
                                  ...formula,
                                  expression: { ...formula.expression!, parameters: newParams }
                                });
                              }}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              placeholder="Name (opt.)"
                            />
                          </div>
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={typeof param.value === 'object' ? JSON.stringify(param.value) : String(param.value)}
                              onChange={(e) => {
                                const newParams = [...(formula.expression?.parameters || [])];
                                let value: string | number = e.target.value;

                                // Try to parse as number for constants
                                if (param.type === 'constant' && !isNaN(Number(value))) {
                                  value = Number(value);
                                }

                                newParams[idx] = { ...param, value };
                                setFormula({
                                  ...formula,
                                  expression: { ...formula.expression!, parameters: newParams }
                                });
                              }}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              placeholder={
                                param.type === 'constant' ? 'e.g. 3, 0.5, 100' :
                                param.type === 'timeseries_ref' ? 'e.g. x, lineA' :
                                param.type === 'string' ? 'e.g. >, <, ==' :
                                'Expression or JSON'
                              }
                            />
                          </div>
                          <div className="col-span-1">
                            <button
                              onClick={() => {
                                const newParams = formula.expression?.parameters.filter((_: FormulaParameter, i: number) => i !== idx);
                                setFormula({
                                  ...formula,
                                  expression: { ...formula.expression!, parameters: newParams || [] }
                                });
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      No parameters defined - add parameters for your formula
                    </p>
                  )}
                  <button
                    onClick={() => {
                      const newParams = [
                        ...(formula.expression?.parameters || []),
                        { type: 'constant' as const, value: 0 }
                      ];
                      setFormula({
                        ...formula,
                        expression: { ...formula.expression!, parameters: newParams }
                      });
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  >
                    <Plus size={16} />
                    Add Parameter
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Formula Preview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Formula Preview</h3>
            {selectedTemplate && (
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600 mb-2">Mathematical representation:</p>
                <code className="text-sm font-mono">{selectedTemplate.preview}</code>
              </div>
            )}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Show JSON definition
              </summary>
              <pre className="mt-2 p-4 bg-gray-50 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(formula, null, 2)}
              </pre>
            </details>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setFormula(null);
                setSelectedTemplate(null);
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formula.name}
              className="px-6 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <span>Saving...</span>
                </>
              ) : saved ? (
                <>
                  <Check size={18} />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Formula</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: FormulaTemplate;
  onSelect: () => void;
}) {
  const categoryColors: Record<string, string> = {
    BALANCING: 'bg-blue-100 text-blue-800',
    GRID_USAGE: 'bg-green-100 text-green-800',
    SELF_CONSUMPTION: 'bg-purple-100 text-purple-800',
    LOSSES: 'bg-orange-100 text-orange-800',
    AGGREGATION: 'bg-pink-100 text-pink-800',
    MATHEMATICAL: 'bg-indigo-100 text-indigo-800',
    TRANSFORMATION: 'bg-teal-100 text-teal-800',
    OTHER: 'bg-gray-100 text-gray-800',
  };

  return (
    <button
      onClick={onSelect}
      className="text-left bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-primary-300 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{template.name}</h3>
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            categoryColors[template.category]
          }`}
        >
          {template.category}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
      <div className="text-xs text-gray-500">
        <code className="bg-gray-100 px-2 py-1 rounded">{template.preview}</code>
      </div>
      <div className="mt-3 text-xs text-gray-500">
        {template.requiredMeteringPoints || template.requiredMeloOperands || 0} metering points required
      </div>
    </button>
  );
}
