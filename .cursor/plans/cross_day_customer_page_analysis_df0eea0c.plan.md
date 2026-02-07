---
name: cross_day_customer_page_analysis
overview: Implement a Python function that takes two CSV files (two days of web traffic data) and returns customer IDs that visited at least two distinct pages across both days combined.
todos: []
---

## Cross-day customer page analysis plan

### Goal

Implement a **Python** function that:

- Takes **two CSV file paths** (one per day) with columns: `timestamp`, `page_id`, `customer_id`.
- Returns a **list of strings (customer IDs)** where each customer has visited **at least two distinct pages total across both days combined**.

### Assumptions

- CSVs have a header row with (at least) columns: `timestamp`, `page_id`, `customer_id`.
- Customer IDs and page IDs are treated as **strings**.
- We count unique pages per customer **across both days together**, not per day separately.
- Order of the returned list can be arbitrary unless you specify otherwise.

### High-level approach

- **Step 1 – Define function signature**
- Create a function `get_customers_with_two_pages(day1_csv_path: str, day2_csv_path: str) -> list[str]`.
- **Step 2 – Parse both CSV files**
- Use Python's built-in `csv` module (or `pandas` if you prefer later) to read each file.
- For each row, extract `customer_id` and `page_id`.
- **Step 3 – Aggregate pages per customer across days**
- Maintain a dictionary: `customer_to_pages: dict[str, set[str]]`.
- For each row in both files:
    - Normalize `customer_id` and `page_id` as strings (e.g., `str(value).strip()`).
    - Add `page_id` to the set `customer_to_pages[customer_id]`.
- **Step 4 – Filter customers by distinct page count**
- Iterate over `customer_to_pages.items()`.
- Select customers where `len(pages_set) >= 2`.
- Collect those `customer_id`s into a `result` list of strings.
- **Step 5 – (Optional) Deterministic ordering & validation**
- Optionally sort the result list (e.g., lexicographically by `customer_id`) for predictability.
- Add basic input validation (e.g., ensure files exist, handle missing columns gracefully with clear error messages).
- **Step 6 – Simple test example**
- Create a small, in-memory test scenario (or describe it) with two mock CSV contents to verify:
    - A customer visiting 1 page only (excluded).
    - A customer visiting 2 different pages on the same day (included).
    - A customer visiting page A on day 1 and page B on day 2 (included).

### Optional extensions (only if requested)

- Add a parameter to require **at least N distinct pages** (default 2).
- Add a parameter to choose **case sensitivity** for customer IDs.
- Add support for taking **file-like objects** (e.g., already-open file handles) instead of paths.

### Implementation todos