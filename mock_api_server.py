# SPDX-License-Identifier: EUPL-1.2
# SPDX-FileCopyrightText: 2024 Energy Formula API Contributors
#
# Licensed under the EUPL
"""
EDI@Energy Compliant Formula API Server
Specification: EDI@Energy formel_v0.0.1

This server implements the EDI@Energy Formula API specification for
transmitting calculation formulas for market location values.

Endpoint: POST /formula/v0.0.1
Headers:
  - transactionId (required): UUID RFC4122
  - creationDateTime (required): ISO 8601 timestamp
  - initialTransactionId (optional): For retry/idempotency

Usage:
    python mock_api_server.py

    Server runs on: http://localhost:8000
"""

from __future__ import annotations

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple
import uuid
import re
import json

app = Flask(__name__)
CORS(app)

# =============================================================================
# In-Memory Storage
# =============================================================================

formula_location_store: Dict[str, Dict[str, Any]] = {}  # maloId/neloId -> FormulaLocation
time_series_store: Dict[str, Dict[str, Any]] = {}       # timeSeriesId -> TimeSeries
calculation_store: Dict[str, Dict[str, Any]] = {}       # calculationId -> Calculation
transaction_store: Dict[str, Dict[str, Any]] = {}       # transactionId -> Transaction record

# Mock OAuth2 Tokens
valid_tokens = set()

# =============================================================================
# EDI@Energy ID Patterns (from TEST_API_EDI_NEW schemas)
# =============================================================================

ID_PATTERNS = {
    'maloId': re.compile(r'^\d{11}$'),                          # 11 digits
    'meloId': re.compile(r'^DE\d{11}[A-Z\d]{20}$'),            # DE + 11 digits + 20 alphanumeric
    'neloId': re.compile(r'^E[A-Z\d]{9}\d$'),                  # E + 9 alphanumeric + 1 digit
    'transactionId': re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE),
    'percentValue': re.compile(r'^(0(\.\d+)?|1(\.0+)?)$'),     # 0.0 to 1.0
    'constValue': re.compile(r'^-?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$'),  # Real number
    'formulaVar': re.compile(r'^[a-zA-Z]'),                    # Starts with letter
}

VALID_ENERGY_DIRECTIONS = {'consumption', 'production'}
VALID_TIME_SLICE_QUALITIES = {'Gültige Daten', 'Keine Daten'}

# =============================================================================
# Validation Functions
# =============================================================================

def validate_malo_id(malo_id: str) -> bool:
    """Validate Market Location ID (11 digits)"""
    return bool(ID_PATTERNS['maloId'].match(malo_id))


def validate_melo_id(melo_id: str) -> bool:
    """Validate Meter Location ID (DE + 11 digits + 20 alphanumeric)"""
    return bool(ID_PATTERNS['meloId'].match(melo_id))


def validate_nelo_id(nelo_id: str) -> bool:
    """Validate Network Location ID (E + 9 alphanumeric + 1 digit)"""
    return bool(ID_PATTERNS['neloId'].match(nelo_id))


def validate_transaction_id(transaction_id: str) -> bool:
    """Validate Transaction ID (UUID RFC4122)"""
    return bool(ID_PATTERNS['transactionId'].match(transaction_id))


def validate_percent_value(value: float) -> bool:
    """Validate percent value (0.0 to 1.0)"""
    return 0.0 <= value <= 1.0


def validate_headers() -> Tuple[bool, Optional[str], Dict[str, str]]:
    """
    Validate required EDI@Energy headers
    Returns: (is_valid, error_message, headers_dict)
    """
    transaction_id = request.headers.get('transactionId')
    creation_datetime = request.headers.get('creationDateTime')
    initial_transaction_id = request.headers.get('initialTransactionId')

    if not transaction_id:
        return False, 'Header transactionId is required', {}

    if not validate_transaction_id(transaction_id):
        return False, 'transactionId must be UUID RFC4122 format', {}

    if not creation_datetime:
        return False, 'Header creationDateTime is required', {}

    # Validate ISO 8601 format
    try:
        datetime.fromisoformat(creation_datetime.replace('Z', '+00:00'))
    except ValueError:
        return False, 'creationDateTime must be ISO 8601 format', {}

    # Optional: validate initialTransactionId if provided
    if initial_transaction_id and not validate_transaction_id(initial_transaction_id):
        return False, 'initialTransactionId must be UUID RFC4122 format', {}

    return True, None, {
        'transactionId': transaction_id,
        'creationDateTime': creation_datetime,
        'initialTransactionId': initial_transaction_id
    }


