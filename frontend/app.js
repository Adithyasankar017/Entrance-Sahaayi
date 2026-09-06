// Entrance Sahaayi Application Client Script (v2.0)

document.addEventListener("DOMContentLoaded", () => {
    // State
    let currentUserRole = null; // 'Student', 'Parent', 'Admin'
    let currentExamContext = null;
    let currentLanguage = "en-IN";
    let uploadedVideos = [];
    let adminPasscode = "";
    let isRecording = false;
    let recognition = null;

    const UI_TRANSLATIONS = {
        "en-IN": { portalSubtitle: "AI-Based Career Guidance & Entrance Exam Assistant after Class 12", studentLogin: "Student Login", parentLogin: "Parent Login", adminLogin: "Admin / Programmer", studentDescription: "Explore entrance exams, watch explainer video briefings, and chat with AI for career paths.", parentDescription: "Review eligibility criteria, college cost summaries, and guidance for your child.", adminDescription: "Upload official entrance PDFs, brochures, and manage vector knowledge base.", continueStudent: "Continue as Student", continueParent: "Continue as Parent", adminPortal: "Admin Portal", appSubtitle: "AI Career Guidance Assistant", welcome: role => `Welcome, ${role}!`, welcomeIntro: "Navigating entrance exams and career choices after Class 12 made easy. Choose how you would like to proceed today:", path1: "Path 1: Finalized Entrance Selection", path2: "Path 2: Undecided / Career Guidance", examPrompt: "I Know Which Entrance Exam I Want to Pursue", examDescription: "If you have already decided on an entrance exam, select it from the dropdown list below to view the explainer video briefing and ask any queries to the AI assistant.", guidancePrompt: "Help Me Choose the Right Entrance Exam & Career Path", guidanceDescription: "Not sure which entrance exam suits your academic background and interests? Upload your marksheet or fill in your subject marks below so our AI Assistant can analyze your profile and recommend suitable entrance exams.", uploadProfile: "1. Upload Marksheet or Enter Profile", recommendations: "2. AI Entrance Recommendations", assistant: "AI Assistant", askAbout: "Ask Queries About", send: "Send", listen: "Listen", you: "You", typing: exam => `Searching ingested brochures for ${exam || "exam"}...`, greeting: exam => `Have further questions after reviewing the video briefing for ${exam}? Ask me anything about eligibility criteria, subject weightage, seat allocation, or rank calculation!`, languageName: "English" },
        "hi-IN": { portalSubtitle: "कक्षा 12 के बाद AI करियर मार्गदर्शन और प्रवेश परीक्षा सहायक", studentLogin: "विद्यार्थी लॉगिन", parentLogin: "अभिभावक लॉगिन", adminLogin: "व्यवस्थापक / प्रोग्रामर", studentDescription: "प्रवेश परीक्षाएं देखें, वीडियो जानकारी प्राप्त करें और करियर के लिए AI से बात करें।", parentDescription: "पात्रता, कॉलेज शुल्क और अपने बच्चे के लिए मार्गदर्शन देखें।", adminDescription: "आधिकारिक प्रवेश PDF और ब्रोशर अपलोड करें तथा ज्ञान आधार प्रबंधित करें।", continueStudent: "विद्यार्थी के रूप में जारी रखें", continueParent: "अभिभावक के रूप में जारी रखें", adminPortal: "व्यवस्थापक पोर्टल", appSubtitle: "AI करियर मार्गदर्शन सहायक", welcome: role => `स्वागत है, ${role}!`, welcomeIntro: "कक्षा 12 के बाद प्रवेश परीक्षाओं और करियर विकल्पों को आसान बनाएं। आज आगे बढ़ने का तरीका चुनें:", path1: "मार्ग 1: प्रवेश परीक्षा तय है", path2: "मार्ग 2: करियर मार्गदर्शन", examPrompt: "मुझे पता है कि मुझे कौन सी प्रवेश परीक्षा देनी है", examDescription: "अपनी परीक्षा चुनें और वीडियो जानकारी देखें तथा AI सहायक से प्रश्न पूछें।", guidancePrompt: "सही प्रवेश परीक्षा और करियर चुनने में मदद करें", guidanceDescription: "अपनी अंकतालिका अपलोड करें या अंक भरें ताकि AI सहायक आपके लिए उपयुक्त परीक्षाओं की सिफारिश कर सके।", uploadProfile: "1. अंकतालिका अपलोड करें या प्रोफ़ाइल भरें", recommendations: "2. AI प्रवेश परीक्षा सिफारिशें", assistant: "AI सहायक", askAbout: "इसके बारे में प्रश्न पूछें", send: "भेजें", listen: "सुनें", you: "आप", typing: exam => `${exam || "परीक्षा"} के आधिकारिक ब्रोशर खोजे जा रहे हैं...`, greeting: exam => `${exam} के बारे में और प्रश्न हैं? पात्रता, विषय भार, सीट आवंटन या रैंक गणना के बारे में पूछें!`, languageName: "हिंदी" },
        "ml-IN": { portalSubtitle: "പ്ലസ് ടുവിന് ശേഷമുള്ള AI കരിയര്‍ മാര്‍ഗ്ഗനിര്‍ദ്ദേശവും പ്രവേശന പരീക്ഷാ സഹായിയും", studentLogin: "വിദ്യാര്‍ത്ഥി ലോഗിന്‍", parentLogin: "രക്ഷിതാക്കളുടെ ലോഗിന്‍", adminLogin: "അഡ്മിന്‍ / പ്രോഗ്രാമര്‍", studentDescription: "പ്രവേശന പരീക്ഷകള്‍ കണ്ടെത്തുകയും AI-യുമായി കരിയര്‍ ചര്‍ച്ച ചെയ്യുകയും ചെയ്യുക.", parentDescription: "യോഗ്യതയും കോളേജ് ഫീസ് വിവരങ്ങളും പരിശോധിക്കുക.", adminDescription: "ഔദ്യോഗിക പ്രവേശന PDF-കളും ബ്രോഷറുകളും അപ്‌ലോഡ് ചെയ്യുക.", continueStudent: "വിദ്യാര്‍ത്ഥിയായി തുടരുക", continueParent: "രക്ഷിതാവായി തുടരുക", adminPortal: "അഡ്മിന്‍ പോര്‍ട്ടല്‍", appSubtitle: "AI കരിയര്‍ മാര്‍ഗ്ഗനിര്‍ദ്ദേശ സഹായി", welcome: role => `സ്വാഗതം, ${role}!`, welcomeIntro: "പ്രവേശന പരീക്ഷകളും കരിയര്‍ തിരഞ്ഞെടുപ്പുകളും എളുപ്പമാക്കാം.", path1: "വഴി 1: പ്രവേശന പരീക്ഷ തിരഞ്ഞെടുത്തു", path2: "വഴി 2: കരിയര്‍ മാര്‍ഗ്ഗനിര്‍ദ്ദേശം", examPrompt: "എനിക്ക് തിരഞ്ഞെടുക്കേണ്ട പ്രവേശന പരീക്ഷ അറിയാം", examDescription: "ഒരു പരീക്ഷ തിരഞ്ഞെടുത്ത് വീഡിയോ വിവരങ്ങളും AI സഹായവും നേടുക.", guidancePrompt: "ശരിയായ പ്രവേശന പരീക്ഷയും കരിയറും തിരഞ്ഞെടുക്കാന്‍ സഹായിക്കുക", guidanceDescription: "നിങ്ങളുടെ മാര്‍ക്ക് ലിസ്റ്റ് അപ്‌ലോഡ് ചെയ്യുകയോ മാര്‍ക്കുകള്‍ നല്‍കുകയോ ചെയ്യുക.", uploadProfile: "1. മാര്‍ക്ക് ലിസ്റ്റ് അപ്‌ലോഡ് ചെയ്യുക അല്ലെങ്കില്‍ പ്രൊഫൈല്‍ നല്‍കുക", recommendations: "2. AI പ്രവേശന ശുപാര്‍ശകള്‍", assistant: "AI സഹായി", askAbout: "ഇതിനെക്കുറിച്ച് ചോദിക്കുക", send: "അയയ്ക്കുക", listen: "കേള്‍ക്കുക", you: "നിങ്ങള്‍", typing: exam => `${exam || "പരീക്ഷ"}യുടെ ഔദ്യോഗിക ബ്രോഷറുകള്‍ തിരയുന്നു...`, greeting: exam => `${exam}യെക്കുറിച്ച് കൂടുതല്‍ ചോദ്യങ്ങളുണ്ടോ? യോഗ്യത, സീറ്റ് അലോട്ട്മെന്റ്, റാങ്ക് കണക്കാക്കല്‍ എന്നിവ ചോദിക്കാം!`, languageName: "മലയാളം" },
        "ta-IN": { portalSubtitle: "12ஆம் வகுப்புக்குப் பிறகு AI தொழில் வழிகாட்டி மற்றும் நுழைவுத் தேர்வு உதவி", studentLogin: "மாணவர் உள்நுழைவு", parentLogin: "பெற்றோர் உள்நுழைவு", adminLogin: "நிர்வாகி / நிரலாளர்", studentDescription: "நுழைவுத் தேர்வுகளை ஆராய்ந்து AI-யிடம் தொழில் வழிகாட்டுதலைப் பெறுங்கள்.", parentDescription: "தகுதி மற்றும் கல்லூரி கட்டணத் தகவல்களைப் பாருங்கள்.", adminDescription: "அதிகாரப்பூர்வ நுழைவுத் தேர்வு PDF-களைப் பதிவேற்றுங்கள்.", continueStudent: "மாணவராகத் தொடர்க", continueParent: "பெற்றோராகத் தொடர்க", adminPortal: "நிர்வாகி போர்டல்", appSubtitle: "AI தொழில் வழிகாட்டி", welcome: role => `வரவேற்கிறோம், ${role}!`, welcomeIntro: "நுழைவுத் தேர்வுகளையும் தொழில் தேர்வுகளையும் எளிதாக்குங்கள்.", path1: "வழி 1: நுழைவுத் தேர்வு முடிவு செய்யப்பட்டது", path2: "வழி 2: தொழில் வழிகாட்டுதல்", examPrompt: "எந்த நுழைவுத் தேர்வை எழுத வேண்டும் என்று எனக்குத் தெரியும்", examDescription: "தேர்வைத் தேர்ந்தெடுத்து வீடியோ விளக்கத்தையும் AI உதவியையும் பெறுங்கள்.", guidancePrompt: "சரியான நுழைவுத் தேர்வு மற்றும் தொழிலைத் தேர்ந்தெடுக்க உதவுங்கள்", guidanceDescription: "மதிப்பெண் பட்டியலைப் பதிவேற்றுங்கள் அல்லது மதிப்பெண்களை உள்ளிடுங்கள்.", uploadProfile: "1. மதிப்பெண் பட்டியலைப் பதிவேற்றவும் அல்லது சுயவிவரம் உள்ளிடவும்", recommendations: "2. AI நுழைவுத் தேர்வு பரிந்துரைகள்", assistant: "AI உதவியாளர்", askAbout: "இதுபற்றி கேளுங்கள்", send: "அனுப்பு", listen: "கேளுங்கள்", you: "நீங்கள்", typing: exam => `${exam || "தேர்வு"} அதிகாரப்பூர்வ விளக்கங்கள் தேடப்படுகின்றன...`, greeting: exam => `${exam} பற்றி மேலும் கேள்விகள் உள்ளதா? தகுதி, இட ஒதுக்கீடு அல்லது தரவரிசை பற்றி கேளுங்கள்!`, languageName: "தமிழ்" },
        "te-IN": { portalSubtitle: "12వ తరగతి తర్వాత AI కెరీర్ మార్గదర్శకం మరియు ప్రవేశ పరీక్ష సహాయకుడు", studentLogin: "విద్యార్థి లాగిన్", parentLogin: "తల్లిదండ్రుల లాగిన్", adminLogin: "అడ్మిన్ / ప్రోగ్రామర్", studentDescription: "ప్రవేశ పరీక్షలను అన్వేషించి AIతో కెరీర్ మార్గదర్శకం పొందండి.", parentDescription: "అర్హత మరియు కళాశాల ఫీజు వివరాలను చూడండి.", adminDescription: "అధికారిక ప్రవేశ పరీక్ష PDFలను అప్‌లోడ్ చేయండి.", continueStudent: "విద్యార్థిగా కొనసాగండి", continueParent: "తల్లిదండ్రిగా కొనసాగండి", adminPortal: "అడ్మిన్ పోర్టల్", appSubtitle: "AI కెరీర్ మార్గదర్శక సహాయకుడు", welcome: role => `స్వాగతం, ${role}!`, welcomeIntro: "ప్రవేశ పరీక్షలు మరియు కెరీర్ ఎంపికలను సులభం చేసుకోండి.", path1: "మార్గం 1: ప్రవేశ పరీక్ష నిర్ణయించబడింది", path2: "మార్గం 2: కెరీర్ మార్గదర్శకం", examPrompt: "ఏ ప్రవేశ పరీక్ష రాయాలో నాకు తెలుసు", examDescription: "పరీక్షను ఎంచుకుని వీడియో వివరణ మరియు AI సహాయం పొందండి.", guidancePrompt: "సరైన ప్రవేశ పరీక్ష మరియు కెరీర్‌ను ఎంచుకోవడానికి సహాయం చేయండి", guidanceDescription: "మీ మార్కుల పట్టికను అప్‌లోడ్ చేయండి లేదా మార్కులను నమోదు చేయండి.", uploadProfile: "1. మార్కుల పట్టికను అప్‌లోడ్ చేయండి లేదా ప్రొఫైల్ నమోదు చేయండి", recommendations: "2. AI ప్రవేశ పరీక్ష సిఫార్సులు", assistant: "AI సహాయకుడు", askAbout: "దీని గురించి ప్రశ్నలు అడగండి", send: "పంపండి", listen: "వినండి", you: "మీరు", typing: exam => `${exam || "పరీక్ష"} అధికారిక బ్రోచర్లను వెతుకుతున్నాము...`, greeting: exam => `${exam} గురించి మరిన్ని ప్రశ్నలు ఉన్నాయా? అర్హత, సీట్ల కేటాయింపు లేదా ర్యాంక్ గురించి అడగండి!`, languageName: "తెలుగు" }
    };

    function t(key, ...args) {
        const value = (UI_TRANSLATIONS[currentLanguage] || UI_TRANSLATIONS["en-IN"])[key];
        return typeof value === "function" ? value(...args) : (value || key);
    }

    function applyLanguage() {
        const selectors = {
            ".portal-subtitle": "portalSubtitle", ".app-subtitle": "appSubtitle", ".hero-welcome p": "welcomeIntro",
            ".role-card:nth-child(1) h3": "studentLogin", ".role-card:nth-child(2) h3": "parentLogin", ".role-card:nth-child(3) h3": "adminLogin",
            ".role-card:nth-child(1) p": "studentDescription", ".role-card:nth-child(2) p": "parentDescription", ".role-card:nth-child(3) p": "adminDescription",
            ".role-card:nth-child(1) button": "continueStudent", ".role-card:nth-child(2) button": "continueParent", ".role-card:nth-child(3) button": "adminPortal",
            ".pathway-section:nth-child(1) .section-badge": "path1", ".pathway-section:nth-child(2) .section-badge": "path2", ".pathway-section:nth-child(1) h3": "examPrompt", ".pathway-section:nth-child(1) .section-header-box p": "examDescription",
            ".pathway-section:nth-child(2) h3": "guidancePrompt", ".pathway-section:nth-child(2) .section-header-box p": "guidanceDescription", ".input-card h4": "uploadProfile", ".output-card h4": "recommendations",
            ".send-btn span": "send"
        };
        Object.entries(selectors).forEach(([selector, key]) => {
            const element = document.querySelector(selector);
            if (element) element.textContent = t(key);
        });
        if (welcomeHeading && currentUserRole) welcomeHeading.textContent = t("welcome", currentUserRole);
        if (currentLangLabel) currentLangLabel.textContent = t("languageName");
        document.documentElement.lang = currentLanguage;
    }

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
    const adminPasscodeInput = document.getElementById("adminPasscodeInput");
    const submitAdminPasscode = document.getElementById("submitAdminPasscode");

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
    const videoUploadForm = document.getElementById("videoUploadForm");
    const videoUploadStatus = document.getElementById("videoUploadStatus");

    applyLanguage();
    loadUploadedVideos();

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
                adminPasscodeInput.value = "";
                adminPasscodeInput.focus();
            } else {
                loginUser(role);
            }
        });
    });

    document.getElementById("cancelAdminPasscode").addEventListener("click", () => {
        adminPasscodeModal.classList.add("hidden");
    });

    function authenticateAdmin() {
        const pass = adminPasscodeInput.value.trim();
        if (pass === "admin123") {
            adminPasscode = pass;
            adminPasscodeModal.classList.add("hidden");
            loginUser("Admin");
        } else {
            adminPasscodeInput.value = "";
            adminPasscodeInput.focus();
            alert("Invalid Admin Passcode. Please try again.");
        }
    }

    submitAdminPasscode.addEventListener("click", authenticateAdmin);
    adminPasscodeInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") authenticateAdmin();
    });

    function loginUser(role) {
        currentUserRole = role;
        document.body.classList.toggle("admin-mode", role === "Admin");
        activeRoleBadge.innerHTML = `<i class="fa-solid fa-user"></i> ${role} Mode`;
        welcomeHeading.textContent = `Welcome, ${role}! 👋`;

        if (role === "Admin") {
            adminPanelBtn.classList.remove("hidden");
            fetchDBStats();
            switchScreen(adminScreen);
        } else {
            adminPanelBtn.classList.add("hidden");
            switchScreen(landingScreen);
        }
        applyLanguage();
    }

    logoutBtn.addEventListener("click", () => {
        currentUserRole = null;
        currentExamContext = null;
        document.body.classList.remove("admin-mode");
        switchScreen(loginScreen);
    });

    adminPanelBtn.addEventListener("click", () => {
        fetchDBStats();
        switchScreen(adminScreen);
    });

    document.getElementById("backToLandingFromExam").addEventListener("click", () => switchScreen(landingScreen));
    document.getElementById("backToLandingFromAdmin").addEventListener("click", () => switchScreen(loginScreen));

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
        const uploadedVideo = uploadedVideos.slice().reverse().find(video => video.exam === examName && video.video_url);
        const videoUrl = uploadedVideo ? uploadedVideo.video_url : info.videoUrl;

        detailExamTitle.textContent = examName;
        detailExamStream.textContent = info.stream;
        videoExamNameLabel.textContent = examName;
        examSummaryBody.innerHTML = info.summaryHtml;
        chatExamContextName.textContent = examName;
        chatExamWelcomeName.textContent = examName;

        if (videoUrl && !videoUrl.includes("placeholder")) {
            examVideoPlayer.src = videoUrl;
            examVideoPlayer.classList.remove("hidden");
            videoPlaceholder.classList.add("hidden");
        } else {
            examVideoPlayer.removeAttribute("src");
            examVideoPlayer.load();
            videoPlaceholder.classList.remove("hidden");
            examVideoPlayer.classList.add("hidden");
        }

        // Reset Chat
        examChatHistory.innerHTML = `
            <div class="message bot-message">
                <div class="avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="message-content">
                    <div class="sender-name">Entrance Sahaayi ${t("assistant")} (${currentUserRole} Mode)</div>
                    <p>${t("greeting", examName)}</p>
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
                    exam_context: currentExamContext,
                    language: currentLanguage
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
        const senderLabel = isBot ? `Entrance Sahaayi (${role || 'Student'} Mode)` : t("you");

        let sourcesHtml = "";
        if (isBot && sources && sources.length > 0) {
            const badges = sources.map(s => `<span class="source-badge"><i class="fa-solid fa-file-contract"></i> ${s.source} (${s.relevance}%)</span>`).join("");
            sourcesHtml = `<div class="sources-card"><div><strong>Verified Brochure Citations:</strong></div>${badges}</div>`;
        }

        let audioBtnHtml = "";
        if (isBot) {
            audioBtnHtml = `<button class="audio-play-btn" onclick="speakText(\`${escapeQuotes(text)}\`)"><i class="fa-solid fa-volume-high"></i> ${t("listen")}</button>`;
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
            <div class="message-content"><i class="fa-solid fa-circle-notch fa-spin"></i> ${t("typing", currentExamContext)}</div>
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
        applyLanguage();
        if (currentExamContext) {
            const welcome = examChatHistory.querySelector(".bot-message p");
            if (welcome) welcome.textContent = t("greeting", currentExamContext);
        }
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
    async function loadUploadedVideos() {
        try {
            const res = await fetch("/api/videos");
            if (res.ok) uploadedVideos = await res.json();
        } catch (err) {
            console.error("Error loading explainer videos:", err);
        }
    }

    if (videoUploadForm) {
        videoUploadForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const file = document.getElementById("videoFileInput").files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("file", file);
            formData.append("title", document.getElementById("videoTitle").value);
            formData.append("exam", document.getElementById("videoExam").value);
            formData.append("stream", document.getElementById("videoStream").value);
            formData.append("duration", document.getElementById("videoDuration").value);
            formData.append("summary", document.getElementById("videoSummary").value);
            formData.append("tags", document.getElementById("videoTags").value);
            videoUploadStatus.textContent = "Uploading video...";

            try {
                const res = await fetch("/api/upload-video", {
                    method: "POST",
                    headers: { "x-admin-key": adminPasscode },
                    body: formData
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || "Video upload failed.");
                uploadedVideos.push(data.video);
                videoUploadStatus.textContent = data.message;
                videoUploadForm.reset();
                fetchDBStats();
            } catch (err) {
                videoUploadStatus.textContent = err.message;
            }
        });
    }

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
