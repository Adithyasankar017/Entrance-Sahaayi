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

    # -------------------------------------------------------------
    # Multi-Lingual Regional Language Auto-Detection & Keyword Expansion
    # -------------------------------------------------------------
    ML_SCRIPT = re.compile(r'[ഀ-ൿ]')
    HI_SCRIPT = re.compile(r'[ऀ-ॿ]')
    TA_SCRIPT = re.compile(r'[஀-௿]')
    TE_SCRIPT = re.compile(r'[ఀ-౿]')

    ML_PHONETIC = re.compile(
        r'\b(enthanu|entha|eppozhanu|eppol|eppozha|engane|parayamo|parayu|parayum|'
        r'ariyaamo|ariyumo|chodikkan|padikkan|padikuka|njan|ente|enikku|makkal|makkalkku|'
        r'pariiksha|pareeksha|parixa|sahayikku|sahayam|aaranu|enthokkeyanu|kooduthal|'
        r'marupadi|keralathile|keralam|malayalam|malayalathil|silabas|yogyatha|markukal|'
        r'vidyarthikal|rakshithakkal)\b',
        re.IGNORECASE
    )
    HI_PHONETIC = re.compile(
        r'\b(kya|kaise|kab|kahan|kyon|batao|bataiye|namaste|padhai|chahiye|'
        r'hindi|hindimein|pariksha|patrata|bachhon)\b',
        re.IGNORECASE
    )
    TA_PHONETIC = re.compile(
        r'\b(eppadi|eppothu|enna|sollunga|vanakkam|theriyuma|padikka|'
        r'tamil|tamilil|thervu|thakuthi)\b',
        re.IGNORECASE
    )
    TE_PHONETIC = re.compile(
        r'\b(eppudu|ela|enti|cheppandi|namaskaram|teliyali|telugu|'
        r'telugulo|pariksha|arhatha)\b',
        re.IGNORECASE
    )

    def detect_language(self, text: str, default_lang: str = "en-IN") -> str:
        """
        Detects Indian regional languages (Malayalam, Hindi, Tamil, Telugu)
        from Unicode script characters or common phonetic romanized words.
        """
        if not text:
            return default_lang
            
        if self.ML_SCRIPT.search(text) or self.ML_PHONETIC.search(text):
            return "ml-IN"
        if self.HI_SCRIPT.search(text) or self.HI_PHONETIC.search(text):
            return "hi-IN"
        if self.TA_SCRIPT.search(text) or self.TA_PHONETIC.search(text):
            return "ta-IN"
        if self.TE_SCRIPT.search(text) or self.TE_PHONETIC.search(text):
            return "te-IN"
            
        return default_lang

    def expand_regional_query(self, user_query: str, language: str) -> str:
        """
        Bridges the gap between regional language queries and English official brochures.
        Maps Malayalam/Hindi/Tamil/Telugu terms to English official brochure concepts.
        """
        expansions = []
        q_lower = user_query.lower()

        # 1. Exam Names
        if "കീം" in user_query or "keam" in q_lower:
            expansions.append("KEAM engineering pharmacy Kerala CEE Commissioner")
        if "നീറ്റ്" in user_query or "neet" in q_lower:
            expansions.append("NEET-UG medical MBBS BDS NMC biology physics chemistry")
        if "ജെഇഇ" in user_query or "jee" in q_lower:
            expansions.append("JEE Main engineering NTA CBT NIT IIIT mathematics")
        if "ക്യൂറ്റ്" in user_query or "സിയുഇടി" in user_query or "cuet" in q_lower:
            expansions.append("CUET-UG Central Universities DU domain general test")

        # 2. Key Educational Concepts
        if any(w in user_query or w in q_lower for w in ["പരീക്ഷ", "pareeksha", "pariksha", "परीक्षा", "தேர்வு", "పరీక్ష"]):
            expansions.append("entrance exam examination schedule")
            
        if any(w in user_query or w in q_lower for w in ["എപ്പോഴാണ്", "eppozhanu", "eppol", "തീയതി", "തിയതി", "തീയ്യതി", "dates", "date", "कब", "eppothu", "eppudu"]):
            expansions.append("important dates schedule timeline registration date calendar deadlines")

        if any(w in user_query or w in q_lower for w in ["റാങ്ക്", "ഫോർമുല", "rank", "formula", "നമ്പർ", "रैंक", "ரேங்க்", "ర్యాంక్"]):
            expansions.append("rank formula 50:50 weightage normalization board marks percentile")

        if any(w in user_query or w in q_lower for w in ["യോഗ്യത", "yogyatha", "eligibility", "പാത്രത", "पात्रता", "தகுதி", "అర్హత"]):
            expansions.append("eligibility criteria qualifying marks minimum percentage Class 12 aggregate")

        if any(w in user_query or w in q_lower for w in ["സിലബസ്", "syllabus", "വിഷയങ്ങൾ", "सिलेबस", "பாடத்திட்டம்", "సిలబస్"]):
            expansions.append("syllabus subjects questions pattern duration marking scheme")

        if any(w in user_query or w in q_lower for w in ["ഫീസ്", "fees", "ചിലവ്", "പണം", "फीस", "கட்டணம்", "ఫీజు"]):
            expansions.append("college fees tuition fees financial scholarship loans concession reservation")

        if any(w in user_query or w in q_lower for w in ["അഡ്മിഷൻ", "പ്രവേശനം", "admission", "allotment", "സീറ്റ്", "प्रवेश", "சேர்க்கை", "ప్రవేశం"]):
            expansions.append("admission centralized allotment process CAP seats merit counseling")

        if any(w in user_query or w in q_lower for w in ["കട്ട് ഓഫ്", "cutoff", "കട്ട്-ഓഫ്", "कटऑफ"]):
            expansions.append("cutoff marks rank percentile qualifying score minimum")

        if any(w in user_query or w in q_lower for w in ["നെഗറ്റീവ്", "negative", "മൈനസ്", "नेगेटिव"]):
            expansions.append("negative marking -1 mark penalty deduction wrong answer")

        if any(w in user_query or w in q_lower for w in ["അപേക്ഷ", "രജിസ്ട്രേഷൻ", "registration", "apply", "आवेदन", "பதிவு", "దరఖాస్తు"]):
            expansions.append("application form registration apply online portal official website")

        return " ".join(expansions)

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

    def query(self, user_query: str, persona: str = "Student", exam_context: Optional[str] = None, language: str = "en-IN", top_k: int = 3, history: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Executes strictly grounded query retrieval pipeline:
        1. Checks FAQ Cache for short-circuit matching.
        2. Vector search over indexed chunks (with optional exam filter and conversation context).
        3. Strict grounding check: Returns transparent notice if information is absent in brochures.
        """
        query_text = user_query.strip()
        
        # Auto-detect language if query text is in regional script or regional phonetics
        detected_lang = self.detect_language(query_text, default_lang=language)
        effective_language = detected_lang if detected_lang != "en-IN" else language

        if not query_text:
            return {
                "answer": self._translate("Please ask a specific question about entrance exams, eligibility, cutoffs, or career options.", effective_language),
                "sources": [],
                "confidence": 0.0,
                "is_faq_short_circuit": False,
                "language": effective_language
            }

        # 0. Interactive Conversational Greeting / Small-Talk / Identity Handler
        conv_response = self._check_conversational_response(query_text, persona, exam_context, effective_language)
        if conv_response:
            conv_response["language"] = effective_language
            return conv_response

        # Context enrichment from conversation history (multi-turn memory)
        context_history_str = ""
        if history and len(history) > 0:
            # Grab recent 2-3 user messages for query context
            past_queries = [h.get("content", "") for h in history if h.get("sender") == "user"][-2:]
            if past_queries:
                context_history_str = " ".join(past_queries)

        # Regional keyword expansion to match English official brochures
        regional_expanded = self.expand_regional_query(query_text, effective_language)

        # Include exam context, history, and expanded English terms in vector query
        components = [exam_context, context_history_str, query_text, regional_expanded]
        augmented_query = " ".join([c for c in components if c])



        # 1. FAQ Cache Check
        if self.faq_tfidf_matrix is not None and self.faqs:
            q_vec = self.faq_vectorizer.transform([augmented_query])
            similarities = cosine_similarity(q_vec, self.faq_tfidf_matrix).flatten()
            best_faq_idx = np.argmax(similarities)
            best_faq_sim = similarities[best_faq_idx]

            if best_faq_sim >= 0.52:
                faq_match = self.faqs[best_faq_idx]
                synthesized = self._synthesize_response(faq_match["answer"], persona, is_faq=True, exam=exam_context, language=effective_language)
                return {
                    "answer": synthesized,
                    "sources": [{
                        "source": f"Official FAQ ({faq_match['category']})",
                        "page": 1,
                        "content": faq_match["question"],
                        "relevance": round(float(best_faq_sim * 100), 1)
                    }],
                    "confidence": round(float(best_faq_sim * 100), 1),
                    "is_faq_short_circuit": True,
                    "language": effective_language
                }

        # 2. Vector Document Search
        if self.tfidf_matrix is None or not self.chunks:
            return {
                "answer": self._translate("⚠️ *Strict Document Grounding Notice:* No official brochures have been uploaded yet to answer this query. Please ask the administrator to upload official exam PDFs.", language),
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
                "answer": self._translate("ℹ️ **Strict Grounding Notice:** The official brochures and documents currently in our knowledge base do not contain specific information regarding your query. Entrance Sahaayi only provides verified details directly extracted from official exam guides.", effective_language),
                "sources": [],
                "confidence": 0.0,
                "is_faq_short_circuit": False,
                "language": effective_language
            }

        avg_confidence = round(float(np.mean([s["relevance"] for s in retrieved_sources])), 1)
        raw_context = "\n\n---\n\n".join(retrieved_texts)
        synthesized_answer = self._synthesize_response(raw_context, persona, is_faq=False, exam=exam_context, language=effective_language)

        return {
            "answer": synthesized_answer,
            "sources": retrieved_sources,
            "confidence": avg_confidence,
            "is_faq_short_circuit": False,
            "language": effective_language
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

    def parse_and_analyze_marksheet(self, file_path: str, interests: List[str] = [], budget: str = "Govt / Merit") -> Dict[str, Any]:
        """
        Parses an uploaded student marksheet PDF/TXT/MD, extracts percentage and stream,
        and generates AI entrance recommendations.
        """
        chunks = self.parser.parse_file(file_path)
        full_text = " ".join([c["content"] for c in chunks])
        
        pct_matches = re.findall(r'(\d{2}(?:\.\d+)?)\s*%', full_text)
        if pct_matches:
            class12_marks = float(pct_matches[0])
        else:
            class12_marks = 80.0
            
        lower_text = full_text.lower()
        if "mathematics" in lower_text or "math" in lower_text or "pcm" in lower_text:
            if "biology" in lower_text or "pcmb" in lower_text:
                stream = "PCMB"
            else:
                stream = "PCM"
        elif "biology" in lower_text or "pcb" in lower_text:
            stream = "PCB"
        elif "accountancy" in lower_text or "commerce" in lower_text:
            stream = "Commerce"
        else:
            stream = "PCM"

        result = self.analyze_student_profile(
            stream=stream,
            class12_marks=class12_marks,
            physics=class12_marks,
            math=class12_marks,
            bio=class12_marks,
            interests=interests,
            budget=budget
        )
        result["extracted_snippet"] = full_text[:300] + "..." if len(full_text) > 300 else full_text
        result["detected_stream"] = stream
        result["detected_percentage"] = class12_marks
        return result

    def _simplify_jargon_for_parent(self, text: str) -> str:
        """
        Translates dense bureaucratic and technical exam jargon into plain,
        intuitive explanations designed for parents and first-generation families.
        """
        patterns = [
            (r'\bComputer Based Test\s*\(\s*CBT\s*\)|\bComputer Based Test\b|\bCBT\b', 'Computer-Based Test (exam held on a computer screen using a mouse at an authorized test center)'),
            (r'\bPen and Paper\s*\(\s*OMR\s*\)|\bPen and Paper OMR\b|\bPen and Paper\b|\bOMR\b', 'Paper exam (answering on paper sheets by filling circles with a black ballpoint pen)'),
            (r'\bnormalized NTA percentile score\b|\bpercentile score\b|\bpercentile rank\b|\bpercentile\b', 'percentile rank (percentage of students your child scored higher than out of 100)'),
            (r'\bstatistical normalization\b|\bmark normalization\b|\bnormalized score\b|\bnormalization\b', 'mark normalization (fair score adjustment across different school boards so every student is treated equally)'),
            (r'\b50:50 weightage\b|\b50:50 ratio\b|\b50:50\b', 'equal 50:50 balance (50% from 12th Board marks and 50% from the entrance exam — both count equally)'),
            (r'\b-1\s*mark(?:\s*negative\s*marking)?\b|\bnegative\s*marking\b', 'negative marking (-1 mark deducted for wrong answers — encourage your child not to make wild guesses)'),
            (r'\bqualifying examination\b|\bqualifying exam\b', 'Class 12 / Plus Two Board examination'),
            (r'\b75% aggregate\b', 'at least 75% total marks in Class 12 (65% for SC/ST)'),
            (r'\b50% aggregate in PCB\b', 'at least 50% average marks in Physics, Chemistry, and Biology (40% for reserved categories)'),
            (r'\bNITs\b|\bNIT\b', 'NITs (top Government National Institutes of Technology with low fees and high job placements)'),
            (r'\bIIITs\b|\bIIIT\b', 'IIITs (top Government Information Technology Institutes)'),
            (r'\bAIIMS\b', 'AIIMS (India’s premier Government Medical Colleges where MBBS education is practically free)'),
            (r'\bCentral Universities\b', 'Central Government Universities (highly reputed with very affordable tuition fees)'),
            (r'\bCommissioner for Entrance Examinations\s*\(\s*CEE\s*\)|\bCommissioner for Entrance Examinations\b|\bCEE\b', 'State Entrance Office (CEE Kerala)'),
            (r'\bCentralized Allotment Process\s*\(\s*CAP\s*\)|\bCentralized Allotment Process\b|\bCAP\b', 'Centralized Online Admission (selecting college options online from home)'),
            (r'\bEWS\b', 'EWS (Economically Weaker Section quota for fee concession)'),
            (r'\bSEBC\b|\bOBC-NCL\b', 'OBC / Backward Community quota for seat reservation and fee concessions'),
        ]
        
        simplified = text
        for p, r in patterns:
            simplified = re.sub(p, r, simplified, flags=re.IGNORECASE)
        return simplified

    def _synthesize_response(self, context: str, persona: str, is_faq: bool, exam: Optional[str] = None, language: str = "en-IN") -> str:
        clean_context = context.strip()
        exam_hdr = f" [{exam}]" if exam else ""
        is_parent = persona and persona.lower() == "parent"

        if is_parent:
            return self._build_parent_explanation(clean_context, exam_hdr, language)
        else:
            return self._build_student_explanation(clean_context, exam_hdr, language)

    def _build_parent_explanation(self, clean_context: str, exam_hdr: str, language: str) -> str:
        simplified_text = self._simplify_jargon_for_parent(clean_context)
        
        # Extract meaningful bullet points from context lines, stripping raw section numbers
        lines = [l.strip() for l in simplified_text.splitlines() if l.strip()]
        bullet_points = []
        for l in lines:
            if l.upper().startswith("SECTION") or l.startswith("---") or l.startswith("=="):
                continue
            bullet_points.append(f"• {l}")
            if len(bullet_points) >= 6:
                break
        
        summary_bullets = "\n".join(bullet_points) if bullet_points else f"• {simplified_text[:350]}..."

        if language == "ml-IN":
            return f"""👨‍👩‍👧 **രക്ഷിതാക്കൾക്കായുള്ള ലളിതമായ വിവരണം{exam_hdr}:**

പ്രിയ രക്ഷിതാവേ, ഔദ്യോഗിക പരീക്ഷാ ബ്രോഷറിലെ പ്രധാന വിവരങ്ങൾ ലളിതമായി താഴെ നൽകുന്നു:

📌 **ലളിതമായി പറഞ്ഞാൽ (നിങ്ങളുടെ മക്കൾക്കായി അറിയേണ്ട പ്രധാന കാര്യങ്ങൾ):**
{summary_bullets}

💰 **ഫീസും സാമ്പത്തിക വിവരങ്ങളും (കുടുംബത്തിനുള്ള ആശ്വാസം):**
• സർക്കാർ കോളേജുകളിലും മെറിറ്റ് സീറ്റുകളിലും ഫീസ് വളരെ കുറവാണ്. സ്വകാര്യ മാനേജ്‌മെന്റ് സീറ്റുകളേക്കാൾ എത്രയോ കുറഞ്ഞ ചിലവിൽ മികച്ച പഠനം നേടാം.
• മെറിറ്റ് സീറ്റുകൾ ലഭിക്കുന്ന വിദ്യാർത്ഥികൾക്ക് ബാങ്ക് വിദ്യാഭ്യാസ വായ്പകളും (Education Loans) വിവിധ സർക്കാർ സ്കോളർഷിപ്പുകളും ലഭ്യമാണ്.

📋 **രക്ഷിതാക്കൾ ചെയ്യേണ്ട കാര്യങ്ങൾ:**
1. **മാർക്ക് പരിശോധിക്കുക:** മക്കളുടെ പ്ലസ് ടു മാർക്ക് ലിസ്റ്റ് പരിശോധിച്ച് ആവശ്യമായ മിനിമം യോഗ്യത ഉണ്ടെന്ന് ഉറപ്പുവരുത്തുക.
2. **സർട്ടിഫിക്കറ്റുകൾ തയ്യാറാക്കുക:** ഫീസ് ഇളവുകൾക്കും സംവരണ ആനുകൂല്യങ്ങൾക്കുമായി വരുമാനം, ജാതി സർട്ടിഫിക്കറ്റുകൾ മുൻകൂട്ടി തയ്യാറാക്കുക.
3. **മാനസിക പിന്തുണ:** പരീക്ഷാ പേടിയില്ലാതെ ശാന്തമായി പഠിക്കാൻ മക്കൾക്ക് ആത്മവിശ്വാസവും പിന്തുണയും നൽകുക."""

        elif language == "hi-IN":
            return f"""👨‍👩‍👧 **अभिभावकों के लिए सरल मार्गदर्शन{exam_hdr}:**

प्रिय अभिभावक, आधिकारिक विवरणिका (Brochure) की जरूरी जानकारी आपके समझने के लिए आसान भाषा में नीचे दी गई है:

📌 **सरल शब्दों में (आपके बच्चे के लिए मुख्य जानकारी):**
{summary_bullets}

💰 **कॉलेज फीस और खर्च की जानकारी:**
• सरकारी संस्थानों और मेरिट सीटों पर प्राइवेट कॉलेजों की तुलना में फीस बेहद कम होती है।
• बैंक एजुकेशन लोन (शिक्षा ऋण) और सरकारी छात्रवृत्तियां आसानी से उपलब्ध होती हैं।

📋 **अभिभावकों के लिए ज़रूरी कदम:**
1. **12वीं के अंक जांचें:** 12वीं के अंकपत्र की जांच करें कि आवश्यक न्यूनतम प्रतिशत पूरा हो रहा है।
2. **प्रमाण पत्र तैयार रखें:** फीस छूट और आरक्षण लाभ के लिए आय व जाति प्रमाण पत्र समय पर तैयार रखें।
3. **सकारात्मक माहौल दें:** बच्चे पर ज्यादा तनाव न डालें और उन्हें आत्मविश्वास व प्रोत्साहन दें."""

        elif language == "ta-IN":
            return f"""👨‍👩‍👧 **பெற்றோருக்கான எளிய வழிகாட்டுதல்{exam_hdr}:**

அன்பான பெற்றோரே, உத்தியோகபூர்வ தகவல் கையேட்டின் முக்கிய விவரங்கள் எளிமையான முறையில் கீழே தரப்பட்டுள்ளன:

📌 **எளிய விளக்கக் குறிப்புகள் (உங்கள் பிள்ளைக்கு தேவையானவை):**
{summary_bullets}

💰 **கல்லூரி கட்டணம் மற்றும் நிதி சலுகைகள்:**
• அரசு கல்லூரிகளில் தனியார் கல்லூரிகளை விட கட்டணம் மிகக் குறைவு.
• வங்கி கல்விக்கடன் மற்றும் அரசு உதவித்தொகைகள் எளிதில் கிடைக்கின்றன.

📋 **பெற்றோர்களுக்கான முக்கிய வழிமுறைகள்:**
1. பிளஸ் 2 மதிப்பெண் சான்றிதழில் குறைந்தபட்ச தகுதி இருப்பதை உறுதிப்படுத்தவும்.
2. கட்டண சலுகைக்கு சாதி மற்றும் வருமான சான்றிதழ்களை முன்கூட்டியே பெறவும்.
3. பிள்ளைகளுக்கு மன அழுத்தம் இல்லாமல் படிக்க ஊக்கமளிக்கவும்."""

        elif language == "te-IN":
            return f"""👨‍👩‍👧 **తల్లిదండ్రులకు సరళమైన మార్గదర్శకం{exam_hdr}:**

ప్రియమైన తల్లిదండ్రులకు, అధికారిక సమాచార పత్రంలోని ముఖ్యమైన వివరాలు సులభంగా అర్థమయ్యేలా క్రింద ఇవ్వబడ్డాయి:

📌 **సులభమైన వివరణ (మీ పిల్లల కోసం ముఖ్యమైన విషయాలు):**
{summary_bullets}

💰 **కళాశాల ఫీజులు మరియు ఆర్థిక సమాచారం:**
• ప్రభుత్వ కళాశాలల్లో ప్రైవేట్ కళాశాలల కంటే ఫీజులు చాలా తక్కువగా ఉంటాయి.
• బ్యాంక్ ఎడ్యుకేషన్ లోన్లు మరియు ప్రభుత్వ స్కాలర్‌షిప్‌లు అందుబాటులో ఉంటాయి.

📋 **తల్లిదండ్రులు తీసుకోవలసిన జాగ్రత్తలు:**
1. 12వ తరగతి మార్కులు అవసరమైన అర్హతను చేరుకున్నాయో లేదో తనిఖీ చేయండి.
2. ఫీజు రాయితీల కోసం ఆదాయం మరియు కుల ధృవీకరణ పత్రాలను సిద్ధంగా ఉంచుకోండి.
3. పిల్లలపై ఒత్తిడి లేకుండా ఇంట్లో ప్రశాంతమైన వాతావరణం కల్పించండి."""

        else: # en-IN (default English)
            return f"""👨‍👩‍👧 **Parent Guidance Briefing{exam_hdr}:**

*Dear Parent, here is the official entrance information explained in simple, clear everyday language for your family:*

📌 **What this means in simple words for your child:**
{summary_bullets}

💰 **College Fees & Financial Options (Parent's Financial View):**
• **Subsidized Education:** Government institutes and state merit quota seats have very low, regulated fees compared to expensive private colleges.
• **Financial Aid:** Bank education loans and government scholarships/fee-waivers are widely accessible for students securing merit ranks.

📋 **Helpful Steps for Parents:**
1. **Check 12th Marks:** Verify your child's Class 12 / Plus Two marksheet to confirm they satisfy the minimum qualifying percentage.
2. **Keep Documents Ready:** Obtain community, category, or income certificates early to secure eligible fee concessions and quota seats.
3. **Encourage Calmly:** Provide a supportive, pressure-free study environment at home to keep your child confident and focused."""

    def _build_student_explanation(self, clean_context: str, exam_hdr: str, language: str) -> str:
        # Candidate format for Students: technical, precise, and exam-focused
        if language == "ml-IN":
            return f"""🎓 **വിദ്യാർത്ഥികൾക്കായുള്ള പരീക്ഷാ വിവരണം{exam_hdr}:**

{clean_context}

🎯 **പരീക്ഷാ തയ്യാറെടുപ്പ് തന്ത്രങ്ങൾ:**
• എൻ.സി.ഇ.ആർ.ടി (NCERT) പാഠപുസ്തകങ്ങളിലെ അടിസ്ഥാന പാഠങ്ങൾ വ്യക്തമായി പഠിക്കുക.
• സമയക്രമം പാലിച്ച് മുൻവർഷ ചോദ്യപേപ്പറുകളും മോക്ക് ടെസ്റ്റുകളും പരിശീലിക്കുക.
• തെറ്റായ ഉത്തരങ്ങൾക്കുള്ള നെഗറ്റീവ് മാർക്കിംഗ് (-1 മാർക്ക്) ഒഴിവാക്കാൻ ശ്രദ്ധിക്കുക."""

        elif language == "hi-IN":
            return f"""🎓 **विद्यार्थियों के लिए परीक्षा मार्गदर्शन{exam_hdr}:**

{clean_context}

🎯 **परीक्षा तैयारी की मुख्य रणनीतियाँ:**
• एनसीईआरटी (NCERT) की पाठ्यपुस्तकों के मुख्य सिद्धांतों को गहराई से समझें।
• समय प्रबंधन के लिए पिछले वर्षों के प्रश्नपत्रों और मॉक टेस्ट का अभ्यास करें।
• नेगेटिव मार्किंग (-1 अंक) से बचने के लिए अंदाज़े से उत्तर न दें।"""

        elif language == "ta-IN":
            return f"""🎓 **மாணவர்களுக்கான தேர்வு வழிகாட்டுதல்{exam_hdr}:**

{clean_context}

🎯 **தேர்வு தயாரிப்பு உத்திகள்:**
• என்சிஇஆர்டி (NCERT) பாடப்புத்தகங்களை முழுமையாக படிக்கவும்.
• மாதிரித் தேர்வுகளை காலநேரத்திற்குள் எழுதிப் பழகவும்.
• தவறான விடைகளுக்கான நெகட்டிவ் மதிப்பெண்ணைத் தவிர்க்கவும்."""

        elif language == "te-IN":
            return f"""🎓 **విద్యార్థుల కోసం పరీక్ష మార్గదర్శకం{exam_hdr}:**

{clean_context}

🎯 **పరీక్ష తయారీ వ్యూహాలు:**
• ఎన్‌సిఈఆర్‌టి (NCERT) పాఠ్యపుస్తకాలలోని ముఖ్య భావనలను క్షుణ్ణంగా చదవండి.
• సమయపాలన కోసం మునుపటి ప్రశ్నపత్రాలు మరియు మాక్ పరీక్షలను ప్రాక్టీస్ చేయండి.
• నెగటివ్ మార్కింగ్ (-1 మార్కు) నివారించడానికి జాగ్రత్తగా సమాధానాలు ఇవ్వండి."""

        else:
            return f"""🎓 **Student Exam Briefing{exam_hdr}:**

{clean_context}

🎯 **Candidate Action & Strategy:**
• Master core NCERT textbook concepts across all relevant subjects.
• Practice timed mock tests to adapt to the exam pattern and avoid negative marking penalty."""

    def _check_conversational_response(self, query: str, persona: str = "Student", exam_context: Optional[str] = None, language: str = "en-IN") -> Optional[Dict[str, Any]]:
        clean_q = query.strip().lower()
        exam_keywords = ["neet", "jee", "keam", "cuet", "clat", "gate", "cat", "bitsat", "nift", "nda"]
        has_exam_keyword = any(k in clean_q for k in exam_keywords)
        is_parent = persona and persona.lower() == "parent"

        # 1. GREETINGS ("hi", "hello", "hey", "hey sree", "good morning", etc.)
        greeting_words = [
            "hi", "hello", "hey", "namaste", "vanakkam", "namaskaram", "hey sree", "hi sree", "sree", "good morning", "good evening", "greetings",
            "നമസ്കാരം", "നമസ്തേ", "ഹലോ", "ഹായ്", "ഹലോ ശ്രീ", "ഹായ് ശ്രീ", "നമസ്കാരം ശ്രീ", "ഹലോ sree", "ഹായ് sree",
            "नमस्ते", "प्रणाम", "हेलो", "வணக்கம்", "ஹலோ", "నమస్కారం", "హలో"
        ]
        is_greeting = any(clean_q == g or clean_q.startswith(g + " ") or clean_q.startswith(g + ",") or clean_q.startswith(g + "!") for g in greeting_words) and len(clean_q.split()) <= 4

        if is_greeting:
            exam_hdr = f" for {exam_context}" if exam_context else ""
            if is_parent:
                if language == "hi-IN":
                    ans = f"नमस्ते, आदरणीय अभिभावक! 👋 मैं **Sree** हूँ। आप मुझसे{exam_hdr} अपने बच्चे की प्रवेश परीक्षा, कॉलेज फीस या पात्रता से जुड़ा कोई भी सवाल आसान भाषा में पूछ सकते हैं।"
                elif language == "ml-IN":
                    ans = f"നമസ്കാരം! 👋 ഞാൻ **Sree**. പ്രവേശന പരീക്ഷകൾ, കോളേജ് ഫീസ്, യോഗ്യത എന്നിവ രക്ഷിതാക്കൾക്ക് ലളിതമായി മനസ്സിലാക്കാൻ ഞാൻ സഹായിക്കാം. മക്കളുടെ തുടർപഠനത്തെക്കുറിച്ച് എന്ത് സംശയമാണ് ഉള്ളത്?"
                elif language == "ta-IN":
                    ans = f"வணக்கம் பெற்றோரே! 👋 நான் **Sree**.{exam_hdr} உங்கள் பிள்ளையின் நுழைவுத் தேர்வு, கல்வி கட்டணம் குறித்து எளிமையாக கேட்டுத் தெரிந்து கொள்ளலாம்."
                elif language == "te-IN":
                    ans = f"నమస్కారం తల్లిదండ్రులారా! 👋 నేను **Sree**.{exam_hdr} మీ పిల్లల ప్రవేశ పరీక్ష, ఫీజుల వివరాలను సులభంగా అడగండి."
                else: # en-IN
                    ans = f"Hello, Dear Parent! 👋 I am **Sree**. I explain entrance exams, college fees, eligibility, and admission processes in simple, easy-to-understand terms for families. How can I guide you today{exam_hdr}?"
            else:
                if language == "hi-IN":
                    ans = f"नमस्ते! 👋 मैं **Sree** हूँ। आप मुझसे{exam_hdr} प्रवेश परीक्षा से संबंधित कोई भी सवाल पूछ सकते हैं।"
                elif language == "ml-IN":
                    ans = f"ഹലോ! 👋 ഞാൻ **Sree**.{exam_hdr} പ്രവേശന പരീക്ഷയുമായി ബന്ധപ്പെട്ട നിങ്ങളുടെ ചോദ്യം ചോദിക്കാം."
                elif language == "ta-IN":
                    ans = f"வணக்கம்! 👋 நான் **Sree**.{exam_hdr} நுழைவுத் தேர்வு கேள்வியைக் கேளுங்கள்."
                elif language == "te-IN":
                    ans = f"నమస్కారం! 👋 నేను **Sree**.{exam_hdr} మీ ప్రవేశ పరీక్ష ప్రశ్నను అడగండి."
                else: # en-IN
                    ans = f"Hello! 👋 I am **Sree**, your AI entrance exam assistant. How can I help you with your{exam_hdr} entrance exam question today?"

            return {
                "answer": ans,
                "sources": [],
                "confidence": 100.0,
                "is_faq_short_circuit": False
            }

        # 2. BOT IDENTITY & CAPABILITIES ("who are you", "who is sree", "what is your name", "help")
        identity_phrases = [
            "who are you", "what are you", "who is sree", "who is shree", "what is sree", "what is shree",
            "what is your name", "who are u", "tell me about yourself", "help", "what can you do", "who made you",
            "ആരാണ് ശ്രീ", "ശ്രീ ആരാണ്", "നിങ്ങൾ ആരാണ്", "എനിക്ക് സഹായം വേണം", "സഹായം",
            "आप कौन हैं", "श्री कौन है", "मदद", "நீங்கள் யார்", "உதவி", "మీరు ఎవరు", "సహాయం"
        ]

        is_identity = any(phrase in clean_q for phrase in identity_phrases)
        if is_identity and not has_exam_keyword:
            if is_parent:
                if language == "hi-IN":
                    ans = "मैं **Sree** हूँ — अभिभावकों के लिए विशेष AI करियर मार्गदर्शक। मैं जटिल प्रवेश परीक्षाओं, कटऑफ और कॉलेज फीस को सरल भाषा में समझाती हूँ ताकि आप अपने बच्चे का सही मार्गदर्शन कर सकें।"
                elif language == "ml-IN":
                    ans = "ഞാൻ **Sree** — രക്ഷിതാക്കൾക്കായുള്ള AI പ്രവേശന പരീക്ഷാ സഹായി. പരീക്ഷാ യോഗ്യതകൾ, കോളേജ് ഫീസുകൾ, അഡ്മിഷൻ രീതികൾ എന്നിവ ലളിതമായ ഭാഷയിൽ രക്ഷിതാക്കൾക്ക് മനസ്സിലാക്കി നൽകുകയാണ് എന്റെ ലക്ഷ്യം."
                elif language == "ta-IN":
                    ans = "நான் **Sree** — பெற்றோருக்கான சிறப்பு AI நுழைவுத் தேர்வு உதவியாளர். கடினமான விதிமுறைகளை எளிய தமிழில் விளக்குகிறேன்."
                elif language == "te-IN":
                    ans = "నేను **Sree** — తల్లిదండ్రుల కోసం ప్రత్యేక AI ప్రవేశ పరీక్ష సహాయకుడిని. సంక్లిష్టమైన ప్రవేశ పరీక్ష నిబంధనలను సులభంగా వివరిస్తాను."
                else:
                    ans = "I am **Sree** — an AI guidance assistant dedicated to helping parents navigate entrance exams, eligibility criteria, and college costs in simple, straightforward language."
            else:
                if language == "hi-IN":
                    ans = "मैं **Sree** हूँ — आपका AI प्रवेश परीक्षा सहायक। कृपया प्रवेश परीक्षा, पात्रता या करियर से जुड़ा अपना सवाल पूछें।"
                elif language == "ml-IN":
                    ans = "ഞാൻ **Sree** — നിങ്ങളുടെ AI പ്രവേശന പരീക്ഷാ സഹായി. പരീക്ഷ, യോഗ്യത അല്ലെങ്കിൽ കരിയർ സംബന്ധിച്ച ചോദ്യങ്ങൾ ചോദിക്കാം."
                elif language == "ta-IN":
                    ans = "நான் **Sree** — உங்கள் AI நுழைவுத் தேர்வு உதவியாளர். சேர்க்கை தேர்வுகள் அல்லது தகுதிகள் பற்றிய கேள்வியைக் கேளுங்கள்."
                elif language == "te-IN":
                    ans = "నేను **Sree** — మీ AI ప్రవేశ పరీక్ష సహాయకుడిని. ప్రవేశ పరీక్షలు లేదా అర్హతల గురించి ప్రశ్న అడగండి."
                else:
                    ans = "I am **Sree**, your AI entrance assistant. Please ask any question about entrance exams, syllabus, eligibility, or career options."

            return {
                "answer": ans,
                "sources": [],
                "confidence": 100.0,
                "is_faq_short_circuit": False
            }

        # 3. THANKS / GRATITUDE ("thank you", "thanks", "awesome")
        thanks_words = {
            "thanks", "thankyou", "thx", "awesome", "great", "cool", "nice", "perfect",
            "നന്ദി", "വളരെ നന്ദി", "താങ്ക്സ്", "താങ്ക് യു", "धन्यवाद", "நன்றி", "ధన్యవాదాలు"
        }
        is_thanks = (clean_q in thanks_words or clean_q.startswith("thank you") or clean_q.startswith("thanks")) and not has_exam_keyword

        if is_thanks:
            if is_parent:
                ans = "You're most welcome, Dear Parent! 😊 It is our pleasure to support you and your family. Feel free to ask whenever you have questions about your child's education and career."
                if language == "hi-IN":
                    ans = "आपका बहुत-बहुत स्वागत है! 😊 आपके बच्चे के उज्ज्वल भविष्य के लिए शुभकामनाएं। जब भी कोई शंका हो, निसंकोच पूछें।"
                elif language == "ml-IN":
                    ans = "സ്വാഗതം! 😊 മക്കളുടെ ശോഭനമായ ഭാവിക്കായി എല്ലാവിധ ആശംസകളും. എന്ത് സംശയമുണ്ടെങ്കിലും ചോദിക്കാൻ മടിക്കരുത്."
            else:
                ans = "You're very welcome! 😊 Feel free to ask if you have any more questions about entrance exams, cutoffs, or eligibility criteria. Good luck with your preparation!"
                if language == "hi-IN":
                    ans = "आपका स्वागत है! 😊 यदि आपके पास प्रवेश परीक्षा या पात्रता के संबंध में कोई अन्य प्रश्न हैं, तो निसंकोच पूछें। आपकी तैयारी के लिए शुभकामनाएं!"
                elif language == "ml-IN":
                    ans = "നിങ്ങള്‍ക്ക് സ്വാഗതം! 😊 പ്രവേശന പരീക്ഷകളെക്കുറിച്ച് കൂടുതൽ ചോദ്യങ്ങളുണ്ടെങ്കിൽ ചോദിക്കാം. ആശംസകൾ!"

            return {
                "answer": ans,
                "sources": [],
                "confidence": 100.0,
                "is_faq_short_circuit": False
            }

        # 4. FAREWELL ("bye", "goodbye", "see you")
        farewell_words = {
            "bye", "goodbye", "exit", "quit", "cya",
            "വിട", "പോയി വരാം", "ബൈ", "अलविदा", "பிரியாவிடை", "వీడ్కోలు"
        }
        is_farewell = (clean_q in farewell_words or clean_q.startswith("bye") or clean_q.startswith("goodbye")) and not has_exam_keyword

        if is_farewell:
            if is_parent:
                ans = "Goodbye, Dear Parent! 👋 Wishing your child all the success and peace of mind in their upcoming entrance exams. Take care!"
                if language == "hi-IN":
                    ans = "अलविदा! 👋 आपके बच्चे के सफल और उज्ज्वल भविष्य की कामना करते हैं!"
                elif language == "ml-IN":
                    ans = "വിട! 👋 മക്കളുടെ പരീക്ഷാ വിജയത്തിനും നല്ലൊരു ഭാവിക്കും ആശംസകൾ!"
            else:
                ans = "Goodbye! 👋 Wish you all the best for your entrance exam preparation and future career! Feel free to return anytime."
                if language == "hi-IN":
                    ans = "अलविदा! 👋 आपकी प्रवेश परीक्षा की तैयारी और भविष्य के करियर के लिए शुभकामनाएं!"
                elif language == "ml-IN":
                    ans = "വിട! 👋 പരീക്ഷാ തയ്യാറെടുപ്പുകൾക്ക് എല്ലാവിധ ആശംസകളും!"

            return {
                "answer": ans,
                "sources": [],
                "confidence": 100.0,
                "is_faq_short_circuit": False
            }

        return None
    def _translate(self, text: str, language: str) -> str:
        translations = {
            "hi-IN": {
                "Please ask a specific question about entrance exams, eligibility, cutoffs, or career options.": "कृपया प्रवेश परीक्षाओं, पात्रता, कटऑफ या करियर विकल्पों के बारे में स्पष्ट प्रश्न पूछें।",
                "⚠️ *Strict Document Grounding Notice:* No official brochures have been uploaded yet to answer this query. Please ask the administrator to upload official exam PDFs.": "⚠️ *सख्त दस्तावेज़ सूचना:* इस प्रश्न का उत्तर देने के लिए कोई आधिकारिक ब्रोशर अपलोड नहीं है। कृपया व्यवस्थापक से आधिकारिक परीक्षा PDF अपलोड करने को कहें।",
                "ℹ️ **Strict Grounding Notice:** The official brochures and documents currently in our knowledge base do not contain specific information regarding your query. Entrance Sahaayi only provides verified details directly extracted from official exam guides.": "ℹ️ **सख्त दस्तावेज़ सूचना:** वर्तमान आधिकारिक ब्रोशर में आपके प्रश्न की विशेष जानकारी नहीं है। Entrance Sahaayi केवल आधिकारिक परीक्षा मार्गदर्शिकाओं से निकली सत्यापित जानकारी देता है।"
            },
            "ml-IN": {
                "Please ask a specific question about entrance exams, eligibility, cutoffs, or career options.": "പ്രവേശന പരീക്ഷകൾ, യോഗ്യത, കട്ട് ഓഫ് അല്ലെങ്കിൽ കരിയർ സംബന്ധിച്ച നിങ്ങളുടെ വ്യക്തമായ ചോദ്യം ചോദിക്കുക.",
                "⚠️ *Strict Document Grounding Notice:* No official brochures have been uploaded yet to answer this query. Please ask the administrator to upload official exam PDFs.": "⚠️ *ഔദ്യോഗിക രേഖാ അറിയിപ്പ്:* ഈ ചോദ്യത്തിന് മറുപടി നൽകാൻ ആവശ്യമായ ബ്രോഷറുകൾ ഇതുവരെ അപ്‌ലോഡ് ചെയ്തിട്ടില്ല. ഔദ്യോഗിക പരീക്ഷാ പി.ഡി.എഫ് അപ്‌ലോഡ് ചെയ്യാൻ അഡ്മിനോട് ആവശ്യപ്പെടുക.",
                "ℹ️ **Strict Grounding Notice:** The official brochures and documents currently in our knowledge base do not contain specific information regarding your query. Entrance Sahaayi only provides verified details directly extracted from official exam guides.": "ℹ️ **വിവര ലഭ്യതാ അറിയിപ്പ്:** ഈ ചോദ്യത്തിനുള്ള കൃത്യമായ വിവരങ്ങൾ നിലവിലെ ഔദ്യോഗിക ബ്രോഷറുകളിൽ ലഭ്യമല്ല. ഔദ്യോഗിക ഗൈഡുകളിൽ നിന്ന് സ്ഥിരീകരിച്ച വിവരങ്ങൾ മാത്രമേ Entrance Sahaayi ലഭ്യമാക്കൂ."
            },
            "ta-IN": {
                "Please ask a specific question about entrance exams, eligibility, cutoffs, or career options.": "நுழைவுத் தேர்வுகள், தகுதி, கட்-ஆஃப் அல்லது தொழில் வாய்ப்புகள் பற்றிய உங்கள் குறிப்பிட்ட கேள்வியைக் கேட்கவும்.",
                "⚠️ *Strict Document Grounding Notice:* No official brochures have been uploaded yet to answer this query. Please ask the administrator to upload official exam PDFs.": "⚠️ *அதிகாரப்பூர்வ ஆவண அறிவிப்பு:* இந்த கேள்விக்கு பதிலளிக்க அதிகாரப்பூர்வ கையேடுகள் இன்னும் பதிவேற்றப்படவில்லை.",
                "ℹ️ **Strict Grounding Notice:** The official brochures and documents currently in our knowledge base do not contain specific information regarding your query. Entrance Sahaayi only provides verified details directly extracted from official exam guides.": "ℹ️ **அதிகாரப்பூர்வ அறிவிப்பு:** உங்கள் கேள்விக்கான குறிப்பிட்ட விவரங்கள் அதிகாரப்பூர்வ கையேடுகளில் காணப்படவில்லை."
            },
            "te-IN": {
                "Please ask a specific question about entrance exams, eligibility, cutoffs, or career options.": "ప్రవేశ పరీక్షలు, అర్హత, కటాఫ్ లేదా కెరీర్ ఎంపికల గురించి మీ స్పష్టమైన ప్రశ్నను అడగండి.",
                "⚠️ *Strict Document Grounding Notice:* No official brochures have been uploaded yet to answer this query. Please ask the administrator to upload official exam PDFs.": "⚠️ *అధికారిక పత్రాల నోటీసు:* ఈ ప్రశ్నకు సమాధానం ఇవ్వడానికి అధికారిక బ్రోచర్‌లు ఇంకా అప్‌లోడ్ చేయబడలేదు.",
                "ℹ️ **Strict Grounding Notice:** The official brochures and documents currently in our knowledge base do not contain specific information regarding your query. Entrance Sahaayi only provides verified details directly extracted from official exam guides.": "ℹ️ **అధికారిక నోటీసు:** మీ ప్రశ్నకు సంబంధించిన ఖచ్చితమైన సమాచారం ప్రస్తుత అధికారిక బ్రోచర్‌లలో అందుబాటులో లేదు."
            }
        }
        return translations.get(language, {}).get(text, text)

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
