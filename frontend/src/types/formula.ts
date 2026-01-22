// =============================================================================
// EDI@Energy Compliant Formula Types
// Specification: EDI@Energy formel_v0.0.1
// =============================================================================

// -----------------------------------------------------------------------------
// ID Types (EDI@Energy compliant patterns)
// -----------------------------------------------------------------------------

/**
 * Market Location ID (Marktlokation)
 * Pattern: \d{11} (11 digits)
 * Example: "57685676748"
 */
export type MaloId = string;

/**
 * Meter Location ID (Messlokation)
 * Pattern: DE\d{11}[A-Z,\d]{20} (33 characters)
 * Example: "DE00014545768S0000000000000003054"
 */
export type MeloId = string;

/**
 * Network Location ID (Netzlokation)
 * Pattern: E[A-Z\d]{9}\d (11 characters)
 * Example: "E1234848431"
 */
export type NeloId = string;

/**
 * Transaction ID
 * Format: UUID RFC4122
 * Example: "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
 */
export type TransactionId = string;

/**
 * Time Slice ID
 * Type: Integer
 */
export type TimeSliceId = number;

// -----------------------------------------------------------------------------
// Value Types
// -----------------------------------------------------------------------------

/**
 * Percent Value (0.0 to 1.0)
 * Pattern: ^(0(\.\d+)?|1(\.0+)?)$
 */
export type PercentValue = number;

/**
 * Constant Value (real number)
 * Pattern: ^-?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$
 */
export type ConstValue = string;

/**
 * Formula Variable (starts with letter)
 * Pattern: ^[a-zA-Z].*
 */
export type FormulaVar = string;

/**
 * Energy Direction
 */
export type EnergyDirection = 'consumption' | 'production';

/**
 * Time Slice Quality
 */
export type TimeSliceQuality = 'Gültige Daten' | 'Keine Daten';

// -----------------------------------------------------------------------------
// Loss Factors (EDI@Energy specific)
// -----------------------------------------------------------------------------

export interface LossFactorTransformer {
  percentvalue: PercentValue;
}

export interface LossFactorConduction {
  percentvalue: PercentValue;
}

export interface DistributionFactorEnergyQuantity {
  percentvalue: PercentValue;
}

// -----------------------------------------------------------------------------
// Operands (EDI@Energy compliant)
// -----------------------------------------------------------------------------

/**
 * Meter Location Operand (meloOperand)
 * Contains all required fields per EDI@Energy specification
 */
export interface MeloOperand {
  meloId: MeloId;
  energyDirection: EnergyDirection;
  lossFactorTransformer: LossFactorTransformer;
  lossFactorConduction: LossFactorConduction;
  distributionFactorEnergyQuantity: DistributionFactorEnergyQuantity;
}

/**
 * Operand - oneOf the following types
 * Per EDI@Energy: meloOperand | const | formulaVar | calculationFormula
 */
export interface Operand {
  meloOperand?: MeloOperand;
  const?: ConstValue;
  formulaVar?: FormulaVar;
  calculationFormula?: CalculationFormula;
}

// -----------------------------------------------------------------------------
// Operations (EDI@Energy compliant)
// -----------------------------------------------------------------------------

/**
 * Addition Operation
 * Array of operands to sum
 */
export type AddOperation = Operand[];

/**
 * Subtraction Operation
 * minuend - subtrahend
 */
export interface SubOperation {
  minuend: Operand;
  subtrahend: Operand;
}

/**
 * Multiplication Operation
 * Array of operands to multiply
 */
export type MulOperation = Operand[];

/**
 * Division Operation
 * Array of operands to divide sequentially
 */
export type DivOperation = Operand[];

/**
 * Unary Positive Operation
 * Returns absolute value
 */
export type PosOperation = Operand;

// -----------------------------------------------------------------------------
// Calculation Formula (EDI@Energy compliant)
// -----------------------------------------------------------------------------

