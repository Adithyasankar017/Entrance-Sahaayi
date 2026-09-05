// Entrance Sahaayi Application Client Script (v2.0)

document.addEventListener("DOMContentLoaded", () => {
    // State
    let currentUserRole = null; // 'Student', 'Parent', 'Admin'
    let currentExamContext = null;
    let currentLanguage = "en-IN";
    let adminPasscode = "";
    let isRecording = false;
    let recognition = null;

    // Exam Summaries Catalog for Briefings
    const EXAM_SUMMARIES = {
        "JEE Main": {
            stream: "Engineering (PCM)",
            title: "JEE Main / Advanced Entrance Roadmap",
            videoUrl: "/static/videos/jee_main_briefing.mp4",
            summaryHtml: `
                <p><strong>Conducting Body:</strong> National Testing Agency (NTA)</p>
                <p><strong>Eligibility:</strong> Pass Class 12 with Physics, Chemistry, and Mathematics (PCM). 75% aggregate marks required for NITs/IIITs (65% for SC/ST).</p>
                <p><strong>Exam Pattern:</strong> Computer Based Test (CBT) covering Physics, Chemistry, Math. 300 total marks.</p>
                <p><strong>Top Career Streams:</strong> Computer Science & AI, Data Science, ECE, Electrical, Mechanical Engineering.</p>
            `
        },
        "NEET-UG": {
            stream: "Medical (PCB)",
            title: "NEET-UG Medical Admissions Guide",
            videoUrl: "/static/videos/neet_ug_briefing.mp4",
            summaryHtml: `
                <p><strong>Conducting Body:</strong> National Testing Agency (NTA) for NMC</p>
                <p><strong>Eligibility:</strong> Minimum 50% aggregate in Physics, Chemistry, Biology (PCB) in Class 12. Must be 17 years old by Dec 31st. No upper age limit.</p>
                <p><strong>Exam Pattern:</strong> 720 Marks (Pen & Paper OMR). Biology (360 Marks), Physics (180 Marks), Chemistry (180 Marks).</p>
                <p><strong>Top Courses:</strong> MBBS, BDS, BAMS, BHMS, B.Sc Nursing, B.Pharm, Physiotherapy (BPT).</p>
            `
        },
        "CUET-UG": {
            stream: "Central Universities (All Streams)",
            title: "CUET-UG Central Universities Masterclass",
            videoUrl: "/static/videos/cuet_ug_briefing.mp4",
            summaryHtml: `
                <p><strong>Conducting Body:</strong> National Testing Agency (NTA)</p>
                <p><strong>Eligibility:</strong> Class 12 passed in any stream (Science, Commerce, Arts).</p>
                <p><strong>Sections:</strong> Section I (Languages), Section II (Domain Subjects), Section III (General Test).</p>
                <p><strong>Target Colleges:</strong> Delhi University (DU), BHU, JNU, Jamia Millia, Central Universities.</p>
            `
        },
        "KEAM": {
            stream: "State Engineering & Pharmacy",
            title: "KEAM Kerala State Engineering Guidance",
            videoUrl: "/static/videos/keam_briefing.mp4",
            summaryHtml: `
                <p><strong>Conducting Body:</strong> Commissioner for Entrance Examinations (CEE Kerala)</p>
                <p><strong>Rank Formula:</strong> 50:50 equal weightage between KEAM Entrance score and Class 12 PCM Board marks.</p>
                <p><strong>Process:</strong> Centralized Allotment Process (CAP) option registration for Govt & Self-financing colleges across Kerala.</p>
            `
        },
        "CLAT": {
            stream: "Integrated Law (BA LLB / BBA LLB)",
            title: "CLAT National Law Universities Roadmap",
            videoUrl: "/static/videos/clat_briefing.mp4",
            summaryHtml: `
                <p><strong>Conducting Body:</strong> Consortium of National Law Universities (NLUs)</p>
                <p><strong>Eligibility:</strong> Class 12 passed with min 45% aggregate in any stream.</p>
                <p><strong>Exam Pattern:</strong> Reading Comprehension, Legal Reasoning, Logical Reasoning, GK & Quantitative Techniques.</p>
            `
        },
        "NATA / NIFT": {
            stream: "Architecture & Design",
            title: "NATA Architecture & NIFT Design Entrance Guide",
            videoUrl: "/static/videos/nata_nift_briefing.mp4",
            summaryHtml: `
                <p><strong>NATA:</strong> National Aptitude Test in Architecture (Council of Architecture) for B.Arch admissions.</p>
                <p><strong>NIFT:</strong> National Institute of Fashion Technology Entrance for B.Des & B.FTech.</p>
                <p><strong>Eligibility:</strong> Class 12 PCM / Mathematics required for Architecture; Any stream for B.Des.</p>
            `
        }
    };

    // DOM Screen Elements
    const loginScreen = document.getElementById("loginScreen");
    const landingScreen = document.getElementById("landingScreen");
    const examDetailScreen = document.getElementById("examDetailScreen");
    const adminScreen = document.getElementById("adminScreen");
    const adminPasscodeModal = document.getElementById("adminPasscodeModal");

    // Header & Role Elements
    const activeRoleBadge = document.getElementById("activeRoleBadge");
    const welcomeHeading = document.getElementById("welcomeHeading");
    const speechLanguageSelect = document.getElementById("speechLanguage");
    const logoutBtn = document.getElementById("logoutBtn");
    const adminPanelBtn = document.getElementById("adminPanelBtn");

    // Pathway 1 Elements (Entrance Finalized)
    const examDropdown = document.getElementById("examDropdown");
    const goToExamBtn = document.getElementById("goToExamBtn");

    // Pathway 2 Elements (Undecided Marksheet Analyzer)
    const marksheetDropZone = document.getElementById("marksheetDropZone");
    const marksheetFileInput = document.getElementById("marksheetFileInput");
    const marksheetUploadStatus = document.getElementById("marksheetUploadStatus");
    const landingAnalyzerForm = document.getElementById("landingAnalyzerForm");
    const landingAnalyzerOutput = document.getElementById("landingAnalyzerOutput");

    // Exam Detail Elements
    const detailExamTitle = document.getElementById("detailExamTitle");
    const detailExamStream = document.getElementById("detailExamStream");
    const videoExamNameLabel = document.getElementById("videoExamNameLabel");
    const videoPlaceholder = document.getElementById("videoPlaceholder");
    const examVideoPlayer = document.getElementById("examVideoPlayer");
    const examSummaryBody = document.getElementById("examSummaryBody");
    const chatExamContextName = document.getElementById("chatExamContextName");
    const chatExamWelcomeName = document.getElementById("chatExamWelcomeName");
    const examChatHistory = document.getElementById("examChatHistory");
    const examChatForm = document.getElementById("examChatForm");
    const userInput = document.getElementById("userInput");
    const micBtn = document.getElementById("micBtn");
    const voiceBanner = document.getElementById("voiceBanner");
    const currentLangLabel = document.getElementById("currentLangLabel");
    const cancelVoiceBtn = document.getElementById("cancelVoiceBtn");

    // Admin Elements
    const dropZone = document.getElementById("dropZone");
    const pdfFileInput = document.getElementById("pdfFileInput");
    const uploadStatus = document.getElementById("uploadStatus");
    const faqForm = document.getElementById("faqForm");

    // Speech Recognition
    initSpeechRecognition();

    // -------------------------------------------------------------
    // 1. ROLE LOGIN & SCREEN SWITCHING LOGIC
    // -------------------------------------------------------------
    document.querySelectorAll(".role-card").forEach(card => {
        card.addEventListener("click", () => {
            const role = card.dataset.role;
            if (role === "Admin") {
                adminPasscodeModal.classList.remove("hidden");
            } else {
                loginUser(role);
            }
        });
    });

    document.getElementById("cancelAdminPasscode").addEventListener("click", () => {
        adminPasscodeModal.classList.add("hidden");
    });

    document.getElementById("submitAdminPasscode").addEventListener("click", () => {
        const pass = document.getElementById("adminPasscodeInput").value;
        if (pass === "admin123") {
            adminPasscode = pass;
            adminPasscodeModal.classList.add("hidden");
            loginUser("Admin");
        } else {
            alert("Invalid Admin Passcode. Default is 'admin123'.");
        }
    });

    function loginUser(role) {
        currentUserRole = role;
        activeRoleBadge.innerHTML = `<i class="fa-solid fa-user"></i> ${role} Mode`;
        welcomeHeading.textContent = `Welcome, ${role}! 👋`;

        if (role === "Admin") {
            adminPanelBtn.classList.remove("hidden");
        } else {
            adminPanelBtn.classList.add("hidden");
        }

        switchScreen(landingScreen);
    }

    logoutBtn.addEventListener("click", () => {
        currentUserRole = null;
        currentExamContext = null;
        switchScreen(loginScreen);
    });

    adminPanelBtn.addEventListener("click", () => {
        fetchDBStats();
        switchScreen(adminScreen);
    });

    document.getElementById("backToLandingFromExam").addEventListener("click", () => switchScreen(landingScreen));
    document.getElementById("backToLandingFromAdmin").addEventListener("click", () => switchScreen(landingScreen));

    function switchScreen(targetScreen) {
        [loginScreen, landingScreen, examDetailScreen, adminScreen].forEach(s => s.classList.add("hidden"));
        targetScreen.classList.remove("hidden");
        window.scrollTo(0, 0);
    }

    // -------------------------------------------------------------
    // 2. PATHWAY 1: TARGET ENTRANCE SELECTION (DROPDOWN)
    // -------------------------------------------------------------
    examDropdown.addEventListener("change", () => {
        if (examDropdown.value) {
            goToExamBtn.disabled = false;
        }
    });

    goToExamBtn.addEventListener("click", () => {
        const selectedExam = examDropdown.value;
        if (selectedExam) {
            openExamDetail(selectedExam);
        }
    });

    function openExamDetail(examName) {
        currentExamContext = examName;
        const info = EXAM_SUMMARIES[examName] || {
            stream: "General Stream",
            title: `${examName} Overview`,
            videoUrl: "/static/videos/placeholder.mp4",
            summaryHtml: `<p>Official information extracted from ingested brochures.</p>`
        };

        detailExamTitle.textContent = examName;
        detailExamStream.textContent = info.stream;
        videoExamNameLabel.textContent = examName;
        examSummaryBody.innerHTML = info.summaryHtml;
        chatExamContextName.textContent = examName;
        chatExamWelcomeName.textContent = examName;

        // Video Player Placeholder handling
        videoPlaceholder.classList.remove("hidden");
        examVideoPlayer.classList.add("hidden");

        // Reset Chat
        examChatHistory.innerHTML = `
            <div class="message bot-message">
                <div class="avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="message-content">
                    <div class="sender-name">Entrance Sahaayi Assistant (${currentUserRole} Mode)</div>
                    <p>Have further questions after reviewing the video briefing for <strong>${examName}</strong>? Ask me anything about eligibility criteria, subject weightage, seat allocation, or rank calculation!</p>
                </div>
            </div>
        `;

        switchScreen(examDetailScreen);
    }

    // -------------------------------------------------------------
    // 3. PATHWAY 2: MARKSHEET UPLOAD & CAREER GUIDANCE (BOTTOM OF LANDING)
    // -------------------------------------------------------------
    if (marksheetDropZone) {
        marksheetDropZone.addEventListener("click", () => marksheetFileInput.click());
    }

    if (marksheetFileInput) {
        marksheetFileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                uploadMarksheetFile(e.target.files[0]);
            }
        });
    }

    async function uploadMarksheetFile(file) {
        marksheetUploadStatus.innerHTML = `<span style="color:#93c5fd;"><i class="fa-solid fa-spinner fa-spin"></i> Parsing '${file.name}'...</span>`;
        landingAnalyzerOutput.innerHTML = `<div class="loading-box"><i class="fa-solid fa-spinner fa-spin"></i> Analyzing uploaded marksheet against official entrance brochures...</div>`;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("interests", document.getElementById("anInterests").value || "");
        formData.append("budget", document.getElementById("anBudget").value || "Govt / Merit");

        try {
            const res = await fetch("/api/upload-marksheet", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                marksheetUploadStatus.innerHTML = `<span style="color:#00d26a;"><i class="fa-solid fa-check-circle"></i> Marksheet Parsed Successfully!</span>`;
                renderAnalyzerResults(data);
            } else {
                marksheetUploadStatus.innerHTML = `<span style="color:#ef4444;">${data.detail || 'Error uploading marksheet.'}</span>`;
                landingAnalyzerOutput.innerHTML = `<span style="color:#ef4444;">Error processing marksheet.</span>`;
            }
        } catch (err) {
            marksheetUploadStatus.innerHTML = `<span style="color:#ef4444;">Upload network error.</span>`;
            landingAnalyzerOutput.innerHTML = `<span style="color:#ef4444;">Network error connecting to backend API.</span>`;
        }
    }

    landingAnalyzerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const stream = document.getElementById("anStream").value;
        const marks = parseFloat(document.getElementById("anClass12").value);
        const mathPhysics = parseFloat(document.getElementById("anMathPhysics").value) || 0;
        const bio = parseFloat(document.getElementById("anBio").value) || 0;
        const interestsInput = document.getElementById("anInterests").value;
        const budget = document.getElementById("anBudget").value;

        const interestsList = interestsInput.split(",").map(i => i.trim()).filter(i => i.length > 0);

        landingAnalyzerOutput.innerHTML = `<div class="loading-box"><i class="fa-solid fa-spinner fa-spin"></i> Analyzing profile against official brochures...</div>`;

        try {
            const res = await fetch("/api/analyze-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stream: stream,
                    class12_marks: marks,
                    physics: mathPhysics,
                    math: mathPhysics,
                    bio: bio,
                    interests: interestsList,
                    budget: budget
                })
            });

            const data = await res.json();
            if (res.ok) {
                renderAnalyzerResults(data);
            } else {
                landingAnalyzerOutput.innerHTML = `<span style="color:#ef4444;">Error generating recommendation report.</span>`;
            }
        } catch (err) {
            landingAnalyzerOutput.innerHTML = `<span style="color:#ef4444;">Network error connecting to API.</span>`;
        }
    });

    function renderAnalyzerResults(data) {
        const recs = data.recommendations || [];
        let snippetHtml = data.extracted_snippet ? `
            <div class="snippet-banner">
                <i class="fa-solid fa-file-text"></i> <strong>Extracted Marksheet Text:</strong> "${data.extracted_snippet}"
            </div>
        ` : '';

        let cardsHtml = recs.map(r => `
            <div class="rec-card">
                <div class="rec-exam">${r.exam}</div>
                <div class="rec-verdict"><i class="fa-solid fa-circle-check"></i> ${r.eligibility_verdict}</div>
                <p class="rec-reasoning">${r.reasoning}</p>
                <div style="margin-bottom:8px; font-size:0.8rem; color:var(--text-secondary);"><strong>Target Branches:</strong> ${r.recommended_branches.join(", ")}</div>
                <span class="rec-citation"><i class="fa-solid fa-file-contract"></i> Citation: ${r.brochure_citation}</span>
            </div>
        `).join("");

        landingAnalyzerOutput.innerHTML = `
            ${snippetHtml}
            <div style="margin-bottom:16px;">
                <h4><i class="fa-solid fa-user-check"></i> Student Profile: ${data.student_summary.stream} (${data.student_summary.class12_marks})</h4>
                <p style="font-size:0.8rem; color:var(--text-muted);">${data.guidance_note}</p>
            </div>
            ${cardsHtml}
        `;
    }

    // -------------------------------------------------------------
    // 4. CHAT ASSISTANT & STRICT RAG GROUNDING (BOTTOM OF EXAM PAGE)
    // -------------------------------------------------------------
    examChatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const query = userInput.value.trim();
        if (!query) return;

        appendMessage("user", query, currentUserRole);
        userInput.value = "";

        const typingElem = appendTypingIndicator();

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: query,
                    persona: currentUserRole || "Student",
                    exam_context: currentExamContext
                })
            });

            const data = await res.json();
            typingElem.remove();

            if (res.ok) {
                appendMessage("bot", data.answer, currentUserRole, data.sources, data.confidence, data.is_faq_short_circuit);
            } else {
                appendMessage("bot", "Error fetching answer from knowledge base.", currentUserRole);
            }
        } catch (err) {
            if (typingElem) typingElem.remove();
            appendMessage("bot", "Server connection error.", currentUserRole);
        }
    });

    function appendMessage(sender, text, role, sources = [], confidence = 0, isFaq = false) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${sender}-message`;

        const isBot = sender === "bot";
        const icon = isBot ? "fa-robot" : "fa-user";
        const senderLabel = isBot ? `Entrance Sahaayi (${role || 'Student'} Mode)` : "You";

        let sourcesHtml = "";
        if (isBot && sources && sources.length > 0) {
            const badges = sources.map(s => `<span class="source-badge"><i class="fa-solid fa-file-contract"></i> ${s.source} (${s.relevance}%)</span>`).join("");
            sourcesHtml = `<div class="sources-card"><div><strong>Verified Brochure Citations:</strong></div>${badges}</div>`;
        }

        let audioBtnHtml = "";
        if (isBot) {
            audioBtnHtml = `<button class="audio-play-btn" onclick="speakText(\`${escapeQuotes(text)}\`)"><i class="fa-solid fa-volume-high"></i> Listen</button>`;
        }

        msgDiv.innerHTML = `
            <div class="avatar"><i class="fa-solid ${icon}"></i></div>
            <div class="message-content">
                <div class="sender-name">${senderLabel} ${isFaq ? '<span style="color:#06b6d4;">[Instant FAQ Match]</span>' : ''}</div>
                <div>${formatMarkdown(text)}</div>
                ${sourcesHtml}
                ${audioBtnHtml}
            </div>
        `;

        examChatHistory.appendChild(msgDiv);
        examChatHistory.scrollTop = examChatHistory.scrollHeight;
    }

    function appendTypingIndicator() {
        const typingDiv = document.createElement("div");
        typingDiv.className = "message bot-message";
        typingDiv.innerHTML = `
            <div class="avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="message-content"><i class="fa-solid fa-circle-notch fa-spin"></i> Searching ingested brochures for ${currentExamContext || 'exam'}...</div>
        `;
        examChatHistory.appendChild(typingDiv);
        examChatHistory.scrollTop = examChatHistory.scrollHeight;
        return typingDiv;
    }

    // Speech Recognition
    speechLanguageSelect.addEventListener("change", (e) => {
        currentLanguage = e.target.value;
        const selectedText = speechLanguageSelect.options[speechLanguageSelect.selectedIndex].text;
        if (currentLangLabel) currentLangLabel.textContent = selectedText.split(" ")[0];
        if (recognition) recognition.lang = currentLanguage;
    });

    function initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = currentLanguage;

            recognition.onstart = () => {
                isRecording = true;
                micBtn.classList.add("recording");
                if (voiceBanner) voiceBanner.classList.remove("hidden");
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                userInput.value = transcript;
                stopRecording();
                setTimeout(() => examChatForm.dispatchEvent(new Event("submit")), 300);
            };

            recognition.onend = () => stopRecording();

            micBtn.addEventListener("click", () => {
                if (isRecording) stopRecording();
                else { recognition.lang = currentLanguage; recognition.start(); }
            });

            if (cancelVoiceBtn) cancelVoiceBtn.addEventListener("click", () => stopRecording());
        }
    }

    function stopRecording() {
        if (recognition && isRecording) recognition.stop();
        isRecording = false;
        if (micBtn) micBtn.classList.remove("recording");
        if (voiceBanner) voiceBanner.classList.add("hidden");
    }

    window.speakText = function(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const cleanText = text.replace(/[*#_`]/g, '');
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = currentLanguage;
            window.speechSynthesis.speak(utterance);
        }
    };

    // -------------------------------------------------------------
    // 5. ADMIN CONTROL PANEL LOGIC (PROGRAMMER ROLE ONLY)
    // -------------------------------------------------------------
    if (dropZone) dropZone.addEventListener("click", () => pdfFileInput.click());

    if (pdfFileInput) {
        pdfFileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) uploadFile(e.target.files[0]);
        });
    }

    async function uploadFile(file) {
        uploadStatus.innerHTML = `<span style="color:#93c5fd;"><i class="fa-solid fa-spinner fa-spin"></i> Admin Ingesting '${file.name}'...</span>`;
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload-pdf", {
                method: "POST",
                headers: { "x-admin-key": adminPasscode },
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                uploadStatus.innerHTML = `<span style="color:#00d26a;"><i class="fa-solid fa-check-circle"></i> ${data.message}</span>`;
                fetchDBStats();
            } else {
                uploadStatus.innerHTML = `<span style="color:#ef4444;">${data.detail || 'Upload failed.'}</span>`;
            }
        } catch (err) {
            uploadStatus.innerHTML = `<span style="color:#ef4444;">Upload error.</span>`;
        }
    }

    if (faqForm) {
        faqForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const q = document.getElementById("faqQuestion").value;
            const a = document.getElementById("faqAnswer").value;
            const cat = document.getElementById("faqCategory").value;

            try {
                const res = await fetch("/api/faqs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-admin-key": adminPasscode },
                    body: JSON.stringify({ question: q, answer: a, category: cat })
                });

                if (res.ok) {
                    alert("FAQ saved by Admin!");
                    faqForm.reset();
                    fetchDBStats();
                }
            } catch (err) { alert("Error adding FAQ."); }
        });
    }

    async function fetchDBStats() {
        try {
            const res = await fetch("/api/documents");
            const data = await res.json();

            document.getElementById("statDocs").textContent = data.total_documents || 0;
            document.getElementById("statChunks").textContent = data.total_chunks || 0;
            document.getElementById("statFaqs").textContent = data.total_faqs || 0;
            document.getElementById("statVideos").textContent = data.total_videos || 0;

            const docList = document.getElementById("docList");
            docList.innerHTML = "";
            if (data.documents) {
                for (const [fname, count] of Object.entries(data.documents)) {
                    const li = document.createElement("li");
                    li.className = "doc-item";
                    li.innerHTML = `<span><i class="fa-solid fa-file-pdf" style="color:#f59e0b;"></i> ${fname}</span> <span class="source-badge">${count} chunks</span>`;
                    docList.appendChild(li);
                }
            }
        } catch (err) { console.error("Error fetching stats:", err); }
    }

    function formatMarkdown(str) {
        return str.replace(/\n/g, "<br>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>");
    }

    function escapeQuotes(str) {
        return str.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ');
    }
});
