import pdfplumber
import re
from typing import List
from .base_parser import BaseParser

class SwiggyHDFCParser(BaseParser):
    """
    Parser for HDFC Bank Swiggy Credit Card PDF e-statements.
    Handles pipes, time stamps, credit indicators, and OCR artifacts.
    """

    def parse(self, pdf_path: str, password: str = None) -> List[dict]:
        """
        Parses a Swiggy HDFC credit card statement PDF.

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
        
        # Regex to match: "29/01/2026| 21:04 SWIGGY LIMITEDBANGALORE C 126.00 l"
        # Or Credit: "15/01/2026| 13:45 BPPY CC PAYMENT ... + C 1,000.00 l"
        row_pattern = re.compile(r"^(\d{2}/\d{2}/\d{4})\|\s+(\d{2}:\d{2})\s+(.+?)\s+(\+?)\s*C\s*([\d,]+\.\d{2})(?:\s*l)?$")
        
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
                        desc = match.group(3).strip()
                        is_credit = match.group(4) == '+'
                        amount_str = match.group(5).replace(',', '').strip()
                        txn_type = 'Cr' if is_credit else 'Dr'
                        
                        amount = float(amount_str)
                        
                        transactions.append({
                            "date": date_str,
                            "description": desc,
                            "amount": amount,
                            "type": txn_type
                        })
                        
        return transactions