/**
 * Calculation Formula - oneOf the following operations
 * Per EDI@Energy specification: add | sub | mul | div | pos | operand
 */
export interface CalculationFormula {
  add?: AddOperation;
  sub?: SubOperation;
  mul?: MulOperation;
  div?: DivOperation;
  pos?: PosOperation;
  operand?: Operand;
}

// -----------------------------------------------------------------------------
// Time Slice (EDI@Energy compliant)
// -----------------------------------------------------------------------------

/**
 * Calculation Formula Time Slice
 * Formulas are time-bounded in EDI@Energy
 */
export interface CalculationFormulaTimeSlice {
  timeSliceId: TimeSliceId;
  timeSliceQuality: TimeSliceQuality;
  periodOfUseFrom: string; // ISO 8601 datetime
  periodOfUseTo: string;   // ISO 8601 datetime
  calculationFormula: CalculationFormula;
}

// -----------------------------------------------------------------------------
// Formula Location (EDI@Energy Request Body)
// -----------------------------------------------------------------------------

/**
 * Formula Location - Main request body for /formula/v0.0.1
 * Must have either maloId OR neloId, plus calculationFormulaTimeSlices
 */
export interface FormulaLocation {
  maloId?: MaloId;
  neloId?: NeloId;
  calculationFormulaTimeSlices: CalculationFormulaTimeSlice[];
}

// -----------------------------------------------------------------------------
// API Headers (EDI@Energy compliant)
// -----------------------------------------------------------------------------

export interface EdiEnergyHeaders {
  transactionId: TransactionId;        // Required: UUID RFC4122
  creationDateTime: string;            // Required: ISO 8601
  initialTransactionId?: TransactionId; // Optional: For retry/idempotency
}

// -----------------------------------------------------------------------------
// API Request/Response Types
// -----------------------------------------------------------------------------

/**
 * Formula Submission Request
 * Wraps FormulaLocation with message metadata
 */
export interface FormulaSubmissionRequest {
  headers: EdiEnergyHeaders;
  body: FormulaLocation;
}

/**
 * Formula Submission Response
 */
export interface FormulaSubmissionResponse {
  status: 'accepted' | 'rejected';
  transactionId: TransactionId;
  acceptanceTime: string;
  validationResults?: ValidationResult[];
}

export interface ValidationResult {
  timeSliceId: TimeSliceId;
  valid: boolean;
  errors?: string[];
}

// -----------------------------------------------------------------------------
// Time Series Types (unchanged, but with EDI@Energy ID compliance)
// -----------------------------------------------------------------------------

export interface TimeSeries {
  timeSeriesId: string;
  marketLocationId: MaloId;
  meterLocationId?: MeloId;
  measurementType: string;
  unit: string;
  resolution: string;
  period: {
    start: string;
    end: string;
  };
  intervals: Interval[];
  metadata?: Record<string, unknown>;
}

export interface Interval {
  position: number;
  start: string;
  end: string;
  quantity: string;
  quality: 'VALIDATED' | 'ESTIMATED' | 'MISSING' | 'Gültige Daten' | 'Keine Daten';
}

// -----------------------------------------------------------------------------
// Calculation Types
// -----------------------------------------------------------------------------

export interface CalculationRequest {
  calculationId: string;
  maloId?: MaloId;
  neloId?: NeloId;
  timeSliceId: TimeSliceId;
  inputTimeSeries: Record<MeloId, string>; // meloId -> timeSeriesId mapping
  period: {
    start: string;
    end: string;
  };
  outputTimeSeriesId?: string;
}

