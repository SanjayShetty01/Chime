import pdfplumber
import re
from typing import List
from .base_parser import BaseParser

class SBICashbackParser(BaseParser):
    def parse(self, pdf_path: str, password: str = None) -> List[dict]:
        transactions = []
        
        # Regex to match: "10 Dec 25 ZEPTO MARKETPLACE PRIV Bangalore IN 1,271.00 D"
        row_pattern = re.compile(r"^(\d{2}\s[A-Z][a-z]{2}\s\d{2})\s(.+?)\s([\d,]+\.\d{2})\s([A-Z])$")
        
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
                        raw_type = match.group(4).strip()
                        
                        amount = float(amount_str)
                        txn_type = 'Cr' if raw_type == 'C' else 'Dr'
                        
                        transactions.append({
                            "date": date_str,
                            "description": desc,
                            "amount": amount,
                            "type": txn_type
                        })
                        
        return transactions