def validate_melo_operand(melo_operand: Dict[str, Any]) -> List[str]:
    """Validate meloOperand structure per EDI@Energy specification"""
    errors = []

    # Required fields
    required_fields = ['meloId', 'energyDirection', 'lossFactorTransformer',
                       'lossFactorConduction', 'distributionFactorEnergyQuantity']

    for field in required_fields:
        if field not in melo_operand:
            errors.append(f'meloOperand missing required field: {field}')

    # Validate meloId format
    if 'meloId' in melo_operand:
        if not validate_melo_id(melo_operand['meloId']):
            errors.append(f'Invalid meloId format: {melo_operand["meloId"]}. Expected: DE + 11 digits + 20 alphanumeric')

    # Validate energyDirection
    if 'energyDirection' in melo_operand:
        if melo_operand['energyDirection'] not in VALID_ENERGY_DIRECTIONS:
            errors.append(f'Invalid energyDirection: {melo_operand["energyDirection"]}. Must be: consumption or production')

    # Validate loss factors and distribution factor
    for factor_name in ['lossFactorTransformer', 'lossFactorConduction', 'distributionFactorEnergyQuantity']:
        if factor_name in melo_operand:
            factor = melo_operand[factor_name]
            if isinstance(factor, dict) and 'percentvalue' in factor:
                if not validate_percent_value(factor['percentvalue']):
                    errors.append(f'{factor_name}.percentvalue must be between 0.0 and 1.0')
            else:
                errors.append(f'{factor_name} must have percentvalue field')

    return errors


def validate_operand(operand: Dict[str, Any]) -> List[str]:
    """Validate operand structure (oneOf: meloOperand, const, formulaVar, calculationFormula)"""
    errors = []

    operand_types = ['meloOperand', 'const', 'formulaVar', 'calculationFormula']
    present_types = [t for t in operand_types if t in operand and operand[t] is not None]

    if len(present_types) == 0:
        errors.append('Operand must have one of: meloOperand, const, formulaVar, calculationFormula')
    elif len(present_types) > 1:
        errors.append(f'Operand must have exactly one type, found: {present_types}')
    else:
        operand_type = present_types[0]

        if operand_type == 'meloOperand':
            errors.extend(validate_melo_operand(operand['meloOperand']))
        elif operand_type == 'const':
            const_val = str(operand['const'])
            if not ID_PATTERNS['constValue'].match(const_val):
                errors.append(f'Invalid const value: {const_val}')
        elif operand_type == 'formulaVar':
            if not ID_PATTERNS['formulaVar'].match(operand['formulaVar']):
                errors.append(f'formulaVar must start with a letter: {operand["formulaVar"]}')
        elif operand_type == 'calculationFormula':
            errors.extend(validate_calculation_formula(operand['calculationFormula']))

    return errors


