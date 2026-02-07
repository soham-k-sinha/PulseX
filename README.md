# Customer Page Analysis

A Python utility to analyze customer page visits across multiple days from CSV files.

## Overview

This tool identifies customers who have visited at least two distinct pages across two days of web traffic data.

## Features

- ✅ Reads CSV files with timestamp, page_id, and customer_id columns
- ✅ Aggregates page visits across multiple days
- ✅ Returns customers who visited 2+ distinct pages
- ✅ Handles whitespace normalization
- ✅ Skips invalid/empty entries
- ✅ Provides sorted, deterministic output
- ✅ Comprehensive error handling

## Installation

No external dependencies required! Uses Python standard library only.

```bash
# Clone or download the files
# Requires Python 3.7+
```

## Usage

### Basic Example

```python
from customer_page_analysis import get_customers_with_two_pages

# Analyze customer visits across two days
customers = get_customers_with_two_pages('day1.csv', 'day2.csv')

print(f"Found {len(customers)} customers who visited 2+ pages")
print(customers)
```

### CSV File Format

Your CSV files should have a header row with at least these columns:

```csv
timestamp,page_id,customer_id
2024-01-01 10:00:00,page_home,customer_001
2024-01-01 10:15:00,page_about,customer_001
2024-01-01 11:00:00,page_home,customer_002
```

**Note:** Column order doesn't matter as long as the header names match.

### Example Scenario

**day1.csv:**
```csv
timestamp,page_id,customer_id
2024-01-01 10:00:00,page_A,customer_001
2024-01-01 10:15:00,page_A,customer_002
2024-01-01 11:00:00,page_A,customer_003
2024-01-01 11:30:00,page_B,customer_003
```

**day2.csv:**
```csv
timestamp,page_id,customer_id
2024-01-02 09:00:00,page_B,customer_001
2024-01-02 10:00:00,page_A,customer_002
```

**Result:**
```python
['customer_001', 'customer_003']
```

**Explanation:**
- `customer_001`: visited page_A (day1) and page_B (day2) → **2 distinct pages** ✓
- `customer_002`: visited page_A on both days → **1 distinct page** ✗
- `customer_003`: visited page_A and page_B (both on day1) → **2 distinct pages** ✓

## Running Tests

The package includes a comprehensive test suite:

```bash
python3 test_customer_page_analysis.py
```

Test coverage includes:
- Basic functionality with multiple customers
- Same-day multiple page visits
- Cross-day page visits
- Edge cases (whitespace, empty values)
- Large dataset simulation (100+ customers)

## Function Reference

### `get_customers_with_two_pages(day1_csv_path, day2_csv_path)`

**Parameters:**
- `day1_csv_path` (str): Path to the first day's CSV file
- `day2_csv_path` (str): Path to the second day's CSV file

**Returns:**
- `List[str]`: Sorted list of customer IDs that visited at least 2 distinct pages

**Raises:**
- `FileNotFoundError`: If either CSV file doesn't exist
- `ValueError`: If required columns (page_id, customer_id) are missing

## Implementation Details

### Algorithm

1. **Validation**: Check that both CSV files exist
2. **Aggregation**: Read both files and build a dictionary mapping each customer to their set of unique pages
3. **Filtering**: Select customers where the page set size ≥ 2
4. **Sorting**: Return a sorted list for deterministic output

### Time Complexity

- **O(n + m)** where n and m are the number of rows in each CSV file
- Set operations provide O(1) average case for adding pages

### Space Complexity

- **O(k × p)** where k is the number of unique customers and p is the average number of unique pages per customer

## Edge Cases Handled

- ✅ Whitespace in customer IDs and page IDs (automatically stripped)
- ✅ Empty customer IDs or page IDs (skipped)
- ✅ Duplicate visits to the same page (counted once)
- ✅ Customers appearing in only one file
- ✅ Empty CSV files (returns empty list)

## License

Free to use for any purpose.


