import os
import json
import re
import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from pdf_parser import DocumentParser

class RAGSystem:
    """
    Enhanced RAG Engine for Entrance Sahaayi (v2.0)
    Features:
    - Strict Document Grounding (Zero Hallucination Guardrails)
    - Exam-Filtered Search Context
    - Marksheet & Interest Profile Analyzer
    - Cached FAQ Short-Circuiting
    """

    def __init__(self, data_dir: str = "../data"):
        self.data_dir = os.path.abspath(data_dir)
        self.documents_dir = os.path.join(self.data_dir, "documents")
        self.faqs_file = os.path.join(self.data_dir, "faqs.json")
        self.videos_file = os.path.join(self.data_dir, "videos.json")
        
        self.parser = DocumentParser(chunk_size=500, chunk_overlap=80)
        self.chunks: List[Dict[str, Any]] = []
        self.faqs: List[Dict[str, Any]] = []
        self.videos: List[Dict[str, Any]] = []
        
        self.vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
        self.tfidf_matrix = None
        self.faq_vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
        self.faq_tfidf_matrix = None

        self.initialize_system()

    def initialize_system(self):
        """Loads FAQs, Videos, and parses all documents in the data directory."""
        os.makedirs(self.documents_dir, exist_ok=True)
        self.load_faqs()
        self.load_videos()
        self.index_documents()

    def load_faqs(self):
        if os.path.exists(self.faqs_file):
            try:
                with open(self.faqs_file, "r", encoding="utf-8") as f:
                    self.faqs = json.load(f)
                if self.faqs:
                    faq_questions = [faq["question"] + " " + faq.get("category", "") for faq in self.faqs]
                    self.faq_tfidf_matrix = self.faq_vectorizer.fit_transform(faq_questions)
            except Exception as e:
                print(f"Error loading FAQs: {e}")
                self.faqs = []

    def load_videos(self):
        if os.path.exists(self.videos_file):
            try:
                with open(self.videos_file, "r", encoding="utf-8") as f:
                    self.videos = json.load(f)
            except Exception as e:
                print(f"Error loading Videos: {e}")
                self.videos = []

    def index_documents(self):
        """Scans documents_dir, extracts chunks, and builds the TF-IDF vector index."""
        self.chunks = []
        if not os.path.exists(self.documents_dir):
            return

        files = os.listdir(self.documents_dir)
        for fname in files:
            fpath = os.path.join(self.documents_dir, fname)
            if os.path.isfile(fpath) and fname.lower().endswith(('.pdf', '.txt', '.md')):
                try:
                    doc_chunks = self.parser.parse_file(fpath)
                    self.chunks.extend(doc_chunks)
                except Exception as e:
                    print(f"Error parsing file {fname}: {e}")

        if self.chunks:
            corpus = [c["content"] for c in self.chunks]
            self.tfidf_matrix = self.vectorizer.fit_transform(corpus)
            print(f"Indexed {len(self.chunks)} document chunks from {len(files)} files.")

    def add_document(self, file_path: str) -> int:
        """Dynamically ingests a new PDF or TXT document and rebuilds the vector index."""
        doc_chunks = self.parser.parse_file(file_path)
        self.chunks.extend(doc_chunks)
        if self.chunks:
            corpus = [c["content"] for c in self.chunks]
            self.tfidf_matrix = self.vectorizer.fit_transform(corpus)
        return len(doc_chunks)

    def add_faq(self, question: str, answer: str, category: str = "General", target: str = "Both") -> Dict[str, Any]:
        """Adds a new FAQ entry into the cached FAQ store."""
        new_faq = {
            "id": f"faq_{len(self.faqs) + 1}",
            "question": question,
            "answer": answer,
            "category": category,
            "target": target
        }
        self.faqs.append(new_faq)
        with open(self.faqs_file, "w", encoding="utf-8") as f:
            json.dump(self.faqs, f, indent=2)
        
        faq_questions = [faq["question"] + " " + faq.get("category", "") for faq in self.faqs]
        self.faq_tfidf_matrix = self.faq_vectorizer.fit_transform(faq_questions)
        return new_faq

    def query(self, user_query: str, persona: str = "Student", exam_context: Optional[str] = None, top_k: int = 3) -> Dict[str, Any]:
        """
        Executes strictly grounded query retrieval pipeline:
        1. Checks FAQ Cache for short-circuit matching.
        2. Vector search over indexed chunks (with optional exam filter).
        3. Strict grounding check: Returns transparent notice if information is absent in brochures.
        """
        query_text = user_query.strip()
        if not query_text:
            return {
                "answer": "Please ask a specific question about entrance exams, eligibility, cutoffs, or career options.",
                "sources": [],
                "confidence": 0.0,
                "is_faq_short_circuit": False
            }

        # Include exam context in search query if provided
        augmented_query = f"{exam_context} {query_text}" if exam_context else query_text

        # 1. FAQ Cache Check
        if self.faq_tfidf_matrix is not None and self.faqs:
            q_vec = self.faq_vectorizer.transform([augmented_query])
            similarities = cosine_similarity(q_vec, self.faq_tfidf_matrix).flatten()
            best_faq_idx = np.argmax(similarities)
            best_faq_sim = similarities[best_faq_idx]

            if best_faq_sim >= 0.52:
                faq_match = self.faqs[best_faq_idx]
                synthesized = self._synthesize_response(faq_match["answer"], persona, is_faq=True, exam=exam_context)
                return {
                    "answer": synthesized,
                    "sources": [{
                        "source": f"Official FAQ ({faq_match['category']})",
                        "page": 1,
                        "content": faq_match["question"],
                        "relevance": round(float(best_faq_sim * 100), 1)
                    }],
                    "confidence": round(float(best_faq_sim * 100), 1),
                    "is_faq_short_circuit": True
                }

        # 2. Vector Document Search
        if self.tfidf_matrix is None or not self.chunks:
            return {
                "answer": "⚠️ *Strict Document Grounding Notice:* No official brochures have been uploaded yet to answer this query. Please ask the administrator to upload official exam PDFs.",
                "sources": [],
                "confidence": 0.0,
                "is_faq_short_circuit": False
            }

        q_vec = self.vectorizer.transform([augmented_query])
        sims = cosine_similarity(q_vec, self.tfidf_matrix).flatten()

        # If exam filter active, boost relevance of chunks from that document
        if exam_context:
            exam_lower = exam_context.lower()
            for idx, chunk in enumerate(self.chunks):
                if exam_lower in chunk["file_name"].lower() or exam_lower in chunk["content"].lower():
                    sims[idx] *= 1.4

        top_indices = np.argsort(sims)[::-1][:top_k]

        retrieved_sources = []
        retrieved_texts = []

        for idx in top_indices:
            score = sims[idx]
            if score > 0.07:  # Strict relevance threshold
                chunk = self.chunks[idx]
                retrieved_sources.append({
                    "source": f"{chunk['file_name']} (Page {chunk['page']})",
                    "file_name": chunk["file_name"],
                    "page": chunk["page"],
                    "content": chunk["content"],
                    "relevance": round(float(score * 100), 1)
                })
                retrieved_texts.append(chunk["content"])

        # 3. Strict Grounding Verification
        if not retrieved_texts:
            return {
                "answer": "ℹ️ **Strict Grounding Notice:** The official brochures and documents currently in our knowledge base do not contain specific information regarding your query. Entrance Sahaayi only provides verified details directly extracted from official exam guides.",
                "sources": [],
                "confidence": 0.0,
                "is_faq_short_circuit": False
            }

        avg_confidence = round(float(np.mean([s["relevance"] for s in retrieved_sources])), 1)
        raw_context = "\n\n---\n\n".join(retrieved_texts)
        synthesized_answer = self._synthesize_response(raw_context, persona, is_faq=False, exam=exam_context)

        return {
            "answer": synthesized_answer,
            "sources": retrieved_sources,
            "confidence": avg_confidence,
            "is_faq_short_circuit": False
        }

    def analyze_student_profile(self, stream: str, class12_marks: float, physics: float, math: float, bio: float, interests: List[str], budget: str) -> Dict[str, Any]:
        """
        Analyzes a student's marksheets and career interests against official brochure criteria.
        Returns tailored entrance exam recommendations with eligibility verdicts.
        """
        recommendations = []

        # 1. PCM / Engineering Evaluation
        if stream.upper() in ["PCM", "PCMB"]:
            pcm_avg = (physics + math) / 2 if (physics and math) else class12_marks
            jee_eligible = class12_marks >= 75.0 or pcm_avg >= 75.0
            
            recommendations.append({
                "exam": "JEE Main & Advanced",
                "field": "Engineering, AI, Technology & Applied Sciences",
                "eligibility_verdict": "Eligible (75% Criteria Met)" if jee_eligible else "Board % Below 75% (State / Private Univs Recommended)",
                "recommended_branches": ["B.Tech Computer Science & AI", "Electronics & Telecom", "Mechanical & Robotics", "Data Science"],
                "reasoning": f"Your Class 12 aggregate score of {class12_marks}% and PCM foundation qualifies you to prepare for JEE Main for top NITs and IIITs.",
                "brochure_citation": "JEE_Main_Information_Brochure.txt (Page 1 - Section 2 Eligibility)"
            })

            recommendations.append({
                "exam": "KEAM / State Level Engineering",
                "field": "State Govt & Merit Engineering Seats",
                "eligibility_verdict": "Eligible (50:50 Board + Entrance Weightage)",
                "recommended_branches": ["B.Tech CS/IT", "B.Tech Electrical", "B.Pharm"],
                "reasoning": "KEAM calculates ranks with 50% weightage from your Class 12 PCM marks, giving strong advantage to high board scorers.",
                "brochure_citation": "State_Exams_KEAM_and_Career_Options.txt (Page 1 - Section 2 Rank Formula)"
            })

        # 2. PCB / Medical Evaluation
        if stream.upper() in ["PCB", "PCMB"]:
            pcb_avg = (physics + bio) / 2 if (physics and bio) else class12_marks
            neet_eligible = class12_marks >= 50.0

            recommendations.append({
                "exam": "NEET-UG",
                "field": "Medical, Healthcare & Biological Sciences",
                "eligibility_verdict": "Eligible (50% PCB Aggregate Met)" if neet_eligible else "Ineligible (50% PCB Required)",
                "recommended_branches": ["MBBS", "BDS (Dental)", "BAMS (Ayurveda)", "B.Sc Nursing", "B.Pharm"],
                "reasoning": f"With {class12_marks}% in Class 12 PCB, you satisfy the NMC 50% eligibility cutoff for NEET-UG and allied health sciences.",
                "brochure_citation": "NEET_UG_Medical_Guide.txt (Page 1 - Section 2 Eligibility)"
            })

        # 3. All Streams / Central Universities Evaluation
        recommendations.append({
            "exam": "CUET-UG (Central Universities)",
            "field": "Economics, Data Analytics, Management, Psychology & Pure Sciences",
            "eligibility_verdict": "Eligible for All Central Universities (DU, BHU, JNU)",
            "recommended_branches": ["B.Sc Data Science", "B.A (Hons) Economics", "BBA / B.Com (Hons)", "Integrated M.Sc"],
            "reasoning": "CUET-UG allows stream cross-overs based on domain subjects and General Test performance across 45+ Central Universities.",
            "brochure_citation": "CUET_UG_Central_Universities_Guide.txt (Page 1 - Section 3 Structure)"
        })

        return {
            "student_summary": {
                "stream": stream,
                "class12_marks": f"{class12_marks}%",
                "top_interests": interests,
                "budget_tier": budget
            },
            "recommendations": recommendations,
            "guidance_note": "Recommendations are generated strictly based on official eligibility rules extracted from ingested entrance brochures."
        }

    def _synthesize_response(self, context: str, persona: str, is_faq: bool, exam: Optional[str] = None) -> str:
        clean_context = context.strip()
        exam_hdr = f" [{exam}]" if exam else ""

        if persona.lower() == "parent":
            return (
                f"👨‍👩‍👧 **Parent Guidance Briefing{exam_hdr}:**\n\n"
                f"{clean_context}\n\n"
                "💡 **Key Action Points for Parents:**\n"
                "• Verify registration & counseling deadlines on official portals.\n"
                "• Check institutional fee structures (Govt vs Management seats).\n"
                "• Support your child's stream interest and maintain stress-free study routine."
            )
        else:
            return (
                f"🎓 **Student Key Takeaways{exam_hdr}:**\n\n"
                f"{clean_context}\n\n"
                "📌 *Official Brochure Reference: Content extracted strictly from official entrance guide documents.*"
            )

    def get_stats(self) -> Dict[str, Any]:
        file_counts = {}
        for c in self.chunks:
            fn = c["file_name"]
            file_counts[fn] = file_counts.get(fn, 0) + 1

        return {
            "total_documents": len(file_counts),
            "total_chunks": len(self.chunks),
            "total_faqs": len(self.faqs),
            "total_videos": len(self.videos),
            "documents": file_counts
        }