def validate_calculation_formula(formula: Dict[str, Any]) -> List[str]:
    """Validate calculationFormula structure (oneOf: add, sub, mul, div, pos, operand)"""
    errors = []

    operation_types = ['add', 'sub', 'mul', 'div', 'pos', 'operand']
    present_ops = [op for op in operation_types if op in formula and formula[op] is not None]

    if len(present_ops) == 0:
        errors.append('calculationFormula must have one of: add, sub, mul, div, pos, operand')
    elif len(present_ops) > 1:
        errors.append(f'calculationFormula must have exactly one operation, found: {present_ops}')
    else:
        op_type = present_ops[0]

        if op_type == 'add':
            # add: array of operands
            if not isinstance(formula['add'], list):
                errors.append('add operation must be an array of operands')
            else:
                for i, operand in enumerate(formula['add']):
                    op_errors = validate_operand(operand)
                    errors.extend([f'add[{i}]: {e}' for e in op_errors])

        elif op_type == 'sub':
            # sub: {minuend, subtrahend}
            if not isinstance(formula['sub'], dict):
                errors.append('sub operation must have minuend and subtrahend')
            else:
                if 'minuend' not in formula['sub']:
                    errors.append('sub operation missing minuend')
                else:
                    errors.extend([f'sub.minuend: {e}' for e in validate_operand(formula['sub']['minuend'])])

                if 'subtrahend' not in formula['sub']:
                    errors.append('sub operation missing subtrahend')
                else:
                    errors.extend([f'sub.subtrahend: {e}' for e in validate_operand(formula['sub']['subtrahend'])])

        elif op_type == 'mul':
            # mul: array of operands
            if not isinstance(formula['mul'], list):
                errors.append('mul operation must be an array of operands')
            else:
                for i, operand in enumerate(formula['mul']):
                    op_errors = validate_operand(operand)
                    errors.extend([f'mul[{i}]: {e}' for e in op_errors])

        elif op_type == 'div':
            # div: array of operands
            if not isinstance(formula['div'], list):
                errors.append('div operation must be an array of operands')
            else:
                for i, operand in enumerate(formula['div']):
                    op_errors = validate_operand(operand)
                    errors.extend([f'div[{i}]: {e}' for e in op_errors])

        elif op_type == 'pos':
            # pos: single operand
            errors.extend([f'pos: {e}' for e in validate_operand(formula['pos'])])

        elif op_type == 'operand':
            # operand: single operand
            errors.extend(validate_operand(formula['operand']))

    return errors


