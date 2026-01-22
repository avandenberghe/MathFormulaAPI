#!/usr/bin/env python3
# SPDX-License-Identifier: EUPL-1.2
"""
EDI@Energy Compliant Demo Client
Specification: EDI@Energy formel_v0.0.1

This demo client demonstrates:
1. EDI@Energy compliant formula submission with required headers
2. meloOperand structure with all loss factors
3. calculationFormulaTimeSlice structure
4. Operation-based formulas (add, sub, mul, div, pos)

Usage:
    python demo_client_edi.py
"""

import requests
import uuid
import os
from datetime import datetime, timezone, timedelta
import json

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000")


def get_timestamp() -> str:
    """Get current UTC timestamp in ISO 8601 format"""
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def generate_transaction_id() -> str:
    """Generate UUID RFC4122 for transactionId"""
    return str(uuid.uuid4())


def get_oauth_token() -> str:
    """Get OAuth2 access token"""
    print("\n" + "=" * 70)
    print("Step 1: Authenticate (OAuth2)")
    print("=" * 70)

    response = requests.post(
        f"{BASE_URL}/oauth/token",
        data={
            "grant_type": "client_credentials",
            "client_id": "demo-client",
            "client_secret": "demo-secret",
            "scope": "formula.read formula.write timeseries.read timeseries.write"
        }
    )

    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"[OK] Token obtained: {token[:20]}...")
        return token
    else:
        print(f"[ERROR] Authentication failed: {response.text}")
        raise Exception("Authentication failed")


def submit_formula_edi_compliant(token: str) -> dict:
    """
    Submit an EDI@Energy compliant formula

    Demonstrates:
    - Required headers (transactionId, creationDateTime)
    - FormulaLocation structure
    - calculationFormulaTimeSlice with operations
    - meloOperand with all loss factors
    """
    print("\n" + "=" * 70)
    print("Step 2: Submit EDI@Energy Compliant Formula")
    print("=" * 70)

    # Generate EDI@Energy compliant headers
    transaction_id = generate_transaction_id()
    creation_datetime = get_timestamp()

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
        "transactionId": transaction_id,
        "creationDateTime": creation_datetime,
    }

    print(f"\nHeaders:")
    print(f"  transactionId: {transaction_id}")
    print(f"  creationDateTime: {creation_datetime}")

    # EDI@Energy compliant FormulaLocation
    formula_location = {
        "maloId": "12345678901",  # 11-digit Market Location ID
        "calculationFormulaTimeSlices": [
            {
                "timeSliceId": 1,
                "timeSliceQuality": "Gültige Daten",
                "periodOfUseFrom": "2024-01-01T00:00:00Z",
                "periodOfUseTo": "2024-12-31T23:59:59Z",
                "calculationFormula": {
                    # Example: Add two meloOperands
                    "add": [
                        {
                            "meloOperand": {
                                "meloId": "DE00014545768S0000000000000003054",
                                "energyDirection": "consumption",
                                "lossFactorTransformer": {"percentvalue": 0.02},
                                "lossFactorConduction": {"percentvalue": 0.01},
                                "distributionFactorEnergyQuantity": {"percentvalue": 0.95}
                            }
                        },
                        {
                            "meloOperand": {
                                "meloId": "DE00014545768S0000000000000003055",
                                "energyDirection": "consumption",
                                "lossFactorTransformer": {"percentvalue": 0.015},
                                "lossFactorConduction": {"percentvalue": 0.005},
                                "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
                            }
                        }
                    ]
                }
            },
            {
                "timeSliceId": 2,
                "timeSliceQuality": "Gültige Daten",
                "periodOfUseFrom": "2024-01-01T00:00:00Z",
                "periodOfUseTo": "2024-12-31T23:59:59Z",
                "calculationFormula": {
                    # Example: Subtraction
                    "sub": {
                        "minuend": {
                            "meloOperand": {
                                "meloId": "DE00014545768S0000000000000003054",
                                "energyDirection": "production",
                                "lossFactorTransformer": {"percentvalue": 0.0},
                                "lossFactorConduction": {"percentvalue": 0.0},
                                "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
                            }
                        },
                        "subtrahend": {
                            "const": "50.5"
                        }
                    }
                }
            },
            {
                "timeSliceId": 3,
                "timeSliceQuality": "Gültige Daten",
                "periodOfUseFrom": "2024-01-01T00:00:00Z",
                "periodOfUseTo": "2024-12-31T23:59:59Z",
                "calculationFormula": {
                    # Example: Multiplication with loss factor
                    "mul": [
                        {
                            "meloOperand": {
                                "meloId": "DE00014545768S0000000000000003054",
                                "energyDirection": "consumption",
                                "lossFactorTransformer": {"percentvalue": 0.0},
                                "lossFactorConduction": {"percentvalue": 0.0},
                                "distributionFactorEnergyQuantity": {"percentvalue": 1.0}
                            }
                        },
                        {
                            "const": "0.98"  # Apply 2% loss
                        }
                    ]
                }
            }
        ]
    }

    print(f"\nRequest Body (FormulaLocation):")
    print(f"  maloId: {formula_location['maloId']}")
    print(f"  timeSlices: {len(formula_location['calculationFormulaTimeSlices'])}")

    for ts in formula_location['calculationFormulaTimeSlices']:
        formula = ts['calculationFormula']
        op_type = list(formula.keys())[0]
        print(f"    - timeSliceId: {ts['timeSliceId']}, operation: {op_type}")

    # Submit to EDI@Energy endpoint
    response = requests.post(
        f"{BASE_URL}/formula/v0.0.1",
        headers=headers,
        json=formula_location
    )

    print(f"\nResponse:")
    print(f"  Status: {response.status_code}")

    if response.status_code == 202:
        result = response.json()
        print(f"  [OK] Formula accepted!")
        print(f"  transactionId: {result.get('transactionId')}")
        print(f"  locationId: {result.get('locationId')}")
        print(f"  timeSlicesAccepted: {result.get('timeSlicesAccepted')}")
        return result
    else:
        print(f"  [ERROR] {response.text}")
        return response.json()


