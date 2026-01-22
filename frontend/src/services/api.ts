/// <reference types="vite/client" />
/**
 * EDI@Energy Compliant API Service
 * Specification: EDI@Energy formel_v0.0.1
 */
import axios from 'axios';
import type {
  FormulaLocation,
  FormulaSubmissionResponse,
  TimeSeries,
  CalculationRequest,
  CalculationResult,
  EdiEnergyHeaders,
  MaloId,
  TransactionId,
} from '../types/formula';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =============================================================================
// OAuth Token Management
// =============================================================================

let accessToken: string | null = null;

export const authenticate = async (): Promise<string> => {
  const response = await api.post('/oauth/token', new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: 'demo-client',
    client_secret: 'demo-secret',
    scope: 'formula.read formula.write timeseries.read timeseries.write calculations.execute',
  }), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const token = response.data.access_token as string;
  accessToken = token;

  // Set default authorization header
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

  return token;
};

// Request interceptor to ensure we have a token
api.interceptors.request.use(
  async (config) => {
    if (!accessToken && config.url !== '/oauth/token') {
      await authenticate();
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, refresh and retry
      await authenticate();
      error.config.headers['Authorization'] = `Bearer ${accessToken}`;
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);

// =============================================================================
// EDI@Energy Header Generation
// =============================================================================

/**
 * Generate EDI@Energy compliant headers
 */
export function generateEdiHeaders(initialTransactionId?: TransactionId): EdiEnergyHeaders {
  return {
    transactionId: crypto.randomUUID(),
    creationDateTime: new Date().toISOString(),
    initialTransactionId,
  };
}

/**
 * Convert EdiEnergyHeaders to HTTP headers object
 */
function toHttpHeaders(headers: EdiEnergyHeaders): Record<string, string> {
  const httpHeaders: Record<string, string> = {
    'transactionId': headers.transactionId,
    'creationDateTime': headers.creationDateTime,
  };

  if (headers.initialTransactionId) {
    httpHeaders['initialTransactionId'] = headers.initialTransactionId;
  }

  return httpHeaders;
}

// =============================================================================
// Formula APIs (EDI@Energy Compliant)
// =============================================================================

export interface FormulaListItem {
  locationId: string;
  locationType: 'maloId' | 'neloId';
  timeSliceCount: number;
  transactionId: string;
  acceptedAt: string;
  // UI display properties (populated by mock API)
  formulaId?: string;
  name?: string;
  description?: string;
  category?: string;
  outputUnit?: string;
  outputResolution?: string;
  inputTimeSeries?: string[];
  expression?: {
    function: string;
    parameters: Array<{
      type: string;
      name?: string;
      value: unknown;
      scalingFactor?: number;
    }>;
  };
  metadata?: Record<string, unknown>;
}

export interface FormulaDetail {
  locationId: string;
  formulaLocation: FormulaLocation;
  transactionId: string;
  acceptedAt: string;
}

export const formulaApi = {
  /**
   * Submit formula to EDI@Energy compliant endpoint
   * POST /formula/v0.0.1
   *
   * Required Headers:
   *   - transactionId: UUID RFC4122
   *   - creationDateTime: ISO 8601
   */
  submit: async (
    formulaLocation: FormulaLocation,
    headers?: EdiEnergyHeaders
  ): Promise<FormulaSubmissionResponse> => {
    const ediHeaders = headers || generateEdiHeaders();

    const response = await api.post<FormulaSubmissionResponse>(
      '/formula/v0.0.1',
      formulaLocation,
      {
        headers: toHttpHeaders(ediHeaders),
      }
    );

    return response.data;
  },

  /**
   * List all formulas (convenience endpoint, not in EDI@Energy spec)
   * GET /formulas
   */
  list: async (): Promise<{ formulas: FormulaListItem[]; totalCount: number }> => {
    const response = await api.get<{ formulas: FormulaListItem[]; totalCount: number }>('/formulas');
    return response.data;
  },

  /**
   * Get specific formula by location ID
   * GET /formulas/{locationId}
   */
  get: async (locationId: string): Promise<FormulaDetail> => {
    const response = await api.get<FormulaDetail>(`/formulas/${locationId}`);
    return response.data;
  },

  /**
   * Delete formula (if supported)
   */
  delete: async (locationId: string): Promise<void> => {
    await api.delete(`/formulas/${locationId}`);
  },
};

// =============================================================================
// Time Series APIs
// =============================================================================

export interface TimeSeriesSubmission {
  timeSeries: TimeSeries[];
}

export const timeSeriesApi = {
  /**
   * Submit time series data
   * POST /v1/time-series
   */
  submit: async (submission: TimeSeriesSubmission): Promise<{
    acceptanceTime: string;
    status: string;
    timeSeriesIds: string[];
  }> => {
    const response = await api.post('/v1/time-series', submission);
    return response.data;
  },

  /**
   * Query time series
   * GET /v1/time-series
   */
  list: async (params?: {
    marketLocationId?: MaloId;
    meterLocationId?: string;
  }): Promise<{ timeSeries: TimeSeries[]; totalCount: number }> => {
    const response = await api.get<{ timeSeries: TimeSeries[]; totalCount: number }>(
      '/v1/time-series',
      { params }
    );
    return response.data;
  },

  /**
   * Get specific time series
   * GET /v1/time-series/{id}
   */
  get: async (timeSeriesId: string): Promise<TimeSeries> => {
    const response = await api.get<TimeSeries>(`/v1/time-series/${timeSeriesId}`);
    return response.data;
  },
};

// =============================================================================
// Calculation APIs
// =============================================================================

export const calculationApi = {
  /**
   * Execute calculation
   * POST /v1/calculations
   */
  execute: async (request: CalculationRequest): Promise<{
    calculationId: string;
    status: string;
    acceptedAt: string;
  }> => {
    const response = await api.post('/v1/calculations', request);
    return response.data;
  },

  /**
   * Get calculation result
   * GET /v1/calculations/{id}
   */
  get: async (calculationId: string): Promise<CalculationResult> => {
    const response = await api.get<CalculationResult>(`/v1/calculations/${calculationId}`);
    return response.data;
  },
};

// =============================================================================
// Health Check
// =============================================================================

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  specification: string;
  stats: {
    formulas: number;
    timeSeries: number;
    calculations: number;
    transactions: number;
  };
}

export const healthCheck = async (): Promise<HealthStatus> => {
  const response = await api.get<HealthStatus>('/health');
  return response.data;
};

// =============================================================================
// API Info
// =============================================================================

export interface ApiInfo {
  name: string;
  version: string;
  specification: string;
  description: string;
  endpoints: Record<string, Record<string, string>>;
  requiredHeaders: Record<string, string>;
}

export const getApiInfo = async (): Promise<ApiInfo> => {
  const response = await api.get<ApiInfo>('/');
  return response.data;
};

export default api;
