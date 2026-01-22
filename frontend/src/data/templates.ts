import type { FormulaTemplate } from '../types/formula';

export const formulaTemplates: FormulaTemplate[] = [
  {
    id: 'bess-charge-without-consumption',
    name: 'BESS Battery Charging without Self-Consumption',
    description: 'Calculates battery charging without self-consumption for a Battery Energy Storage System',
    category: 'BALANCING',
    requiredMeteringPoints: 3,
    preview: 'if(W+Z1 – (W+ZEV1 + W+ZE_UW) > 0; W+Z1 – (W+ZEV1 + W+ZE_UW); 0)',
    formula: {
      name: 'W+Batt1 without SC',
      description: 'Battery charging without self-consumption',
      outputUnit: 'KWH',
      outputResolution: 'PT15M',
      category: 'BALANCING',
      inputTimeSeries: ['lineA', 'lineB', 'lineC'],
      expression: {
        function: 'Wenn_Dann',
        parameters: [
          {
            type: 'expression',
            value: {
              function: 'Grp_Sum',
              parameters: [
                { type: 'timeseries_ref', value: 'lineA', scalingFactor: 1.0 },
                { type: 'timeseries_ref', value: 'lineB', scalingFactor: -1.0 },
                { type: 'timeseries_ref', value: 'lineC', scalingFactor: -1.0 },
              ],
            },
          },
          { type: 'string', value: '>' },
          { type: 'constant', value: 0 },
          {
            type: 'expression',
            value: {
              function: 'Grp_Sum',
              parameters: [
                { type: 'timeseries_ref', value: 'lineA', scalingFactor: 1.0 },
                { type: 'timeseries_ref', value: 'lineB', scalingFactor: -1.0 },
                { type: 'timeseries_ref', value: 'lineC', scalingFactor: -1.0 },
              ],
            },
          },
          { type: 'constant', value: 0 },
        ],
      },
    },
  },
  {
    id: 'pv-production-with-loss',
    name: 'PV Production with Loss Factor',
    description: 'Calculates PV production with configurable loss factor',
    category: 'LOSSES',
    requiredMeteringPoints: 1,
    preview: 'W-Producer × (1 - LossFactor)',
    formula: {
      name: 'PV Production with Loss',
      description: 'PV production after losses',
      outputUnit: 'KWH',
      outputResolution: 'PT15M',
      category: 'LOSSES',
      lossFactor: 0.02,
      inputTimeSeries: ['production'],
      expression: {
        function: 'Grp_Sum',
        parameters: [
          { type: 'timeseries_ref', value: 'production', scalingFactor: 0.98 }, // 1 - 0.02 loss
        ],
      },
    },
  },
  {
    id: 'self-consumption-aggregation',
    name: 'Self-Consumption Aggregation',
    description: 'Aggregates self-consumption across multiple metering points',
    category: 'SELF_CONSUMPTION',
    requiredMeteringPoints: 2,
    preview: 'W+ZEV1 + W+ZEV2 + ... + W+ZEVn',
    formula: {
      name: 'Total Self-Consumption',
      description: 'Sum of all self-consumption metering points',
      outputUnit: 'KWH',
      outputResolution: 'PT15M',
      category: 'SELF_CONSUMPTION',
      inputTimeSeries: ['ev1', 'ev2'],
      expression: {
        function: 'Grp_Sum',
        parameters: [
          { type: 'timeseries_ref', value: 'ev1', scalingFactor: 1.0 },
          { type: 'timeseries_ref', value: 'ev2', scalingFactor: 1.0 },
        ],
      },
    },
  },
  {
    id: 'excess-above-threshold',
    name: 'Portion Above Threshold',
    description: 'Calculates the portion of energy exceeding a threshold value',
    category: 'GRID_USAGE',
    requiredMeteringPoints: 1,
    preview: 'Portion_Greater_Than(W+, Threshold)',
    formula: {
      name: 'Portion Above Threshold',
      description: 'Energy above configurable threshold',
      outputUnit: 'KWH',
      outputResolution: 'PT15M',
      category: 'GRID_USAGE',
      inputTimeSeries: ['consumption'],
      expression: {
        function: 'Anteil_Groesser_Als',
        parameters: [
          { type: 'timeseries_ref', value: 'consumption' },
          { type: 'constant', value: 1000 }, // 1000 kWh threshold
        ],
      },
    },
  },
  {
    id: 'max-across-series',
    name: 'Maximum Across Time Series',
    description: 'Finds the maximum value across multiple time series per interval',
    category: 'AGGREGATION',
    requiredMeteringPoints: 2,
    preview: 'Cross_Max(TimeSeries1, TimeSeries2, ..., TimeSeriesN)',
    formula: {
      name: 'Maximum Value',
      description: 'Maximum across multiple time series',
      outputUnit: 'KWH',
      outputResolution: 'PT15M',
      category: 'AGGREGATION',
      inputTimeSeries: ['series1', 'series2'],
      expression: {
        function: 'Quer_Max',
        parameters: [
          { type: 'timeseries_ref', value: 'series1' },
          { type: 'timeseries_ref', value: 'series2' },
        ],
      },
    },
  },
];

export const functionDescriptions: Record<string, { description: string; icon: string }> = {
  Wenn_Dann: {
    description: 'If-Then-Else logic: if(condition; then-value; else-value)',
    icon: '⚖️',
  },
  Grp_Sum: {
    description: 'Sum of multiple time series with optional scaling factors',
    icon: '➕',
  },
  Anteil_Groesser_Als: {
    description: 'Portion of energy above a threshold',
    icon: '📈',
  },
  Anteil_Kleiner_Als: {
    description: 'Portion of energy below a threshold',
    icon: '📉',
  },
  Quer_Max: {
    description: 'Maximum across multiple time series per interval',
    icon: '⬆️',
  },
  Quer_Min: {
    description: 'Minimum across multiple time series per interval',
    icon: '⬇️',
  },
  Groesser_Als: {
    description: 'Comparison: greater than threshold',
    icon: '>',
  },
  Round: {
    description: 'Rounding to n decimal places',
    icon: '🔢',
  },
  Conv_RKMG: {
    description: 'Conversion RLM/SLP metering type',
    icon: '🔄',
  },
  IMax: {
    description: 'Maximum within a time series',
    icon: '↑',
  },
  IMin: {
    description: 'Minimum within a time series',
    icon: '↓',
  },
};