def submit_time_series(token: str):
    """Submit time series data for the meloIds used in formulas"""
    print("\n" + "=" * 70)
    print("Step 3: Submit Time Series Data")
    print("=" * 70)

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    # Generate 96 intervals (24 hours * 4 per hour = 15-minute intervals)
    base_time = datetime(2024, 6, 1, 0, 0, 0, tzinfo=timezone.utc)

    def generate_intervals(base_value: float, variation: float = 10.0):
        intervals = []
        for i in range(96):
            start = base_time + timedelta(minutes=15 * i)
            end = start + timedelta(minutes=15)
            # Add some variation
            value = base_value + (i % 10) * variation / 10
            intervals.append({
                "position": i + 1,
                "start": start.isoformat().replace('+00:00', 'Z'),
                "end": end.isoformat().replace('+00:00', 'Z'),
                "quantity": f"{value:.3f}",
                "quality": "Gültige Daten"
            })
        return intervals

    time_series = {
        "timeSeries": [
            {
                "timeSeriesId": "TS-MELO-3054",
                "marketLocationId": "12345678901",
                "meterLocationId": "DE00014545768S0000000000000003054",
                "measurementType": "CONSUMPTION",
                "unit": "KWH",
                "resolution": "PT15M",
                "period": {
                    "start": "2024-06-01T00:00:00Z",
                    "end": "2024-06-02T00:00:00Z"
                },
                "intervals": generate_intervals(100.0)
            },
            {
                "timeSeriesId": "TS-MELO-3055",
                "marketLocationId": "12345678901",
                "meterLocationId": "DE00014545768S0000000000000003055",
                "measurementType": "CONSUMPTION",
                "unit": "KWH",
                "resolution": "PT15M",
                "period": {
                    "start": "2024-06-01T00:00:00Z",
                    "end": "2024-06-02T00:00:00Z"
                },
                "intervals": generate_intervals(50.0, 5.0)
            }
        ]
    }

    response = requests.post(
        f"{BASE_URL}/v1/time-series",
        headers=headers,
        json=time_series
    )

    print(f"\nResponse:")
    print(f"  Status: {response.status_code}")

    if response.status_code == 201:
        result = response.json()
        print(f"  [OK] Time series accepted!")
        print(f"  timeSeriesIds: {result.get('timeSeriesIds')}")
        return result
    else:
        print(f"  [ERROR] {response.text}")
        return None


