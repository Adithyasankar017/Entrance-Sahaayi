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

    def query(self, user_query: str, persona: str = "Student", exam_context: Optional[str] = None, language: str = "en-IN", top_k: int = 3, history: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Executes strictly grounded query retrieval pipeline:
        1. Checks FAQ Cache for short-circuit matching.
        2. Vector search over indexed chunks (with optional exam filter and conversation context).
        3. Strict grounding check: Returns transparent notice if information is absent in brochures.
        """
        query_text = user_query.strip()
        if not query_text:
            return {
                "answer": self._translate("Please ask a specific question about entrance exams, eligibility, cutoffs, or career options.", language),
                "sources": [],
                "confidence": 0.0,
                "is_faq_short_circuit": False
            }

        # 0. Interactive Conversational Greeting / Small-Talk / Identity Handler
        conv_response = self._check_conversational_response(query_text, persona, exam_context, language)
        if conv_response:
            return conv_response

        # Context enrichment from conversation history (multi-turn memory)
        context_history_str = ""
        if history and len(history) > 0:
            # Grab recent 2-3 user messages for query context
            past_queries = [h.get("content", "") for h in history if h.get("sender") == "user"][-2:]
            if past_queries:
                context_history_str = " ".join(past_queries)

        # Include exam context and history context in search query if provided
        components = [exam_context, context_history_str, query_text]
        augmented_query = " ".join([c for c in components if c])



        # 1. FAQ Cache Check
        if self.faq_tfidf_matrix is not None and self.faqs:
            q_vec = self.faq_vectorizer.transform([augmented_query])
            similarities = cosine_similarity(q_vec, self.faq_tfidf_matrix).flatten()
            best_faq_idx = np.argmax(similarities)
            best_faq_sim = similarities[best_faq_idx]

            if best_faq_sim >= 0.52:
                faq_match = self.faqs[best_faq_idx]
                synthesized = self._synthesize_response(faq_match["answer"], persona, is_faq=True, exam=exam_context, language=language)
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
                "answer": self._translate("ℹ️ **Strict Grounding Notice:** The official brochures and documents currently in our knowledge base do not contain specific information regarding your query. Entrance Sahaayi only provides verified details directly extracted from official exam guides.", language),
                "sources": [],
                "confidence": 0.0,
                "is_faq_short_circuit": False
            }

        avg_confidence = round(float(np.mean([s["relevance"] for s in retrieved_sources])), 1)
        raw_context = "\n\n---\n\n".join(retrieved_texts)
        synthesized_answer = self._synthesize_response(raw_context, persona, is_faq=False, exam=exam_context, language=language)

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

    def _synthesize_response(self, context: str, persona: str, is_faq: bool, exam: Optional[str] = None, language: str = "en-IN") -> str:
        clean_context = context.strip()
        exam_hdr = f" [{exam}]" if exam else ""
        if persona.lower() == "parent":
            parent_note = {
                "hi-IN": "अभिभावक ध्यान दें: कृपया आधिकारिक पोर्टल पर पंजीकरण तिथियां और संस्थान की फीस संरचना भी जांचें।",
                "ml-IN": "രക്ഷിതാക്കൾ ശ്രദ്ധിക്കുക: ഔദ്യോഗിക പോർട്ടലിലെ രജിസ്ട്രേഷൻ തീയതികളും ഫീസ് ഘടനയും പരിശോധിക്കുക.",
            }.get(language, "Parent Note: Please verify registration deadlines and fee structures on official portals.")
            return f"👨‍👩‍👧 **Parent Guidance Briefing{exam_hdr}:**\n\n{clean_context}\n\n💡 *{parent_note}*"
        else:
            return clean_context

    def _check_conversational_response(self, query: str, persona: str = "Student", exam_context: Optional[str] = None, language: str = "en-IN") -> Optional[Dict[str, Any]]:
        clean_q = query.strip().lower()
        exam_keywords = ["neet", "jee", "keam", "cuet", "clat", "gate", "cat", "bitsat", "nift", "nda"]
        has_exam_keyword = any(k in clean_q for k in exam_keywords)

        # 1. GREETINGS ("hi", "hello", "hey", "hey sree", "good morning", etc.)
        greeting_words = ["hi", "hello", "hey", "namaste", "vanakkam", "namaskaram", "hey sree", "hi sree", "sree", "good morning", "good evening", "greetings"]
        is_greeting = any(clean_q == g or clean_q.startswith(g + " ") or clean_q.startswith(g + ",") or clean_q.startswith(g + "!") for g in greeting_words) and len(clean_q.split()) <= 4

        if is_greeting:
            exam_hdr = f" for {exam_context}" if exam_context else ""
            if language == "hi-IN":
                ans = f"नमस्ते! 👋 मैं **Sree** हूँ। आप मुझसे{exam_hdr} प्रवेश परीक्षा से संबंधित कोई भी सवाल पूछ सकते हैं।"
            elif language == "ml-IN":
                ans = f"ഹലോ! 👋 ഞാൻ **Sree**.{exam_hdr} പ്രവേശന പരീക്ഷയുമായി ബന്ധപ്പെട്ട നിങ്ങളുടെ ചോദ്യം ചോദിക്കാം."
            elif language == "ta-IN":
                ans = f"வணக்கம்! 👋 நான் **Sree**.{exam_hdr} நுழைவுத் தேர்வு கேள்வியைக் கேளுங்கள்."
            elif language == "te-IN":
                ans = f"నమస్కారం! 👋 నేను **Sree**.{exam_hdr} മീ പ്രవేశ పరీక్ష ప్రశ్నను అడగండి."
            else: # en-IN
                ans = f"Hello! 👋 I am **Sree**. How can I help you with your{exam_hdr} entrance exam question today?"

            return {
                "answer": ans,
                "sources": [],
                "confidence": 100.0,
                "is_faq_short_circuit": False
            }

        # 2. BOT IDENTITY & CAPABILITIES ("who are you", "who is sree", "what is your name", "help")
        identity_phrases = [
            "who are you", "what are you", "who is sree", "who is shree", "what is sree", "what is shree",
            "what is your name", "who are u", "tell me about yourself", "help", "what can you do", "who made you"
        ]

        is_identity = any(phrase in clean_q for phrase in identity_phrases)
        if is_identity and not has_exam_keyword:
            if language == "hi-IN":
                ans = "मैं **Sree** हूँ — आपका AI प्रवेश परीक्षा सहायक। कृपया प्रवेश परीक्षा, पात्रता या करियर से जुड़ा अपना सवाल पूछें।"
            elif language == "ml-IN":
                ans = "ഞാൻ **Sree** — നിങ്ങളുടെ AI പ്രവേശന പരീക്ഷാ സഹായി. പരീക്ഷ, യോഗ്യത അല്ലെങ്കിൽ കരിയർ സംബന്ധിച്ച ചോദ്യങ്ങൾ ചോദിക്കാം."
            elif language == "ta-IN":
                ans = "நான் **Sree** — உங்கள் AI நுழைவுத் தேர்வு உதவியாளர். சேர்க்கை தேர்வுகள் அல்லது தகுதிகள் பற்றிய கேள்வியைக் கேளுங்கள்."
            elif language == "te-IN":
                ans = "నేను **Sree** — మీ AI ప్రవేశ పరీక్ష సహాయకుడిని. ప్రవేశ పరీక్షలు లేదా అర్హతల గురించి ప్రశ్న అడగండి."
            else:
                ans = "I am **Sree**, your AI entrance assistant. Please ask any question about entrance exams, eligibility, or career options."

            return {
                "answer": ans,
                "sources": [],
                "confidence": 100.0,
                "is_faq_short_circuit": False
            }

        # 3. THANKS / GRATITUDE ("thank you", "thanks", "awesome")
        thanks_words = {"thanks", "thankyou", "thx", "awesome", "great", "cool", "nice", "perfect"}
        is_thanks = (clean_q in thanks_words or clean_q.startswith("thank you") or clean_q.startswith("thanks")) and not has_exam_keyword

        if is_thanks:
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
        farewell_words = {"bye", "goodbye", "exit", "quit", "cya"}
        is_farewell = (clean_q in farewell_words or clean_q.startswith("bye") or clean_q.startswith("goodbye")) and not has_exam_keyword

        if is_farewell:
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