export interface CalculationResult {
  calculationId: string;
  maloId?: MaloId;
  neloId?: NeloId;
  timeSliceId: TimeSliceId;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  outputTimeSeriesId?: string;
  completedAt?: string;
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

// -----------------------------------------------------------------------------
// Formula Categories (kept for UI purposes)
// -----------------------------------------------------------------------------

export type FormulaCategory =
  | 'BILANZIERUNG'
  | 'NETZNUTZUNG'
  | 'EIGENVERBRAUCH'
  | 'VERLUSTE'
  | 'AGGREGATION'
  | 'MATHEMATISCH'
  | 'TRANSFORMATION'
  | 'SONSTIGES'
  // English aliases for UI
  | 'BALANCING'
  | 'GRID_USAGE'
  | 'SELF_CONSUMPTION'
  | 'LOSSES'
  | 'MATHEMATICAL'
  | 'OTHER';

// -----------------------------------------------------------------------------
// Formula Functions (for UI formula builder)
// -----------------------------------------------------------------------------

export type FormulaFunction =
  | 'Grp_Sum'
  | 'Wenn_Dann'
  | 'Anteil_Groesser_Als'
  | 'Anteil_Kleiner_Als'
  | 'Quer_Max'
  | 'Quer_Min'
  | 'Groesser_Als'
  | 'Round'
  | 'Conv_RKMG'
  | 'IMax'
  | 'IMin';

// -----------------------------------------------------------------------------
// Formula Expression Types (for UI formula builder)
// -----------------------------------------------------------------------------

export interface FormulaParameter {
  type: 'constant' | 'timeseries_ref' | 'string' | 'expression';
  name?: string;
  value: number | string | FormulaExpression | Record<string, unknown>;
  scalingFactor?: number;
}

export interface FormulaExpression {
  function: FormulaFunction | string;
  parameters: FormulaParameter[];
}

// -----------------------------------------------------------------------------
// UI Formula Type (for formula builder/list/receiver)
// -----------------------------------------------------------------------------

export interface FormulaUI {
  formulaId: string;
  name: string;
  description: string;
  category?: FormulaCategory;
  outputUnit: string;
  outputResolution: string;
  inputTimeSeries: string[];
  expression: FormulaExpression;
  lossFactor?: number;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Formula Template (for UI formula builder)
// -----------------------------------------------------------------------------

export interface FormulaTemplate {
  id: string;
  name: string;
  description: string;
  descriptionEn?: string;
  category: FormulaCategory;
  formulaLocation?: Partial<FormulaLocation>;
  formula?: Partial<FormulaUI>;
  requiredMeloOperands?: number;
  requiredMeteringPoints?: number;
  preview: string; // Mathematical representation
}

// -----------------------------------------------------------------------------
// Validation Helpers
// -----------------------------------------------------------------------------

export const ID_PATTERNS = {
  maloId: /^\d{11}$/,
  meloId: /^DE\d{11}[A-Z\d]{20}$/,
  neloId: /^E[A-Z\d]{9}\d$/,
  transactionId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  percentValue: /^(0(\.\d+)?|1(\.0+)?)$/,
  constValue: /^-?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/,
  formulaVar: /^[a-zA-Z]/,
};

export function validateMaloId(id: string): boolean {
  return ID_PATTERNS.maloId.test(id);
}

export function validateMeloId(id: string): boolean {
  return ID_PATTERNS.meloId.test(id);
}

export function validateNeloId(id: string): boolean {
  return ID_PATTERNS.neloId.test(id);
}

export function validateTransactionId(id: string): boolean {
  return ID_PATTERNS.transactionId.test(id);
}

export function validatePercentValue(value: number): boolean {
  return value >= 0 && value <= 1;
}

// -----------------------------------------------------------------------------
// Legacy Type Aliases (for migration compatibility)
// -----------------------------------------------------------------------------

/** UI Formula type - use FormulaUI for new code */
export type Formula = FormulaUI;

/** @deprecated Use FormulaLocation instead */
export type FormulaSubmission = {
  messageId: string;
  messageDate: string;
  sender: {
    id: string;
    role: string;
    name: string;
  };
  formulas: FormulaLocation[];
};

/** @deprecated Use MeloOperand instead */
export interface MeteringPoint {
  meteringPointId: MeloId;
  obisCode?: string;
  direction: EnergyDirection;
  description?: string;
}