def execute_calculation(token: str):
    """Execute calculation using stored formula and time series"""
    print("\n" + "=" * 70)
    print("Step 4: Execute Calculation")
    print("=" * 70)

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    calculation_request = {
        "calculationId": f"CALC-{uuid.uuid4().hex[:8]}",
        "maloId": "12345678901",
        "timeSliceId": 1,  # Use the ADD formula
        "inputTimeSeries": {
            # Map meloId to timeSeriesId
            "DE00014545768S0000000000000003054": "TS-MELO-3054",
            "DE00014545768S0000000000000003055": "TS-MELO-3055"
        },
        "period": {
            "start": "2024-06-01T00:00:00Z",
            "end": "2024-06-02T00:00:00Z"
        }
    }

    print(f"\nCalculation Request:")
    print(f"  maloId: {calculation_request['maloId']}")
    print(f"  timeSliceId: {calculation_request['timeSliceId']}")
    print(f"  inputTimeSeries: {len(calculation_request['inputTimeSeries'])} mappings")

    response = requests.post(
        f"{BASE_URL}/v1/calculations",
        headers=headers,
        json=calculation_request
    )

    print(f"\nResponse:")
    print(f"  Status: {response.status_code}")

    if response.status_code == 202:
        result = response.json()
        print(f"  [OK] Calculation submitted!")
        print(f"  calculationId: {result.get('calculationId')}")
        print(f"  status: {result.get('status')}")

        # Get calculation result
        calc_id = result.get('calculationId')
        calc_response = requests.get(
            f"{BASE_URL}/v1/calculations/{calc_id}",
            headers=headers
        )

        if calc_response.status_code == 200:
            calc_result = calc_response.json()
            print(f"\n  Calculation Result:")
            print(f"    status: {calc_result.get('status')}")
            print(f"    outputTimeSeriesId: {calc_result.get('outputTimeSeriesId')}")
            print(f"    intervalsCalculated: {calc_result.get('intervalsCalculated')}")

            # Get output time series
            output_ts_id = calc_result.get('outputTimeSeriesId')
            if output_ts_id:
                ts_response = requests.get(
                    f"{BASE_URL}/v1/time-series/{output_ts_id}",
                    headers=headers
                )
                if ts_response.status_code == 200:
                    ts_data = ts_response.json()
                    intervals = ts_data.get('intervals', [])
                    print(f"\n  Output Time Series (first 5 intervals):")
                    for interval in intervals[:5]:
                        print(f"    {interval['start']}: {interval['quantity']} kWh ({interval['quality']})")

        return result
    else:
        print(f"  [ERROR] {response.text}")
        return None