def validate_time_slice(time_slice: Dict[str, Any]) -> List[str]:
    """Validate calculationFormulaTimeSlice structure"""
    errors = []

    # Required fields
    required_fields = ['timeSliceId', 'timeSliceQuality', 'periodOfUseFrom',
                       'periodOfUseTo', 'calculationFormula']

    for field in required_fields:
        if field not in time_slice:
            errors.append(f'Time slice missing required field: {field}')

    # Validate timeSliceId (integer)
    if 'timeSliceId' in time_slice:
        if not isinstance(time_slice['timeSliceId'], int):
            errors.append('timeSliceId must be an integer')

    # Validate timeSliceQuality
    if 'timeSliceQuality' in time_slice:
        if time_slice['timeSliceQuality'] not in VALID_TIME_SLICE_QUALITIES:
            errors.append(f'Invalid timeSliceQuality: {time_slice["timeSliceQuality"]}. Must be: Gültige Daten or Keine Daten')

    # Validate period timestamps
    for field in ['periodOfUseFrom', 'periodOfUseTo']:
        if field in time_slice:
            try:
                datetime.fromisoformat(time_slice[field].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                errors.append(f'{field} must be ISO 8601 format')

    # Validate calculationFormula
    if 'calculationFormula' in time_slice:
        errors.extend(validate_calculation_formula(time_slice['calculationFormula']))

    return errors


def validate_formula_location(data: Dict[str, Any]) -> List[str]:
    """Validate FormulaLocation (main request body)"""
    errors = []

    # Must have either maloId OR neloId
    has_malo = 'maloId' in data and data['maloId']
    has_nelo = 'neloId' in data and data['neloId']

    if not has_malo and not has_nelo:
        errors.append('FormulaLocation must have either maloId or neloId')

    if has_malo and has_nelo:
        errors.append('FormulaLocation must have either maloId OR neloId, not both')

    # Validate maloId format
    if has_malo and not validate_malo_id(data['maloId']):
        errors.append(f'Invalid maloId format: {data["maloId"]}. Expected: 11 digits')

    # Validate neloId format
    if has_nelo and not validate_nelo_id(data['neloId']):
        errors.append(f'Invalid neloId format: {data["neloId"]}. Expected: E + 9 alphanumeric + 1 digit')

    # Must have calculationFormulaTimeSlices
    if 'calculationFormulaTimeSlices' not in data:
        errors.append('FormulaLocation must have calculationFormulaTimeSlices')
    elif not isinstance(data['calculationFormulaTimeSlices'], list):
        errors.append('calculationFormulaTimeSlices must be an array')
    elif len(data['calculationFormulaTimeSlices']) == 0:
        errors.append('calculationFormulaTimeSlices cannot be empty')
    else:
        for i, time_slice in enumerate(data['calculationFormulaTimeSlices']):
            ts_errors = validate_time_slice(time_slice)
            errors.extend([f'timeSlice[{i}]: {e}' for e in ts_errors])

    return errors


# =============================================================================
# Formula Calculation Engine (EDI@Energy compliant)
# =============================================================================

def execute_operand(operand: Dict[str, Any], input_data: Dict[str, List[Dict]], interval_idx: int) -> float:
    """
    Execute a single operand and return its value

    Args:
        operand: The operand to execute (meloOperand, const, formulaVar, calculationFormula)
        input_data: Dictionary mapping meloId -> list of intervals
        interval_idx: Current interval index

    Returns:
        Calculated float value
    """
    if 'meloOperand' in operand and operand['meloOperand']:
        melo = operand['meloOperand']
        melo_id = melo['meloId']

        # Get base value from time series
        if melo_id in input_data and interval_idx < len(input_data[melo_id]):
            base_value = float(input_data[melo_id][interval_idx].get('quantity', 0))
        else:
            base_value = 0.0

        # Apply loss factors per EDI@Energy specification
        # Formula: value * (1 - loss_transformer) * (1 - loss_conduction) * distribution
        loss_transformer = melo.get('lossFactorTransformer', {}).get('percentvalue', 0)
        loss_conduction = melo.get('lossFactorConduction', {}).get('percentvalue', 0)
        distribution = melo.get('distributionFactorEnergyQuantity', {}).get('percentvalue', 1)

        adjusted_value = base_value * (1 - loss_transformer) * (1 - loss_conduction) * distribution

        # Handle energy direction (production values might be negative in some contexts)
        energy_direction = melo.get('energyDirection', 'consumption')
        if energy_direction == 'production':
            # Production is typically represented as negative in balance calculations
            pass  # Keep as-is for now, context-dependent

        return adjusted_value

    elif 'const' in operand and operand['const'] is not None:
        return float(operand['const'])

    elif 'formulaVar' in operand and operand['formulaVar']:
        # Formula variables would require a variable context
        # For now, return 0 (would be extended with variable resolution)
        return 0.0

    elif 'calculationFormula' in operand and operand['calculationFormula']:
        # Recursive formula execution
        return execute_calculation_formula(operand['calculationFormula'], input_data, interval_idx)

    return 0.0


def execute_calculation_formula(formula: Dict[str, Any], input_data: Dict[str, List[Dict]], interval_idx: int) -> float:
    """
    Execute a calculation formula for a specific interval

    Supports operations: add, sub, mul, div, pos, operand
    Per EDI@Energy specification

    Args:
        formula: The calculation formula
        input_data: Dictionary mapping meloId -> list of intervals
        interval_idx: Current interval index

    Returns:
        Calculated float value
    """
    if 'add' in formula and formula['add']:
        # Addition: sum all operands
        total = 0.0
        for operand in formula['add']:
            total += execute_operand(operand, input_data, interval_idx)
        return total

    elif 'sub' in formula and formula['sub']:
        # Subtraction: minuend - subtrahend
        minuend = execute_operand(formula['sub']['minuend'], input_data, interval_idx)
        subtrahend = execute_operand(formula['sub']['subtrahend'], input_data, interval_idx)
        return minuend - subtrahend

    elif 'mul' in formula and formula['mul']:
        # Multiplication: multiply all operands
        result = 1.0
        for operand in formula['mul']:
            result *= execute_operand(operand, input_data, interval_idx)
        return result

    elif 'div' in formula and formula['div']:
        # Division: divide sequentially (first / second / third ...)
        operands = formula['div']
        if len(operands) == 0:
            return 0.0

        result = execute_operand(operands[0], input_data, interval_idx)
        for operand in operands[1:]:
            divisor = execute_operand(operand, input_data, interval_idx)
            if divisor != 0:
                result /= divisor
            else:
                # Division by zero: return 0 or could raise error
                return 0.0
        return result

    elif 'pos' in formula and formula['pos']:
        # Unary positive: return absolute value
        value = execute_operand(formula['pos'], input_data, interval_idx)
        return abs(value)

    elif 'operand' in formula and formula['operand']:
        # Single operand
        return execute_operand(formula['operand'], input_data, interval_idx)

    return 0.0


def calculate_time_slice(time_slice: Dict[str, Any], input_data: Dict[str, List[Dict]]) -> List[Dict]:
    """
    Execute calculation for a time slice across all intervals

    Args:
        time_slice: The calculationFormulaTimeSlice
        input_data: Dictionary mapping meloId -> list of intervals

    Returns:
        List of calculated intervals
    """
    formula = time_slice['calculationFormula']

    # Determine number of intervals from input data
    if not input_data:
        return []

    first_melo_id = list(input_data.keys())[0]
    num_intervals = len(input_data[first_melo_id])

    result_intervals = []

    for i in range(num_intervals):
        calculated_value = execute_calculation_formula(formula, input_data, i)

        # Get timestamp from first input series
        first_interval = input_data[first_melo_id][i]

        result_intervals.append({
            'position': i + 1,
            'start': first_interval.get('start', ''),
            'end': first_interval.get('end', ''),
            'quantity': f'{calculated_value:.6f}',
            'quality': time_slice.get('timeSliceQuality', 'Gültige Daten')
        })

    return result_intervals


# =============================================================================
# Helper Functions
# =============================================================================

def generate_id(prefix: str) -> str:
    """Generate unique ID"""
    return f'{prefix}-{uuid.uuid4().hex[:8]}'


def validate_token(auth_header: Optional[str]) -> bool:
    """Validate Bearer token"""
    if not auth_header or not auth_header.startswith('Bearer '):
        return False
    token = auth_header.replace('Bearer ', '')
    return len(token) > 10


def get_current_timestamp() -> str:
    """Get current UTC timestamp in ISO 8601 format"""
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


# =============================================================================
# OAuth2 Endpoints
# =============================================================================

@app.route('/oauth/token', methods=['POST'])
def oauth_token():
    """Mock OAuth2 token endpoint"""
    grant_type = request.form.get('grant_type')
    client_id = request.form.get('client_id')
    client_secret = request.form.get('client_secret')

    if grant_type != 'client_credentials':
        return jsonify({'error': 'unsupported_grant_type'}), 400

    if not client_id or not client_secret:
        return jsonify({'error': 'invalid_client'}), 401

    token = f'mock_token_{uuid.uuid4().hex}'
    valid_tokens.add(token)

    return jsonify({
        'access_token': token,
        'token_type': 'Bearer',
        'expires_in': 3600,
        'scope': 'formula.read formula.write timeseries.read timeseries.write calculations.execute'
    })


# =============================================================================
# EDI@Energy Formula API - POST /formula/v0.0.1
# =============================================================================

@app.route('/formula/v0.0.1', methods=['POST'])
def submit_formula_edi():
    """
    EDI@Energy compliant formula submission endpoint

    Headers (required):
        - transactionId: UUID RFC4122
        - creationDateTime: ISO 8601 timestamp
        - initialTransactionId: (optional) for retry/idempotency

    Request Body: FormulaLocation
        - maloId OR neloId (required, oneOf)
        - calculationFormulaTimeSlices (required, array)

    Response Codes:
        - 202: Accepted
        - 400: Bad Request (validation error)
        - 401: Unauthorized
        - 405: Method Not Allowed
        - 500: Internal Server Error
    """
    # Validate headers
    is_valid, error_msg, headers = validate_headers()
    if not is_valid:
        return jsonify({
            'error': 'Bad Request',
            'message': error_msg,
            'transactionId': request.headers.get('transactionId', 'unknown')
        }), 400

    # Check for idempotency (initialTransactionId)
    initial_tx_id = headers.get('initialTransactionId')
    if initial_tx_id and initial_tx_id in transaction_store:
        # Return cached response for retry
        cached = transaction_store[initial_tx_id]
        return jsonify(cached['response']), cached['status_code']

    # Parse request body
    try:
        data = request.json
        if not data:
            return jsonify({
                'error': 'Bad Request',
                'message': 'Request body is required',
                'transactionId': headers['transactionId']
            }), 400
    except Exception as e:
        return jsonify({
            'error': 'Bad Request',
            'message': f'Invalid JSON: {str(e)}',
            'transactionId': headers['transactionId']
        }), 400

    # Validate FormulaLocation structure
    validation_errors = validate_formula_location(data)
    if validation_errors:
        response = {
            'error': 'Bad Request',
            'message': 'Validation failed',
            'transactionId': headers['transactionId'],
            'validationErrors': validation_errors
        }
        return jsonify(response), 400

    # Store the formula
    location_id = data.get('maloId') or data.get('neloId')
    formula_location_store[location_id] = {
        'data': data,
        'transactionId': headers['transactionId'],
        'creationDateTime': headers['creationDateTime'],
        'acceptedAt': get_current_timestamp()
    }

    # Build success response
    response = {
        'status': 'accepted',
        'transactionId': headers['transactionId'],
        'acceptanceTime': get_current_timestamp(),
        'locationId': location_id,
        'locationType': 'maloId' if 'maloId' in data else 'neloId',
        'timeSlicesAccepted': len(data['calculationFormulaTimeSlices']),
        'validationResults': [
            {
                'timeSliceId': ts['timeSliceId'],
                'valid': True
            }
            for ts in data['calculationFormulaTimeSlices']
        ]
    }

    # Store transaction for idempotency
    transaction_store[headers['transactionId']] = {
        'response': response,
        'status_code': 202
    }

    return jsonify(response), 202


@app.route('/formula/v0.0.1', methods=['GET', 'PUT', 'DELETE', 'PATCH'])
def formula_method_not_allowed():
    """Return 405 for non-POST methods per EDI@Energy specification"""
    return jsonify({
        'error': 'Method Not Allowed',
        'message': 'Only POST method is allowed for /formula/v0.0.1',
        'allowedMethods': ['POST']
    }), 405


# =============================================================================
# Formula Query Endpoints (Additional, not in EDI@Energy spec)
# =============================================================================

@app.route('/formulas', methods=['GET'])
def list_formulas():
    """List all stored formulas (convenience endpoint)"""
    if not validate_token(request.headers.get('Authorization')):
        return jsonify({'error': 'Unauthorized'}), 401

    formulas = []
    for location_id, stored in formula_location_store.items():
        formulas.append({
            'locationId': location_id,
            'locationType': 'maloId' if stored['data'].get('maloId') else 'neloId',
            'timeSliceCount': len(stored['data']['calculationFormulaTimeSlices']),
            'transactionId': stored['transactionId'],
            'acceptedAt': stored['acceptedAt']
        })

    return jsonify({
        'formulas': formulas,
        'totalCount': len(formulas)
    })


@app.route('/formulas/<location_id>', methods=['GET'])
def get_formula(location_id):
    """Get specific formula by location ID"""
    if not validate_token(request.headers.get('Authorization')):
        return jsonify({'error': 'Unauthorized'}), 401

    if location_id not in formula_location_store:
        return jsonify({'error': 'Not found'}), 404

    stored = formula_location_store[location_id]
    return jsonify({
        'locationId': location_id,
        'formulaLocation': stored['data'],
        'transactionId': stored['transactionId'],
        'acceptedAt': stored['acceptedAt']
    })


# =============================================================================
# Time Series Endpoints
# =============================================================================

@app.route('/v1/time-series', methods=['POST'])
def submit_time_series():
    """Submit time series data"""
    if not validate_token(request.headers.get('Authorization')):
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json
    time_series_list = data.get('timeSeries', [])

    accepted_ids = []
    for ts in time_series_list:
        ts_id = ts.get('timeSeriesId')
        if ts_id:
            time_series_store[ts_id] = ts
            accepted_ids.append(ts_id)

    return jsonify({
        'acceptanceTime': get_current_timestamp(),
        'status': 'ACCEPTED',
        'timeSeriesIds': accepted_ids
    }), 201


@app.route('/v1/time-series', methods=['GET'])
def query_time_series():
    """Query time series data"""
    if not validate_token(request.headers.get('Authorization')):
        return jsonify({'error': 'Unauthorized'}), 401

    market_location_id = request.args.get('marketLocationId')
    meter_location_id = request.args.get('meterLocationId')

    results = []
    for ts_id, ts_data in time_series_store.items():
        include = True
        if market_location_id and ts_data.get('marketLocationId') != market_location_id:
            include = False
        if meter_location_id and ts_data.get('meterLocationId') != meter_location_id:
            include = False
        if include:
            results.append(ts_data)

    return jsonify({
        'timeSeries': results,
        'totalCount': len(results)
    })


@app.route('/v1/time-series/<time_series_id>', methods=['GET'])
def get_time_series(time_series_id):
    """Get specific time series"""
    if not validate_token(request.headers.get('Authorization')):
        return jsonify({'error': 'Unauthorized'}), 401

    if time_series_id not in time_series_store:
        return jsonify({'error': 'Not found'}), 404

    return jsonify(time_series_store[time_series_id])


# =============================================================================
# Calculation Endpoints
# =============================================================================

@app.route('/v1/calculations', methods=['POST'])
def execute_calculation():
    """Execute calculation using stored formula"""
    if not validate_token(request.headers.get('Authorization')):
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json
    calculation_id = data.get('calculationId', generate_id('CALC'))
    location_id = data.get('maloId') or data.get('neloId')
    time_slice_id = data.get('timeSliceId')
    input_ts_map = data.get('inputTimeSeries', {})  # meloId -> timeSeriesId
    period = data.get('period', {})
    output_ts_id = data.get('outputTimeSeriesId', generate_id('TS-CALC'))

    # Get formula
    if location_id not in formula_location_store:
        return jsonify({
            'error': 'Not Found',
            'message': f'Formula for location {location_id} not found'
        }), 404

    formula_data = formula_location_store[location_id]['data']

    # Find the time slice
    time_slice = None
    for ts in formula_data['calculationFormulaTimeSlices']:
        if ts['timeSliceId'] == time_slice_id:
            time_slice = ts
            break

    if not time_slice:
        return jsonify({
            'error': 'Not Found',
            'message': f'Time slice {time_slice_id} not found in formula'
        }), 404

    # Build input data from time series
    input_data = {}
    for melo_id, ts_id in input_ts_map.items():
        if ts_id in time_series_store:
            input_data[melo_id] = time_series_store[ts_id].get('intervals', [])

    # Store calculation as pending
    calculation_store[calculation_id] = {
        'calculationId': calculation_id,
        'locationId': location_id,
        'timeSliceId': time_slice_id,
        'status': 'PROCESSING',
        'acceptedAt': get_current_timestamp()
    }

    # Execute calculation
    try:
        result_intervals = calculate_time_slice(time_slice, input_data)

        # Create output time series
        output_ts = {
            'timeSeriesId': output_ts_id,
            'marketLocationId': location_id if validate_malo_id(location_id) else None,
            'networkLocationId': location_id if validate_nelo_id(location_id) else None,
            'measurementType': 'CALCULATED',
            'unit': 'KWH',
            'resolution': 'PT15M',
            'period': period,
            'intervals': result_intervals,
            'metadata': {
                'calculatedBy': location_id,
                'timeSliceId': time_slice_id,
                'calculationId': calculation_id,
                'calculatedAt': get_current_timestamp()
            }
        }

        time_series_store[output_ts_id] = output_ts

        calculation_store[calculation_id].update({
            'status': 'COMPLETED',
            'outputTimeSeriesId': output_ts_id,
            'completedAt': get_current_timestamp(),
            'intervalsCalculated': len(result_intervals)
        })

    except Exception as e:
        calculation_store[calculation_id].update({
            'status': 'FAILED',
            'errors': [{'code': 'CALCULATION_ERROR', 'message': str(e)}]
        })

    return jsonify({
        'calculationId': calculation_id,
        'status': calculation_store[calculation_id]['status'],
        'acceptedAt': calculation_store[calculation_id]['acceptedAt']
    }), 202


@app.route('/v1/calculations/<calculation_id>', methods=['GET'])
def get_calculation(calculation_id):
    """Get calculation result"""
    if not validate_token(request.headers.get('Authorization')):
        return jsonify({'error': 'Unauthorized'}), 401

    if calculation_id not in calculation_store:
        return jsonify({'error': 'Not found'}), 404

    return jsonify(calculation_store[calculation_id])


# =============================================================================
# Health Check & Root
# =============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': get_current_timestamp(),
        'version': '0.0.1',
        'specification': 'EDI@Energy formel_v0.0.1',
        'stats': {
            'formulas': len(formula_location_store),
            'timeSeries': len(time_series_store),
            'calculations': len(calculation_store),
            'transactions': len(transaction_store)
        }
    })


