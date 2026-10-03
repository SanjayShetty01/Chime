# 03 - PDF Statement Parsing and Ingestion

The statement ingestion subsystem in `backend/parsers/` extracts tabular and text records from encrypted, heterogeneous Indian credit card statement PDFs.

---

## 1. Parser Architecture

All parsers inherit from `BaseParser` in `backend/parsers/base.py` and are registered in `backend/parsers/__init__.py`.

```text
backend/parsers/
├── __init__.py      # Parser registry and factory (get_parser)
├── base.py          # Abstract BaseParser class
├── sbi.py           # SBI Cashback Card parser
├── airtel.py        # Axis Airtel Card parser
└── swiggy.py        # HDFC Swiggy Card parser
```

### The `BaseParser` Contract

```python
class BaseParser(ABC):
    @abstractmethod
    def parse(self, pdf_path: str, password: Optional[str] = None) -> Union[List[dict], dict]:
        """
        Parses the statement PDF.
        Returns either:
        - List[dict]: list of transaction dictionaries
        - dict: {"month": "YYYY-MM", "transactions": list[dict]}
        """
        pass
```

### Standard Output Format

Each parsed transaction must conform to the following dictionary structure:

```python
{
    "date": "YYYY-MM-DD",        # ISO 8601 formatted date string
    "description": "MERCHANT",   # Cleaned merchant name or transaction narrative
    "amount": 1499.00,           # Positive floating-point transaction amount
    "type": "Dr"                 # "Dr" for debits/spends, "Cr" for payments/reversals
}
```

---

## 2. Ingestion & Decryption Lifecycle

1. **Temporary Staging**: When an encrypted PDF is uploaded to `/api/upload-statement`, it is staged into a temporary file created via `tempfile.mkstemp(suffix=".pdf")`.
2. **Password Decryption**:
   - `pdfplumber.open(path, password=password)` attempts decryption.
   - If incorrect password or missing password: `HTTPException(400, "Wrong password...")` or `"This PDF is password-protected..."` is returned with clear user-friendly instructions.
3. **Table & Text Extraction**:
   - Specific regexes and coordinate crop boundaries extract transaction tables across pages.
   - Date formats (e.g. `DD/MM/YYYY`, `DD-Mon-YYYY`, `DD Mon YYYY`) are parsed into standard `YYYY-MM-DD`.
4. **Statement Month Detection**:
   - Parsers extract statement billing cycle dates or due dates from statement headers, returning `{"month": "YYYY-MM", "transactions": [...]}`.
5. **Cleanup**:
   - The temporary PDF file is deleted inside the `finally` block of `upload_statement`, guaranteeing zero residual files on disk.

---

## 3. Implemented Card Parsers

### 1. SBI Cashback (`backend/parsers/sbi.py`)
- **Statement Format**: Standard SBI Card monthly statement layout.
- **Table Detection**: Parses transaction tables headed with Date, Transaction Details, Amount, and Type.
- **Handling EMI & Fees**: Identifies processing fees, finance charges, and GST line items as Excluded debits.

### 2. Axis Airtel (`backend/parsers/airtel.py`)
- **Statement Format**: Axis Bank Credit Card statement layout.
- **Transaction Splitting**: Isolates primary cardholder transactions from payment receipts.

### 3. HDFC Swiggy (`backend/parsers/swiggy.py`)
- **Statement Format**: HDFC Bank monthly credit card statement format.
- **Domestic / International Splits**: Handles dual-currency sections, parsing INR amounts.

---

## 4. How to Add a New Card Parser

To support a new credit card (e.g. `icici-amazon`):

1. **Create Parser File**: Create `backend/parsers/icici.py`:
   ```python
   from .base import BaseParser
   import pdfplumber

   class ICICIAmazonParser(BaseParser):
       def parse(self, pdf_path: str, password: str = None):
           txns = []
           with pdfplumber.open(pdf_path, password=password) as pdf:
               for page in pdf.pages:
                   text = page.extract_text()
                   # Extract transactions using regex or table extraction
           return {"month": "2026-03", "transactions": txns}
   ```
2. **Register in Factory**: In `backend/parsers/__init__.py`:
   ```python
   from .icici import ICICIAmazonParser

   def get_parser(card_id: str) -> BaseParser:
       parsers = {
           "sbi-cashback": SBICashbackParser(),
           "axis-airtel": AxisAirtelParser(),
           "hdfc-swiggy": HDFCSwiggyParser(),
           "icici-amazon": ICICIAmazonParser(),
       }
       ...
   ```
3. **Add Definitions**: Add the card configuration to `backend/cards.yaml` and merchant classification rules to `backend/keyword_rules.yaml`.