def test_validation_errors(token: str):
    """Test validation error responses"""
    print("\n" + "=" * 70)
    print("Step 5: Test Validation Errors")
    print("=" * 70)

    # Test 1: Missing transactionId header
    print("\nTest 1: Missing transactionId header")
    response = requests.post(
        f"{BASE_URL}/formula/v0.0.1",
        headers={
            "Content-Type": "application/json",
            "creationDateTime": get_timestamp(),
        },
        json={"maloId": "12345678901", "calculationFormulaTimeSlices": []}
    )
    print(f"  Status: {response.status_code}")
    print(f"  Message: {response.json().get('message')}")

    # Test 2: Invalid maloId format
    print("\nTest 2: Invalid maloId format")
    response = requests.post(
        f"{BASE_URL}/formula/v0.0.1",
        headers={
            "Content-Type": "application/json",
            "transactionId": generate_transaction_id(),
            "creationDateTime": get_timestamp(),
        },
        json={
            "maloId": "123",  # Should be 11 digits
            "calculationFormulaTimeSlices": [
                {
                    "timeSliceId": 1,
                    "timeSliceQuality": "Gültige Daten",
                    "periodOfUseFrom": "2024-01-01T00:00:00Z",
                    "periodOfUseTo": "2024-12-31T23:59:59Z",
                    "calculationFormula": {"operand": {"const": "100"}}
                }
            ]
        }
    )
    print(f"  Status: {response.status_code}")
    errors = response.json().get('validationErrors', [])
    for error in errors[:3]:
        print(f"  - {error}")

    # Test 3: Invalid meloId format
    print("\nTest 3: Invalid meloId format in meloOperand")
    response = requests.post(
        f"{BASE_URL}/formula/v0.0.1",
        headers={
            "Content-Type": "application/json",
            "transactionId": generate_transaction_id(),
            "creationDateTime": get_timestamp(),
        },
        json={
            "maloId": "12345678901",
            "calculationFormulaTimeSlices": [
                {
                    "timeSliceId": 1,
                    "timeSliceQuality": "Gültige Daten",
                    "periodOfUseFrom": "2024-01-01T00:00:00Z",
                    "periodOfUseTo": "2024-12-31T23:59:59Z",
                    "calculationFormula": {
                        "operand": {
                            "meloOperand": {
                                "meloId": "INVALID_ID",  # Should be DE + 11 digits + 20 alphanumeric
                                "energyDirection": "consumption",
                                "lossFactorTransformer": {"percentvalue": 0.02},
                                "lossFactorConduction": {"percentvalue": 0.01},
                                "distributionFactorEnergyQuantity": {"percentvalue": 0.95}
                            }
                        }
                    }
                }
            ]
        }
    )
    print(f"  Status: {response.status_code}")
    errors = response.json().get('validationErrors', [])
    for error in errors[:3]:
        print(f"  - {error}")

    # Test 4: Method not allowed
    print("\nTest 4: GET on /formula/v0.0.1 (should be 405)")
    response = requests.get(f"{BASE_URL}/formula/v0.0.1")
    print(f"  Status: {response.status_code}")
    print(f"  Message: {response.json().get('message')}")


def list_formulas(token: str):
    """List all stored formulas"""
    print("\n" + "=" * 70)
    print("Step 6: List All Formulas")
    print("=" * 70)

    headers = {
        "Authorization": f"Bearer {token}",
    }

    response = requests.get(f"{BASE_URL}/formulas", headers=headers)

    if response.status_code == 200:
        result = response.json()
        print(f"\nTotal formulas: {result.get('totalCount')}")
        for formula in result.get('formulas', []):
            print(f"  - {formula['locationId']} ({formula['locationType']})")
            print(f"    timeSlices: {formula['timeSliceCount']}")
            print(f"    transactionId: {formula['transactionId']}")
    else:
        print(f"[ERROR] {response.text}")


def main():
    """Run the EDI@Energy compliant demo"""
    print("=" * 70)
    print("EDI@Energy Formula API - Demo Client")
    print("Specification: formel_v0.0.1")
    print("=" * 70)

    try:
        # Step 1: Authenticate
        token = get_oauth_token()

        # Step 2: Submit EDI@Energy compliant formula
        submit_formula_edi_compliant(token)

        # Step 3: Submit time series data
        submit_time_series(token)

        # Step 4: Execute calculation
        execute_calculation(token)

        # Step 5: Test validation errors
        test_validation_errors(token)

        # Step 6: List all formulas
        list_formulas(token)

        print("\n" + "=" * 70)
        print("Demo completed successfully!")
        print("=" * 70)

    except Exception as e:
        print(f"\n[ERROR] Demo failed: {e}")
        raise


if __name__ == "__main__":
    main()
