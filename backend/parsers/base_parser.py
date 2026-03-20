from abc import ABC, abstractmethod
from typing import List

class BaseParser(ABC):
    """
    Abstract strategy class for parsing bank statement PDFs.
    """
    
    @abstractmethod
    def parse(self, pdf_path: str, password: str = None) -> List[dict]:
        """
        Extracts raw transactions from a PDF.
        Returns a list of dicts:
        [
            {
                "date": "DD/MM/YYYY",
                "description": "Merchant Name",
                "amount": 100.0,
                "type": "Cr" or "Dr"
            }, ...
        ]
        """
        pass
