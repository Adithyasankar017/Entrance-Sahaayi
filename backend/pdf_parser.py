import os
import re
from typing import List, Dict, Any

try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

class DocumentParser:
    """Extracts text from PDF and TXT files and splits them into clean, searchable chunks with metadata."""

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 80):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def parse_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Parses a file (.pdf or .txt) and returns structured chunk dictionaries."""
        ext = os.path.splitext(file_path)[1].lower()
        file_name = os.path.basename(file_path)

        if ext == ".pdf":
            text_blocks = self._extract_text_from_pdf(file_path)
        elif ext in [".txt", ".md", ".json"]:
            text_blocks = self._extract_text_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

        chunks = []
        chunk_id = 0
        for block in text_blocks:
            page_num = block.get("page", 1)
            raw_text = block.get("text", "")
            
            # Split raw text into manageable chunks
            splitted = self._chunk_text(raw_text)
            for chunk_str in splitted:
                if len(chunk_str.strip()) < 20:
                    continue
                chunks.append({
                    "id": f"{file_name}_p{page_num}_c{chunk_id}",
                    "file_name": file_name,
                    "page": page_num,
                    "content": chunk_str.strip(),
                    "source": f"{file_name} (Page {page_num})"
                })
                chunk_id += 1
                
        return chunks

    def _extract_text_from_pdf(self, file_path: str) -> List[Dict[str, Any]]:
        blocks = []
        if HAS_PYPDF:
            try:
                reader = pypdf.PdfReader(file_path)
                for idx, page in enumerate(reader.pages):
                    text = page.extract_text() or ""
                    if text.strip():
                        blocks.append({"page": idx + 1, "text": text})
            except Exception as e:
                print(f"Error extracting PDF via pypdf: {e}")
        
        # Fallback if text empty or pypdf not available
        if not blocks:
            # Read binary as clean ASCII string fallback if needed
            with open(file_path, "rb") as f:
                content = f.read().decode("latin-1", errors="ignore")
                cleaned = re.sub(r'[^\x20-\x7E\n\r\t]', ' ', content)
                blocks.append({"page": 1, "text": cleaned})

        return blocks

    def _extract_text_from_txt(self, file_path: str) -> List[Dict[str, Any]]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        return [{"page": 1, "text": text}]

    def _chunk_text(self, text: str) -> List[str]:
        """Recursive splitter using paragraph double-newlines, single-newlines, or space boundaries."""
        text = re.sub(r'\r\n', '\n', text)
        paragraphs = text.split('\n\n')
        
        result_chunks = []
        current_chunk = ""

        for paragraph in paragraphs:
            clean_p = paragraph.strip()
            if not clean_p:
                continue

            if len(current_chunk) + len(clean_p) + 2 <= self.chunk_size:
                current_chunk = f"{current_chunk}\n\n{clean_p}".strip()
            else:
                if current_chunk:
                    result_chunks.append(current_chunk)
                
                # If paragraph itself is larger than chunk size, split by sentences or hard length
                if len(clean_p) > self.chunk_size:
                    sub_chunks = self._hard_split(clean_p)
                    result_chunks.extend(sub_chunks[:-1])
                    current_chunk = sub_chunks[-1] if sub_chunks else ""
                else:
                    current_chunk = clean_p

        if current_chunk:
            result_chunks.append(current_chunk)

        return result_chunks

    def _hard_split(self, text: str) -> List[str]:
        chunks = []
        start = 0
        while start < len(text):
            end = start + self.chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - self.chunk_overlap
        return chunks