@app.route('/', methods=['GET'])
def root():
    """Root endpoint with API info"""
    return jsonify({
        'name': 'EDI@Energy Formula API',
        'version': '0.0.1',
        'specification': 'EDI@Energy formel_v0.0.1',
        'description': 'EDI@Energy compliant API for transmitting calculation formulas',
        'endpoints': {
            'formula': {
                'POST /formula/v0.0.1': 'Submit formula (EDI@Energy compliant)',
                'GET /formulas': 'List all formulas',
                'GET /formulas/{locationId}': 'Get specific formula'
            },
            'timeSeries': {
                'POST /v1/time-series': 'Submit time series',
                'GET /v1/time-series': 'Query time series',
                'GET /v1/time-series/{id}': 'Get specific time series'
            },
            'calculations': {
                'POST /v1/calculations': 'Execute calculation',
                'GET /v1/calculations/{id}': 'Get calculation result'
            },
            'auth': {
                'POST /oauth/token': 'Get OAuth2 token'
            },
            'health': {
                'GET /health': 'Health check'
            }
        },
        'requiredHeaders': {
            'transactionId': 'UUID RFC4122 (required)',
            'creationDateTime': 'ISO 8601 timestamp (required)',
            'initialTransactionId': 'UUID RFC4122 (optional, for idempotency)'
        }
    })


