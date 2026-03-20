import pdfplumber
import re
from typing import List
from .base_parser import BaseParser

class SwiggyHDFCParser(BaseParser):
    def parse(self, pdf_path: str, password: str = None) -> List[dict]:
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
