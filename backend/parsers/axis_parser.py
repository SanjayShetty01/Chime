import pdfplumber
import re
from typing import List
from .base_parser import BaseParser

class AirtelAxisParser(BaseParser):
    """
    Parser for Axis Bank Airtel Credit Card PDF e-statements.
    Extracts transaction date, merchant description, amount, and debit or credit indicator.
    """

    def parse(self, pdf_path: str, password: str = None) -> List[dict]:
        """
        Parses an Airtel Axis credit card statement PDF.

        Args:
            pdf_path: Local filesystem path to the PDF file.
            password: Optional password for encrypted PDF statements.

        Returns:
            List of transaction dictionaries with keys:
            - date: string in DD/MM/YYYY format
            - description: merchant or payment text
            - amount: float transaction amount
            - type: "Dr" for debits or "Cr" for credits/refunds
        """
        transactions = []
        
        # Regex to match: "13/01/2026 PYU*SWIGGY FOOD,BANGALORE FOOD PRODUCTS 137.00 Dr"
        row_pattern = re.compile(r"^(\d{2}/\d{2}/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s+(Dr|Cr)$")
        
        with pdfplumber.open(pdf_path, password=password) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text:
                    continue
                    
                for line in text.split('\n'):
                    line = line.strip()
                    match = row_pattern.match(line)
                    if match:
                        date_str = match.group(1).strip()
                        desc = match.group(2).strip()
                        amount_str = match.group(3).replace(',', '').strip()
                        txn_type = match.group(4).strip()
                        
                        amount = float(amount_str)
                        
                        transactions.append({
                            "date": date_str,
                            "description": desc,
                            "amount": amount,
                            "type": txn_type
                        })
                        
        return transactions