# =============================================================================
# Legacy Endpoints (Backwards Compatibility)
# =============================================================================

@app.route('/v1/formulas', methods=['POST'])
def submit_formula_legacy():
    """
    Legacy formula submission endpoint
    Redirects to EDI@Energy compliant endpoint
    """
    # Generate headers if not present
    if not request.headers.get('transactionId'):
        # Create synthetic headers for legacy requests
        return jsonify({
            'error': 'Migration Required',
            'message': 'Please use POST /formula/v0.0.1 with required headers: transactionId, creationDateTime',
            'documentation': 'See EDI@Energy formel_v0.0.1 specification'
        }), 400


@app.route('/v1/formulas', methods=['GET'])
def list_formulas_legacy():
    """Legacy list formulas - redirects to new endpoint"""
    return list_formulas()


@app.route('/v1/formulas/<formula_id>', methods=['GET'])
def get_formula_legacy(formula_id):
    """Legacy get formula - redirects to new endpoint"""
    return get_formula(formula_id)


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == '__main__':
    print('=' * 70)
    print('EDI@Energy Formula API Server')
    print('Specification: formel_v0.0.1')
    print('=' * 70)
    print()
    print('Server starting on: http://localhost:8000')
    print()
    print('EDI@Energy Compliant Endpoints:')
    print('  POST   /formula/v0.0.1         - Submit formula (EDI@Energy)')
    print()
    print('Required Headers:')
    print('  transactionId      - UUID RFC4122 (required)')
    print('  creationDateTime   - ISO 8601 (required)')
    print('  initialTransactionId - UUID (optional, for retry)')
    print()
    print('Additional Endpoints:')
    print('  GET    /formulas              - List all formulas')
    print('  GET    /formulas/{id}         - Get specific formula')
    print('  POST   /v1/time-series        - Submit time series')
    print('  GET    /v1/time-series        - Query time series')
    print('  POST   /v1/calculations       - Execute calculation')
    print('  GET    /v1/calculations/{id}  - Get calculation result')
    print('  POST   /oauth/token           - Get OAuth2 token')
    print('  GET    /health                - Health check')
    print()
    print('Test with: python demo_client.py')
    print('=' * 70)
    print()

    app.run(debug=True, host='0.0.0.0', port=8000)
