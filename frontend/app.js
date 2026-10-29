// Entrance Sahaayi Application Client Script (v2.0)

document.addEventListener("DOMContentLoaded", () => {
    // State
    let currentUserRole = null; // 'Student', 'Parent', 'Admin'
    let currentUser = null; // Logged-in user object { id, email, full_name, role, profile, token }
    let authToken = localStorage.getItem("entrance_sahaayi_token") || null;
    let currentSessionId = null; // Active ChatGPT/Gemini style topic session ID
    let userSessions = []; // Saved chat sessions list for logged-in user
    let currentExamContext = null;
    let currentLanguage = "en-IN";
    let uploadedVideos = [];
    let activeSpeech = null;
    let adminPasscode = "";
    let isRecording = false;
    let recognition = null;

    const UI_TRANSLATIONS = {
        "en-IN": {
            portalSubtitle: "AI-Based Career Guidance & Entrance Exam Assistant after Class 12",
            studentLogin: "Student Login", parentLogin: "Parent Login", adminLogin: "Admin / Programmer",
            studentDescription: "Explore entrance exams, watch explainer video briefings, and chat with AI for career paths.",
            parentDescription: "Review eligibility criteria, college cost summaries, and guidance for your child.",
            adminDescription: "Upload official entrance PDFs, brochures, and manage vector knowledge base.",
            continueStudent: "Continue as Student", continueParent: "Continue as Parent", adminPortal: "Admin Portal",
            appSubtitle: "AI Career Guidance Assistant — Powered by Sree",
            welcome: role => `Welcome, ${role}!`,
            welcomeIntro: "Navigating entrance exams and career choices after Class 12 made easy. Choose how you would like to proceed today:",
            path1: "Path 1: Finalized Entrance Selection", path2: "Path 2: Undecided / Career Guidance",
            examPrompt: "I Know Which Entrance Exam I Want to Pursue",
            examDescription: "If you have already decided on an entrance exam, select it from the dropdown list below to view the explainer video briefing and ask any queries to the AI assistant.",
            guidancePrompt: "Help Me Choose the Right Entrance Exam & Career Path",
            guidanceDescription: "Not sure which entrance exam suits your academic background and interests? Upload your marksheet or fill in your subject marks below so our AI Assistant can analyze your profile and recommend suitable entrance exams.",
            uploadProfile: "1. Upload Marksheet or Enter Profile", recommendations: "2. AI Entrance Recommendations",
            assistant: "Sree", askAbout: "Ask Queries About", send: "Send", listen: "Listen", you: "You",
            askSreeNav: "Ask Sree AI (Type / Voice)",
            landingAskTitle: "Ask Sree AI Any Entrance Exam Question",
            landingAskSubtitle: "Type your query directly below (no microphone needed!) or click the microphone to speak. Sree searches official brochures for JEE, NEET, KEAM, CUET, and career roadmaps.",
            typePlaceholder: "Type your query here (e.g. eligibility criteria, cutoffs, syllabus, rank formula)...",
            askSreeBtn: "Ask Sree",
            noMicRequired: "Microphone NOT required",
            typing: exam => `Searching ingested brochures for ${exam || "exam"}...`,
            greeting: exam => `Have further questions after reviewing the video briefing for ${exam}? Ask Sree anything about eligibility criteria, subject weightage, seat allocation, or rank calculation!`,
            languageName: "English"
        },
        "hi-IN": {
            portalSubtitle: "कक्षा 12 के बाद AI करियर मार्गदर्शन और प्रवेश परीक्षा सहायक",
            studentLogin: "विद्यार्थी लॉगिन", parentLogin: "अभिभावक लॉगिन", adminLogin: "व्यवस्थापक / प्रोग्रामर",
            studentDescription: "प्रवेश परीक्षाएं देखें, वीडियो जानकारी प्राप्त करें और करियर के लिए AI से बात करें।",
            parentDescription: "पात्रता, कॉलेज शुल्क और अपने बच्चे के लिए मार्गदर्शन देखें।",
            adminDescription: "आधिकारिक प्रवेश PDF और ब्रोशर अपलोड करें तथा ज्ञान आधार प्रबंधित करें।",
            continueStudent: "विद्यार्थी के रूप में जारी रखें", continueParent: "अभिभावक के रूप में जारी रखें", adminPortal: "व्यवस्थापक पोर्टल",
            appSubtitle: "AI करियर मार्गदर्शन सहायक — Sree",
            welcome: role => `स्वागत है, ${role}!`,
            welcomeIntro: "कक्षा 12 के बाद प्रवेश परीक्षाओं और करियर विकल्पों को आसान बनाएं। आज आगे बढ़ने का तरीका चुनें:",
            path1: "मार्ग 1: प्रवेश परीक्षा तय है", path2: "मार्ग 2: करियर मार्गदर्शन",
            examPrompt: "मुझे पता है कि मुझे कौन सी प्रवेश परीक्षा देनी है",
            examDescription: "अपनी परीक्षा चुनें और वीडियो जानकारी देखें तथा AI सहायक से प्रश्न पूछें।",
            guidancePrompt: "सही प्रवेश परीक्षा और करियर चुनने में मदद करें",
            guidanceDescription: "अपनी अंकतालिका अपलोड करें या अंक भरें ताकि AI सहायक आपके लिए उपयुक्त परीक्षाओं की सिफारिश कर सके।",
            uploadProfile: "1. अंकतालिका अपलोड करें या प्रोफ़ाइल भरें", recommendations: "2. AI प्रवेश परीक्षा सिफारिशें",
            assistant: "Sree", askAbout: "इसके बारे में प्रश्न पूछें", send: "भेजें", listen: "सुनें", you: "आप",
            askSreeNav: "Sree AI से पूछें (टाइप / आवाज़)",
            landingAskTitle: "Sree AI से प्रवेश परीक्षा से जुड़ा कोई भी प्रश्न पूछें",
            landingAskSubtitle: "नीचे सीधे अपना प्रश्न टाइप करें (माइक की आवश्यकता नहीं!) या बोलने के लिए माइक पर क्लिक करें।",
            typePlaceholder: "अपना प्रश्न यहाँ टाइप करें (उदा. पात्रता, कटऑफ, पाठ्यक्रम, रैंक फॉर्मूला)...",
            askSreeBtn: "Sree से पूछें",
            noMicRequired: "माइक की आवश्यकता नहीं है",
            typing: exam => `${exam || "परीक्षा"} के आधिकारिक ब्रोशर खोजे जा रहे हैं...`,
            greeting: exam => `${exam} के बारे में और प्रश्न हैं? Sree से पात्रता, विषय भार, सीट आवंटन या रैंक गणना के बारे में पूछें!`,
            languageName: "हिंदी"
        },
        "ml-IN": {
            portalSubtitle: "പ്ലസ് ടുവിന് ശേഷമുള്ള AI കരിയര്‍ മാര്‍ഗ്ഗനിര്‍ദ്ദേശവും പ്രവേശന പരീക്ഷാ സഹായിയും",
            studentLogin: "വിദ്യാര്‍ത്ഥി ലോഗിന്‍", parentLogin: "രക്ഷിതാക്കളുടെ ലോഗിന്‍", adminLogin: "അഡ്മിന്‍ / പ്രോഗ്രാമര്‍",
            studentDescription: "പ്രവേശന പരീക്ഷകള്‍ കണ്ടെത്തുകയും AI-യുമായി കരിയര്‍ ചര്‍ച്ച ചെയ്യുകയും ചെയ്യുക.",
            parentDescription: "യോഗ്യതയും കോളേജ് ഫീസ് വിവരങ്ങളും പരിശോധിക്കുക.",
            adminDescription: "ഔദ്യോഗിക പ്രവേശന PDF-കളും ബ്രോഷറുകളും അപ്‌ലോഡ് ചെയ്യുക.",
            continueStudent: "വിദ്യാര്‍ത്ഥിയായി തുടരുക", continueParent: "രക്ഷിതാവായി തുടരുക", adminPortal: "അഡ്മിന്‍ പോര്‍ട്ടല്‍",
            appSubtitle: "AI കരിയര്‍ മാര്‍ഗ്ഗനിര്‍ദ്ദേശ സഹായി — Sree",
            welcome: role => `സ്വാഗതം, ${role}!`,
            welcomeIntro: "പ്രവേശന പരീക്ഷകളും കരിയര്‍ തിരഞ്ഞെടുപ്പുകളും എളുപ്പമാക്കാം.",
            path1: "വഴി 1: പ്രവേശന പരീക്ഷ തിരഞ്ഞെടുത്തു", path2: "വഴി 2: കരിയര്‍ മാര്‍ഗ്ഗനിര്‍ദ്ദേശം",
            examPrompt: "എനിക്ക് തിരഞ്ഞെടുക്കേണ്ട പ്രവേശന പരീക്ഷ അറിയാം",
            examDescription: "ഒരു പരീക്ഷ തിരഞ്ഞെടുത്ത് വീഡിയോ വിവരങ്ങളും AI സഹായവും നേടുക.",
            guidancePrompt: "ശരിയായ പ്രവേശന പരീക്ഷയും കരിയറും തിരഞ്ഞെടുക്കാന്‍ സഹായിക്കുക",
            guidanceDescription: "നിങ്ങളുടെ മാര്‍ക്ക് ലിസ്റ്റ് അപ്‌ലോഡ് ചെയ്യുകയോ മാര്‍ക്കുകള്‍ നല്‍കുകയോ ചെയ്യുക.",
            uploadProfile: "1. മാര്‍ക്ക് ലിസ്റ്റ് അപ്‌ലോഡ് ചെയ്യുക അല്ലെങ്കില്‍ പ്രൊഫൈല്‍ നല്‍കുക", recommendations: "2. AI പ്രവേശന ശുപാര്‍ശകള്‍",
            assistant: "Sree", askAbout: "ഇതിനെക്കുറിച്ച് ചോദിക്കുക", send: "അയയ്ക്കുക", listen: "കേള്‍ക്കുക", you: "നിങ്ങള്‍",
            askSreeNav: "Sree AI-യോട് ചോദിക്കുക (ടൈപ്പ് / വോയ്‌സ്)",
            landingAskTitle: "പ്രവേശന പരീക്ഷകളെക്കുറിച്ച് Sree AI-യോട് ചോദിക്കുക",
            landingAskSubtitle: "മൈക്രോഫോൺ ആവശ്യമില്ലാതെ താഴെ ചോദ്യം നേരിട്ട് ടൈപ്പ് ചെയ്യുക, അല്ലെങ്കിൽ സംസാരിക്കാൻ മൈക്കിൽ ക്ലിക്ക് ചെയ്യുക.",
            typePlaceholder: "ചോദ്യം ഇവിടെ ടൈപ്പ് ചെയ്യുക (ഉദാ: യോഗ്യത, റാങ്ക് ഫോർമുല, കട്ട് ഓഫ്)...",
            askSreeBtn: "ചോദിക്കുക",
            noMicRequired: "മൈക്രോഫോൺ ആവശ്യമില്ല",
            typing: exam => `${exam || "പരീക്ഷ"}യുടെ ഔദ്യോഗിക ബ്രോഷറുകള്‍ തിരയുന്നു...`,
            greeting: exam => `${exam}യെക്കുറിച്ച് കൂടുതല്‍ ചോദ്യങ്ങളുണ്ടോ? യോഗ്യത, സീറ്റ് അലോട്ട്മെന്റ്, റാങ്ക് കണക്കാക്കല്‍ എന്നിവ Sree-യോട് ചോദിക്കാം!`,
            languageName: "മലയാളം"
        },
        "ta-IN": {
            portalSubtitle: "12ஆம் வகுப்புக்குப் பிறகு AI தொழில் வழிகாட்டி மற்றும் நுழைவுத் தேர்வு உதவி",
            studentLogin: "மாணவர் உள்நுழைவு", parentLogin: "பெற்றோர் உள்நுழைவு", adminLogin: "நிர்வாகி / நிரலாளர்",
            studentDescription: "நுழைவுத் தேர்வுகளை ஆராய்ந்து AI-யிடம் தொழில் வழிகாட்டுதலைப் பெறுங்கள்.",
            parentDescription: "தகுதி மற்றும் கல்லூரி கட்டணத் தகவல்களைப் பாருங்கள்.",
            adminDescription: "அதிகாரப்பூர்வ நுழைவுத் தேர்வு PDF-களைப் பதிவேற்றுங்கள்.",
            continueStudent: "மாணவராகத் தொடர்க", continueParent: "பெற்றோராகத் தொடர்க", adminPortal: "நிர்வாகி போர்டல்",
            appSubtitle: "AI தொழில் வழிகாட்டி — Sree",
            welcome: role => `வரவேற்கிறோம், ${role}!`,
            welcomeIntro: "நுழைவுத் தேர்வுகளையும் தொழில் தேர்வுகளையும் எளிதாக்குங்கள்.",
            path1: "வழி 1: நுழைவுத் தேர்வு முடிவு செய்யப்பட்டது", path2: "வழி 2: தொழில் வழிகாட்டுதல்",
            examPrompt: "எந்த நுழைவுத் தேர்வை எழுத வேண்டும் என்று எனக்குத் தெரியும்",
            examDescription: "தேர்வைத் தேர்ந்தெடுத்து வீடியோ விளக்கத்தையும் AI உதவியையும் பெறுங்கள்.",
            guidancePrompt: "சரியான நுழைவுத் தேர்வு மற்றும் தொழிலைத் தேர்ந்தெடுக்க உதவுங்கள்",
            guidanceDescription: "மதிப்பெண் பட்டியலைப் பதிவேற்றுங்கள் அல்லது மதிப்பெண்களை உள்ளிடுங்கள்.",
            uploadProfile: "1. மதிப்பெண் பட்டியலைப் பதிவேற்றவும் அல்லது சுயவிவரம் உள்ளிடவும்", recommendations: "2. AI நுழைவுத் தேர்வு பரிந்துரைகள்",
            assistant: "Sree", askAbout: "இதுபற்றி கேளுங்கள்", send: "அனுப்பு", listen: "கேளுங்கள்", you: "நீங்கள்",
            askSreeNav: "Sree AI-யிடம் கேளுங்கள் (டைப் / வாய்ஸ்)",
            landingAskTitle: "நுழைவுத் தேர்வுகள் பற்றி Sree AI-யிடம் கேளுங்கள்",
            landingAskSubtitle: "மைக்ரோஃபோன் தேவையில்லாமல் கீழே உங்கள் கேள்வியை நேரடியாக தட்டச்சு செய்யுங்கள் அல்லது பேச மைக்கை கிளிக் செய்யுங்கள்.",
            typePlaceholder: "உங்கள் கேள்வியை இங்கே தட்டச்சு செய்யவும்...",
            askSreeBtn: "கேளுங்கள்",
            noMicRequired: "மைக்ரோஃபோன் தேவையில்லை",
            typing: exam => `${exam || "தேர்வு"} அதிகாரப்பூர்வ விளக்கங்கள் தேடப்படுகின்றன...`,
            greeting: exam => `${exam} பற்றி மேலும் கேள்விகள் உள்ளதா? Sree-யிடம் தகுதி, இட ஒதுக்கீடு அல்லது தரவரிசை பற்றி கேளுங்கள்!`,
            languageName: "தமிழ்"
        },
        "te-IN": {
            portalSubtitle: "12వ తరగతి తర్వాత AI కెరీర్ మార్గదర్శకం మరియు ప్రవేశ పరీక్ష సహాయకుడు",
            studentLogin: "విద్యార్థి లాగిన్", parentLogin: "తల్లిదండ్రుల లాగిన్", adminLogin: "అడ్మిన్ / ప్రోగ్రామర్",
            studentDescription: "ప్రవేశ పరీక్షలను అన్వేషించి AIతో కెరీర్ మార్గదర్శకం పొందండి.",
            parentDescription: "అర్హత మరియు కళాశాల ఫీజు వివరాలను చూడండి.",
            adminDescription: "అధికారిక ప్రవేశ పరీక్ష PDFలను అప్‌లోడ్ చేయండి.",
            continueStudent: "విద్యార్థిగా కొనసాగండి", continueParent: "తల్లిదండ్రిగా కొనసాగండి", adminPortal: "అడ్మిన్ పోర్టల్",
            appSubtitle: "AI కెరీర్ మార్గదర్శక సహాయకుడు — Sree",
            welcome: role => `స్వాగతం, ${role}!`,
            welcomeIntro: "ప్రవేశ పరీక్షలు మరియు కెరీర్ ఎంపికలను సులభం చేసుకోండి.",
            path1: "మార్గం 1: ప్రవేశ పరీక్ష నిర్ణయించబడింది", path2: "మార్గం 2: కెరీర్ మార్గదర్శకం",
            examPrompt: "ఏ ప్రవేశ పరీక్ష రాయాలో నాకు తెలుసు",
            examDescription: "పరీక్షను ఎంచుకుని వీడియో వివరణ మరియు AI సహాయం పొందండి.",
            guidancePrompt: "సరైన ప్రవేశ పరీక్ష మరియు కెరీర్‌ను ఎంచుకోవడానికి సహాయం చేయండి",
            guidanceDescription: "మీ మార్కుల పట్టికను అప్‌లోడ్ చేయండి లేదా మార్కులను నమోదు చేయండి.",
            uploadProfile: "1. మార్కుల పట్టికను అప్‌లోడ్ చేయండి లేదా ప్రొఫైల్ నమోదు చేయండి", recommendations: "2. AI ప్రవేశ పరీక్ష సిఫార్సులు",
            assistant: "Sree", askAbout: "దీని గురించి ప్రశ్నలు అడగండి", send: "పంపండి", listen: "వినండి", you: "మీరు",
            askSreeNav: "Sree AIని అడగండి (టైప్ / వాయిస్)",
            landingAskTitle: "ప్రవేశ పరీక్షల గురించి Sree AIని అడగండి",
            landingAskSubtitle: "మైక్రోఫోన్ అవసరం లేకుండా నేరుగా కింద మీ ప్రశ్నను టైప్ చేయండి లేదా మాట్లాడటానికి మైక్ క్లిక్ చేయండి.",
            typePlaceholder: "మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి...",
            askSreeBtn: "అడగండి",
            noMicRequired: "మైక్రోఫోన్ అవసరం లేదు",
            typing: exam => `${exam || "పరీక్ష"} అధికారిక బ్రోచర్లను వెతుకుతున్నాము...`,
            greeting: exam => `${exam} గురించి మరిన్ని ప్రశ్నలు ఉన్నాయా? Sreeని అర్హత, సీట్ల కేటాయింపు లేదా ర్యాంక్ గురించి అడగండి!`,
            languageName: "తెలుగు"
        }
    };

    function t(key, ...args) {
        const value = (UI_TRANSLATIONS[currentLanguage] || UI_TRANSLATIONS["en-IN"])[key];
        return typeof value === "function" ? value(...args) : (value || key);
    }

    function applyLanguage() {
        const selectors = {
            ".portal-subtitle": "portalSubtitle", ".app-subtitle": "appSubtitle", ".hero-welcome p": "welcomeIntro",
            "#loginScreen .role-card:nth-child(1) h3": "studentLogin", "#loginScreen .role-card:nth-child(2) h3": "parentLogin", "#loginScreen .role-card:nth-child(3) h3": "adminLogin",
            "#loginScreen .role-card:nth-child(1) p": "studentDescription", "#loginScreen .role-card:nth-child(2) p": "parentDescription", "#loginScreen .role-card:nth-child(3) p": "adminDescription",
            "#loginScreen .role-card:nth-child(1) button": "continueStudent", "#loginScreen .role-card:nth-child(2) button": "continueParent", "#loginScreen .role-card:nth-child(3) button": "adminPortal",
            ".pathway-section:nth-child(2) .section-badge": "path1", ".pathway-section:nth-child(3) .section-badge": "path2", ".pathway-section:nth-child(2) h3": "examPrompt", ".pathway-section:nth-child(2) .section-header-box p": "examDescription",
            ".pathway-section:nth-child(3) h3": "guidancePrompt", ".pathway-section:nth-child(3) .section-header-box p": "guidanceDescription", ".input-card h4": "uploadProfile", ".output-card h4": "recommendations",
            ".send-btn span": "send",
            "#navAskSreeLabel": "askSreeNav",
            "#landingAskSreeTitle": "landingAskTitle",
            "#landingAskSreeSubtitle": "landingAskSubtitle",
            "#landingSendBtn span": "askSreeBtn",
            "#captionNoMicLabel": "noMicRequired"
        };
        Object.entries(selectors).forEach(([selector, key]) => {
            const element = document.querySelector(selector);
            if (element) element.textContent = t(key);
        });
        const landingInput = document.getElementById("landingQueryInput");
        if (landingInput) landingInput.placeholder = t("typePlaceholder");
        const sreeInput = document.getElementById("sreeTypedInput");
        if (sreeInput) sreeInput.placeholder = t("typePlaceholder");
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

    const SUMMARY_LABEL_TRANSLATIONS = {
        "hi-IN": {
            "Conducting Body": "आयोजक संस्था", "Eligibility": "पात्रता", "Exam Pattern": "परीक्षा पैटर्न",
            "Top Career Streams": "प्रमुख करियर क्षेत्र", "Top Courses": "प्रमुख पाठ्यक्रम", "Sections": "खंड",
            "Target Colleges": "लक्षित कॉलेज", "Rank Formula": "रैंक फॉर्मूला", "Process": "प्रक्रिया",
            "NATA": "NATA", "NIFT": "NIFT"
        },
        "ml-IN": {
            "Conducting Body": "നടത്തുന്ന സ്ഥാപനം", "Eligibility": "യോഗ്യത", "Exam Pattern": "പരീക്ഷാ രീതി",
            "Top Career Streams": "പ്രധാന കരിയർ മേഖലകൾ", "Top Courses": "പ്രധാന കോഴ്സുകൾ", "Sections": "വിഭാഗങ്ങൾ",
            "Target Colleges": "ലക്ഷ്യ കോളേജുകൾ", "Rank Formula": "റാങ്ക് ഫോർമുല", "Process": "പ്രക്രിയ",
            "NATA": "NATA", "NIFT": "NIFT"
        },
        "ta-IN": {
            "Conducting Body": "நடத்தும் நிறுவனம்", "Eligibility": "தகுதி", "Exam Pattern": "தேர்வு முறை",
            "Top Career Streams": "முக்கிய துறைகள்", "Top Courses": "முக்கிய படிப்புகள்", "Sections": "பிரிவுகள்",
            "Target Colleges": "இலக்கு கல்லூரிகள்", "Rank Formula": "தரவரிசை முறை", "Process": "செயல்முறை",
            "NATA": "NATA", "NIFT": "NIFT"
        },
        "te-IN": {
            "Conducting Body": "నిర్వహణ సంస్థ", "Eligibility": "అర్హత", "Exam Pattern": "పరీక్షా విధానం",
            "Top Career Streams": "ప్రధాన కెరీర్ రంగాలు", "Top Courses": "ప్రధాన కోర్సులు", "Sections": "విభాగాలు",
            "Target Colleges": "లక్ష్య కళాశాలలు", "Rank Formula": "ర్యాంక్ ఫార్ములా", "Process": "ప్రక్రియ",
            "NATA": "NATA", "NIFT": "NIFT"
        }
    };

    function getExamSummary(examName) {
        const info = EXAM_SUMMARIES[examName];
        if (!info) return `<p>Official information extracted from ingested brochures.</p>`;

        let summaryHtml = info.summaryHtml;
        const translations = SUMMARY_LABEL_TRANSLATIONS[currentLanguage];
        if (translations) {
            Object.entries(translations).forEach(([englishLabel, translatedLabel]) => {
                summaryHtml = summaryHtml.replaceAll(`<strong>${englishLabel}:</strong>`, `<strong>${translatedLabel}:</strong>`);
            });
        }
        return summaryHtml;
    }

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
    const loginLanguageSelect = document.getElementById("loginLanguageSelect");
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
    // 1. AUTHENTICATION & CHAT HISTORY SIDEBAR LOGIC
    // -------------------------------------------------------------
    // Auth Tabs Switching
    const tabAuthLogin = document.getElementById("tabAuthLogin");
    const tabAuthRegister = document.getElementById("tabAuthRegister");
    const tabAuthGuest = document.getElementById("tabAuthGuest");
    const authLoginForm = document.getElementById("authLoginForm");
    const authRegisterForm = document.getElementById("authRegisterForm");
    const authGuestForm = document.getElementById("authGuestForm");

    const loginUserForm = document.getElementById("loginUserForm");
    const registerUserForm = document.getElementById("registerUserForm");
    const loginStatusMessage = document.getElementById("loginStatusMessage");
    const registerStatusMessage = document.getElementById("registerStatusMessage");

    // History Sidebar Elements
    const chatHistorySidebar = document.getElementById("chatHistorySidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const toggleHistorySidebarBtn = document.getElementById("toggleHistorySidebarBtn");
    const closeSidebarBtn = document.getElementById("closeSidebarBtn");
    const newChatSessionBtn = document.getElementById("newChatSessionBtn");
    const historyTopicsList = document.getElementById("historyTopicsList");
    const sidebarUserName = document.getElementById("sidebarUserName");
    const sidebarUserRole = document.getElementById("sidebarUserRole");
    const sidebarAvatarCircle = document.getElementById("sidebarAvatarCircle");

    if (tabAuthLogin && tabAuthRegister && tabAuthGuest) {
        tabAuthLogin.addEventListener("click", () => switchAuthTab("login"));
        tabAuthRegister.addEventListener("click", () => switchAuthTab("register"));
        tabAuthGuest.addEventListener("click", () => switchAuthTab("guest"));
    }

    function switchAuthTab(tab) {
        [tabAuthLogin, tabAuthRegister, tabAuthGuest].forEach(t => t.classList.remove("active"));
        [authLoginForm, authRegisterForm, authGuestForm].forEach(f => f.classList.add("hidden"));

        if (tab === "login") {
            tabAuthLogin.classList.add("active");
            authLoginForm.classList.remove("hidden");
        } else if (tab === "register") {
            tabAuthRegister.classList.add("active");
            authRegisterForm.classList.remove("hidden");
        } else if (tab === "guest") {
            tabAuthGuest.classList.add("active");
            authGuestForm.classList.remove("hidden");
        }
    }

    // Register Form Handler
    if (registerUserForm) {
        registerUserForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fullName = document.getElementById("regFullName").value.trim();
            const email = document.getElementById("regEmail").value.trim();
            const password = document.getElementById("regPassword").value;
            const role = document.getElementById("regRole").value;
            const stream = document.getElementById("regStream").value;

            showAuthStatus(registerStatusMessage, "Creating account and initializing profile...", "info");

            try {
                const res = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: email,
                        password: password,
                        full_name: fullName,
                        role: role,
                        profile: { stream: stream }
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    showAuthStatus(registerStatusMessage, "Account created successfully! Logging you in...", "success");
                    onUserAuthenticated(data.user);
                } else {
                    showAuthStatus(registerStatusMessage, data.detail || "Registration failed.", "error");
                }
            } catch (err) {
                showAuthStatus(registerStatusMessage, "Server connection error. Please try again.", "error");
            }
        });
    }

    // Login Form Handler
    if (loginUserForm) {
        loginUserForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value;

            showAuthStatus(loginStatusMessage, "Logging in to your profile...", "info");

            try {
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: email, password: password })
                });

                const data = await res.json();
                if (res.ok) {
                    showAuthStatus(loginStatusMessage, "Login successful!", "success");
                    onUserAuthenticated(data.user);
                } else {
                    showAuthStatus(loginStatusMessage, data.detail || "Invalid email or password.", "error");
                }
            } catch (err) {
                showAuthStatus(loginStatusMessage, "Server connection error. Please try again.", "error");
            }
        });
    }

    function showAuthStatus(element, message, type) {
        if (!element) return;
        element.textContent = message;
        element.className = `auth-status-msg ${type}`;
        element.classList.remove("hidden");
    }

    // Auto Check Token on Load
    async function checkStoredAuth() {
        if (!authToken) return;
        try {
            const res = await fetch("/api/auth/me", {
                headers: { "X-User-Token": authToken }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.user) {
                    onUserAuthenticated(data.user, false);
                }
            } else {
                // Token expired/invalid
                localStorage.removeItem("entrance_sahaayi_token");
                authToken = null;
            }
        } catch (e) {
            console.log("Offline or server initializing...");
        }
    }

    function onUserAuthenticated(user, autoNavigate = true) {
        currentUser = user;
        authToken = user.token;
        currentUserRole = user.role || "Student";
        localStorage.setItem("entrance_sahaayi_token", authToken);

        // Update UI Badges & Sidebar Profile Summary
        activeRoleBadge.innerHTML = `<i class="fa-solid fa-user-check"></i> ${user.full_name} (${user.role})`;
        welcomeHeading.textContent = `Welcome back, ${user.full_name.split(" ")[0]}! 👋`;

        if (sidebarUserName) sidebarUserName.textContent = user.full_name;
        if (sidebarUserRole) sidebarUserRole.textContent = `${user.role} Profile`;
        if (sidebarAvatarCircle) {
            const initials = user.full_name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
            sidebarAvatarCircle.textContent = initials || "U";
        }

        // Fetch User Saved Topics & History
        fetchUserSessions();

        if (autoNavigate) {
            switchScreen(landingScreen);
        }
        applyLanguage();
    }

    // Role Cards for Guest Mode & Admin Portal
    document.querySelectorAll(".role-card").forEach(card => {
        card.addEventListener("click", () => {
            const role = card.dataset.role;
            if (role === "Admin") {
                adminPasscodeModal.classList.remove("hidden");
                adminPasscodeInput.value = "";
                adminPasscodeInput.focus();
            } else {
                loginUserGuest(role);
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
            loginUserGuest("Admin");
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

    function loginUserGuest(role) {
        currentUserRole = role;
        currentUser = null;
        activeRoleBadge.innerHTML = `<i class="fa-solid fa-user"></i> ${role} Guest`;
        welcomeHeading.textContent = `Welcome, ${role}! 👋`;
        if (sidebarUserName) sidebarUserName.textContent = "Guest User";
        if (sidebarUserRole) sidebarUserRole.textContent = `${role} Mode (Not saved)`;
        if (sidebarAvatarCircle) sidebarAvatarCircle.textContent = "G";

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
        currentUser = null;
        currentUserRole = null;
        authToken = null;
        currentSessionId = null;
        userSessions = [];
        localStorage.removeItem("entrance_sahaayi_token");
        document.body.classList.remove("admin-mode");
        if (historyTopicsList) historyTopicsList.innerHTML = `<div class="empty-history-text">Log in to save and resume your conversation topics across sessions.</div>`;
        switchScreen(loginScreen);
    });

    adminPanelBtn.addEventListener("click", () => {
        fetchDBStats();
        switchScreen(adminScreen);
    });

    function switchScreen(targetScreen) {
        [loginScreen, landingScreen, examDetailScreen, adminScreen].forEach(s => s.classList.add("hidden"));
        targetScreen.classList.remove("hidden");
        window.scrollTo(0, 0);

        // Automatically stop active conversation & readout when user returns to original landing page
        if (targetScreen === landingScreen || targetScreen === loginScreen) {
            stopActiveSreeConversation();
        }
    }

    function stopActiveSreeConversation() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        isSreeListeningForQuery = false;
        if (typeof sreeQueryTimeout !== 'undefined' && sreeQueryTimeout) {
            clearTimeout(sreeQueryTimeout);
            sreeQueryTimeout = null;
        }
        if (typeof closeSreeOverlay === 'function') {
            closeSreeOverlay();
        }
        if (typeof updateSreeStatus === 'function') {
            updateSreeStatus(`Listening for <strong>"Hey Sree"</strong>...`);
        }
    }

    // -------------------------------------------------------------
    // CHAT HISTORY & TOPICS SIDEBAR FUNCTIONS (ChatGPT / Gemini style)
    // -------------------------------------------------------------
    if (toggleHistorySidebarBtn) {
        toggleHistorySidebarBtn.addEventListener("click", () => {
            chatHistorySidebar.classList.add("open");
            sidebarOverlay.classList.add("active");
            if (currentUser) fetchUserSessions();
        });
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener("click", closeSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", closeSidebar);
    }

    function closeSidebar() {
        if (chatHistorySidebar) chatHistorySidebar.classList.remove("open");
        if (sidebarOverlay) sidebarOverlay.classList.remove("active");
    }

    if (newChatSessionBtn) {
        newChatSessionBtn.addEventListener("click", () => {
            startNewChatTopic();
            closeSidebar();
        });
    }

    function startNewChatTopic() {
        currentSessionId = null;
        currentExamContext = null;
        examChatHistory.innerHTML = `
            <div class="message bot-message">
                <div class="avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="message-content">
                    <div class="sender-name">Entrance Sahaayi ${t("assistant")} (${currentUserRole || 'Student'} Mode)</div>
                    <p>Started a new topic! Ask me anything about entrance exams, eligibility criteria, subject weightage, seat allocation, or career guidance.</p>
                </div>
            </div>
        `;
        renderHistorySessionsList();
    }

    async function fetchUserSessions() {
        if (!authToken) {
            if (historyTopicsList) {
                historyTopicsList.innerHTML = `<div class="empty-history-text"><i class="fa-solid fa-lock"></i><br>Log in to view your saved topics and chat history like ChatGPT & Gemini!</div>`;
            }
            return;
        }

        try {
            const res = await fetch("/api/chat/sessions", {
                headers: { "X-User-Token": authToken }
            });
            if (res.ok) {
                const data = await res.json();
                userSessions = data.sessions || [];
                renderHistorySessionsList();
            }
        } catch (e) {
            console.error("Error fetching sessions:", e);
        }
    }

    function renderHistorySessionsList() {
        if (!historyTopicsList) return;
        if (!authToken) {
            historyTopicsList.innerHTML = `<div class="empty-history-text"><i class="fa-solid fa-lock"></i><br>Log in to save and resume your conversation topics across sessions!</div>`;
            return;
        }
        if (userSessions.length === 0) {
            historyTopicsList.innerHTML = `<div class="empty-history-text"><i class="fa-solid fa-comments"></i><br>No saved chat topics yet.<br>Click "+ New Chat Topic" to start one!</div>`;
            return;
        }

        historyTopicsList.innerHTML = "";
        userSessions.forEach(sess => {
            const item = document.createElement("div");
            item.className = `topic-item ${sess.id === currentSessionId ? "active" : ""}`;
            
            const timeFormatted = new Date(sess.updated_at || sess.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            item.innerHTML = `
                <div class="topic-main-info" onclick="selectChatSession('${sess.id}')">
                    <i class="fa-solid fa-message topic-icon"></i>
                    <div class="topic-text-group">
                        <span class="topic-title-text" title="${escapeQuotes(sess.title)}">${sess.title}</span>
                        <span class="topic-time-sub">${sess.exam_context ? sess.exam_context + ' • ' : ''}${timeFormatted}</span>
                    </div>
                </div>
                <div class="topic-actions">
                    <button class="btn-topic-action" onclick="event.stopPropagation(); renameTopicSession('${sess.id}', '${escapeQuotes(sess.title)}')" title="Rename Topic"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-topic-action delete" onclick="event.stopPropagation(); deleteTopicSession('${sess.id}')" title="Delete Topic"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
            historyTopicsList.appendChild(item);
        });
    }

    window.selectChatSession = async function(sessionId) {
        if (!authToken) return;
        try {
            const res = await fetch(`/api/chat/sessions/${sessionId}`, {
                headers: { "X-User-Token": authToken }
            });

            if (res.ok) {
                const data = await res.json();
                const session = data.session;
                currentSessionId = session.id;
                currentExamContext = session.exam_context;

                // Render session messages into chat screen
                examChatHistory.innerHTML = "";
                if (session.messages && session.messages.length > 0) {
                    session.messages.forEach(msg => {
                        appendMessage(msg.sender, msg.content, session.persona || currentUserRole, msg.sources, msg.confidence, msg.is_faq);
                    });
                } else {
                    appendMessage("bot", `Resuming topic: "${session.title}". Ask your follow-up questions!`, currentUserRole);
                }

                // If session is tied to specific exam, update UI header labels
                if (currentExamContext && EXAM_SUMMARIES[currentExamContext]) {
                    detailExamTitle.textContent = currentExamContext;
                    detailExamStream.textContent = EXAM_SUMMARIES[currentExamContext].stream;
                    chatExamContextName.textContent = currentExamContext;
                    examSummaryBody.innerHTML = getExamSummary(currentExamContext);
                } else {
                    detailExamTitle.textContent = session.title;
                    detailExamStream.textContent = "AI Guidance Topic";
                    chatExamContextName.textContent = session.title;
                }

                renderHistorySessionsList();
                closeSidebar();
                switchScreen(examDetailScreen);
            }
        } catch (e) {
            console.error("Error loading chat session:", e);
        }
    };

    window.renameTopicSession = async function(sessionId, oldTitle) {
        const newTitle = prompt("Enter new title for this topic:", oldTitle);
        if (!newTitle || !newTitle.trim()) return;

        try {
            const res = await fetch(`/api/chat/sessions/${sessionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "X-User-Token": authToken },
                body: JSON.stringify({ title: newTitle.trim() })
            });

            if (res.ok) {
                fetchUserSessions();
            }
        } catch (e) {
            console.error("Failed to rename session:", e);
        }
    };

    window.deleteTopicSession = async function(sessionId) {
        if (!confirm("Are you sure you want to delete this conversation topic?")) return;

        try {
            const res = await fetch(`/api/chat/sessions/${sessionId}`, {
                method: "DELETE",
                headers: { "X-User-Token": authToken }
            });

            if (res.ok) {
                if (currentSessionId === sessionId) {
                    startNewChatTopic();
                }
                fetchUserSessions();
            }
        } catch (e) {
            console.error("Failed to delete session:", e);
        }
    };

    checkStoredAuth();


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
        examSummaryBody.innerHTML = getExamSummary(examName);
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

        const headers = { "Content-Type": "application/json" };
        if (authToken) {
            headers["X-User-Token"] = authToken;
        }

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    query: query,
                    persona: currentUserRole || "Student",
                    exam_context: currentExamContext,
                    language: currentLanguage,
                    session_id: currentSessionId
                })
            });

            const data = await res.json();
            typingElem.remove();

            if (res.ok) {
                appendMessage("bot", data.answer, currentUserRole, data.sources, data.confidence, data.is_faq_short_circuit);
                if (data.session_id) {
                    currentSessionId = data.session_id;
                    if (authToken) fetchUserSessions();
                }

                // Hands-Free Auto Read-Out for "Hey Sree" Mode
                if (isWakeWordMode) {
                    const lastMsg = examChatHistory.lastElementChild;
                    if (lastMsg) {
                        const playBtn = lastMsg.querySelector(".audio-play-btn");
                        if (playBtn) {
                            setTimeout(() => speakText(data.answer, playBtn), 200);
                        }
                    }
                }
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
        const senderLabel = isBot ? `Sree (${role || 'Student'} Mode)` : t("you");

        let sourcesHtml = "";
        if (isBot && sources && sources.length > 0) {
            const badges = sources.map(s => `<span class="source-badge"><i class="fa-solid fa-file-contract"></i> ${s.source} (${s.relevance}%)</span>`).join("");
            sourcesHtml = `<div class="sources-card"><div><strong>Verified Brochure Citations:</strong></div>${badges}</div>`;
        }

        let audioBtnHtml = "";
        if (isBot) {
            const safeText = escapeQuotes(text);
            audioBtnHtml = `
                <div class="audio-controls" aria-label="Voice response controls">
                    <button class="audio-play-btn" type="button" onclick="speakText(\`${safeText}\`, this)" title="Play or resume response">
                        <i class="fa-solid fa-play"></i> ${t("listen")}
                    </button>
                    <button class="audio-pause-btn" type="button" onclick="pauseSpeech(this)" title="Pause response" disabled>
                        <i class="fa-solid fa-pause"></i> Pause
                    </button>
                    <button class="audio-resume-btn" type="button" onclick="resumeSpeech(this)" title="Resume response" disabled>
                        <i class="fa-solid fa-play"></i> Resume
                    </button>
                    <button class="audio-restart-btn" type="button" onclick="restartSpeech(this, \`${safeText}\`)" title="Play response from beginning">
                        <i class="fa-solid fa-rotate-left"></i> From Beginning
                    </button>
                </div>`;
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

    // -------------------------------------------------------------
    // Hands-Free "Hey Sree" Voice Activation Engine (Siri / Google Assistant Mode)
    // -------------------------------------------------------------
    let isWakeWordMode = false;
    let wakeWordRecognition = null;
    let isRecognitionRunning = false;
    let isSpeaking = false;
    let activeUtterance = null;
    let isSreeListeningForQuery = false;
    let sreeQueryTimeout = null;
    let speechRestartTimeout = null;
    let audioContextInstance = null;

    const navAskSreeBtn = document.getElementById("navAskSreeBtn");
    const navAskSreeLabel = document.getElementById("navAskSreeLabel");
    const wakeWordToggleBtn = document.getElementById("wakeWordToggleBtn");
    const wakeWordBtnLabel = document.getElementById("wakeWordBtnLabel");
    const siriVoiceBanner = document.getElementById("siriVoiceBanner");
    const siriVoiceText = document.getElementById("siriVoiceText");
    const stopSiriVoiceBtn = document.getElementById("stopSiriVoiceBtn");

    const landingQueryForm = document.getElementById("landingQueryForm");
    const landingQueryInput = document.getElementById("landingQueryInput");
    const landingMicBtn = document.getElementById("landingMicBtn");
    const landingSendBtn = document.getElementById("landingSendBtn");
    const landingQueryResponse = document.getElementById("landingQueryResponse");
    const landingUserQueryText = document.getElementById("landingUserQueryText");
    const landingResponseBody = document.getElementById("landingResponseBody");
    const landingResponseSources = document.getElementById("landingResponseSources");
    const landingListenBtn = document.getElementById("landingListenBtn");
    const landingCopyBtn = document.getElementById("landingCopyBtn");
    const landingOpenChatBtn = document.getElementById("landingOpenChatBtn");
    const landingDismissBtn = document.getElementById("landingDismissBtn");

    const sreeFloatingWidget = document.getElementById("sreeFloatingWidget");
    const sreeWidgetStatus = document.getElementById("sreeWidgetStatus");
    const sreeVoiceOverlay = document.getElementById("sreeVoiceOverlay");
    const sreeOverlayStatus = document.getElementById("sreeOverlayStatus");
    const sreeOverlayTranscript = document.getElementById("sreeOverlayTranscript");
    const sreeOverlayCloseBtn = document.getElementById("sreeOverlayCloseBtn");
    const sreeOverlayMuteBtn = document.getElementById("sreeOverlayMuteBtn");
    const sreeMuteBtnLabel = document.getElementById("sreeMuteBtnLabel");
    const sreeClearChatBtn = document.getElementById("sreeClearChatBtn");
    const sreeTypedForm = document.getElementById("sreeTypedForm");
    const sreeTypedInput = document.getElementById("sreeTypedInput");
    const sreeOrbMicBtn = document.getElementById("sreeOrbMicBtn");
    const siriOrbLarge = document.getElementById("siriOrbLarge");
    const micPermissionToast = document.getElementById("micPermissionToast");
    const enableMicBtn = document.getElementById("enableMicBtn");
    const typeInsteadBtn = document.getElementById("typeInsteadBtn");

    const tabSreeType = document.getElementById("tabSreeType");
    const tabSreeVoice = document.getElementById("tabSreeVoice");
    const sreeVoiceModeSection = document.getElementById("sreeVoiceModeSection");
    const sreeTypeModeBanner = document.getElementById("sreeTypeModeBanner");
    const sreeSwitchToTypeBtn = document.getElementById("sreeSwitchToTypeBtn");

    let currentLandingAnswerText = "";
    let currentModalMode = "type"; // "type" or "voice"
    let landingSpeechRec = null;
    let isLandingMicListening = false;

    function playWakeChime() {
        try {
            if (!audioContextInstance) {
                audioContextInstance = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContextInstance.state === 'suspended') {
                audioContextInstance.resume();
            }
            const osc = audioContextInstance.createOscillator();
            const gain = audioContextInstance.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, audioContextInstance.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, audioContextInstance.currentTime + 0.15); // A5
            gain.gain.setValueAtTime(0.2, audioContextInstance.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContextInstance.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(audioContextInstance.destination);
            osc.start();
            osc.stop(audioContextInstance.currentTime + 0.35);
        } catch(e) {
            console.warn("Audio chime play error:", e);
        }
    }

    function getSreeVoiceGreeting() {
        switch (currentLanguage) {
            case "hi-IN":
                return "नमस्ते! मैं Sree हूँ। बताइए मैं आपकी क्या मदद कर सकती हूँ?";
            case "ml-IN":
                return "ഹലോ! ഞാൻ Sree. പറയൂ, ഞാൻ എങ്ങനെ സഹായിക്കണം?";
            case "ta-IN":
                return "வணக்கம்! நான் Sree. சொல்லுங்கள், நான் எவ்வாறு உதவட்டும்?";
            case "te-IN":
                return "నమస్కారం! నేను Sree. చెప్పండి, నేను మీకు ఎలా సహాయపడగలను?";
            default:
                return "Hi there! I am Sree. How can I help you today?";
        }
    }

    function normalizeVoiceText(text) {
        if (!text) return "";
        return text.toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function appendOverlayUserMessage(text) {
        if (!sreeOverlayTranscript) return;
        const hint = sreeOverlayTranscript.querySelector(".sree-placeholder-hint");
        if (hint) hint.remove();

        const bubble = document.createElement("div");
        bubble.className = "sree-bubble sree-bubble-user";
        bubble.innerHTML = `
            <div class="sree-bubble-sender"><i class="fa-solid fa-user"></i> You</div>
            <div class="sree-bubble-text">${escapeQuotes(text)}</div>
        `;
        sreeOverlayTranscript.appendChild(bubble);
        sreeOverlayTranscript.scrollTop = sreeOverlayTranscript.scrollHeight;
    }

    function showOverlayThinking() {
        removeOverlayThinking();
        if (!sreeOverlayTranscript) return;
        const thinking = document.createElement("div");
        thinking.id = "sreeOverlayThinking";
        thinking.className = "sree-bubble sree-bubble-bot sree-bubble-thinking";
        thinking.innerHTML = `
            <div class="sree-bubble-sender"><i class="fa-solid fa-wand-magic-sparkles"></i> Sree AI</div>
            <div class="sree-bubble-text"><i class="fa-solid fa-spinner fa-spin"></i> Sree is analyzing official brochures & preparing your answer...</div>
        `;
        sreeOverlayTranscript.appendChild(thinking);
        sreeOverlayTranscript.scrollTop = sreeOverlayTranscript.scrollHeight;
    }

    function removeOverlayThinking() {
        const thinking = document.getElementById("sreeOverlayThinking");
        if (thinking) thinking.remove();
    }

    function appendOverlayBotMessage(answer, sources) {
        removeOverlayThinking();
        if (!sreeOverlayTranscript) return;

        const bubble = document.createElement("div");
        bubble.className = "sree-bubble sree-bubble-bot";
        let sourcesHtml = "";
        if (sources && Array.isArray(sources) && sources.length > 0) {
            sourcesHtml = `
                <div class="sree-bubble-sources">
                    <i class="fa-solid fa-book-bookmark"></i> Sources:
                    ${sources.map(s => `<span class="sree-bubble-badge">${escapeQuotes(typeof s === 'string' ? s : s.title || s.source || 'Official Brochure')}</span>`).join(' ')}
                </div>
            `;
        }

        bubble.innerHTML = `
            <div class="sree-bubble-sender"><i class="fa-solid fa-wand-magic-sparkles"></i> Sree AI</div>
            <div class="sree-bubble-text">${formatMarkdown(answer)}</div>
            ${sourcesHtml}
        `;
        sreeOverlayTranscript.appendChild(bubble);
        sreeOverlayTranscript.scrollTop = sreeOverlayTranscript.scrollHeight;
    }

    function clearOverlayTranscript() {
        if (!sreeOverlayTranscript) return;
        sreeOverlayTranscript.innerHTML = `
            <div class="sree-placeholder-hint">
                <p style="color:var(--text-muted); font-style:italic;"><i class="fa-solid fa-circle-info"></i> Ask Sree anything about entrance exams (JEE, KEAM, NEET, CUET), eligibility, seat allocation, or rank formulas. Say <strong>"Hey Sree"</strong> or type below:</p>
            </div>
        `;
        if (sreeOverlayStatus) {
            sreeOverlayStatus.innerHTML = isWakeWordMode 
                ? `Listening for <strong>"Hey Sree"</strong> (or type below)... 🎙️`
                : `Sree AI Ready. Say <strong>"Hey Sree"</strong> or type below! 💬`;
        }
    }

    function initWakeWordEngine() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("SpeechRecognition not supported in this browser.");
            if (sreeOverlayStatus) {
                sreeOverlayStatus.innerHTML = `<span style="color:#f59e0b;"><i class="fa-solid fa-keyboard"></i> Voice mic not supported in this browser. Please type your question below! ⌨️</span>`;
            }
            if (wakeWordBtnLabel) wakeWordBtnLabel.textContent = `Type with Sree 💬`;
            return null;
        }

        if (wakeWordRecognition) {
            return wakeWordRecognition;
        }

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = currentLanguage || "en-IN";

        rec.onstart = () => {
            isRecognitionRunning = true;
            console.log("Sree continuous recognition active. Lang:", rec.lang);
            updateVoiceUIState(true);
        };

        rec.onresult = (event) => {
            if (!isWakeWordMode || isSpeaking) return;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const res = event.results[i];
                const rawTranscript = res[0].transcript;
                const clean = normalizeVoiceText(rawTranscript);
                const isFinal = res.isFinal;

                // 1. Wait / Pause commands
                const waitKeywords = ["wait", "hold on", "wait a second", "wait a minute", "just wait", "wait sree", "stop speaking", "pause"];
                const isWaitCommand = waitKeywords.some(kw => clean.includes(kw));
                if (isWaitCommand) {
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    isSpeaking = false;
                    isSreeListeningForQuery = true;
                    if (sreeQueryTimeout) clearTimeout(sreeQueryTimeout);

                    const waitMessage = {
                        "hi-IN": "ठीक है, मैं रुक रही हूँ। जब आप तैयार हों तब बोलिए।",
                        "ml-IN": "ശരി, കാത്തിരിക്കാം. പറയൂ.",
                        "ta-IN": "சரி, காத்திருக்கிறேன். சொல்லுங்கள்.",
                        "te-IN": "సరే, వేచి ఉంటాను. చెప్పండి.",
                        "en-IN": "Okay, waiting for you. Take your time!"
                    }[currentLanguage] || "Okay, waiting for you. Take your time!";

                    openSreeOverlay();
                    updateSreeStatus(`<strong>Sree:</strong> "${waitMessage}" ⏳`);
                    appendOverlayBotMessage(waitMessage, []);

                    speakAssistantVoice(waitMessage, () => {
                        isSreeListeningForQuery = true;
                        updateSreeStatus(`Waiting for you to speak... 🎙️`);
                    });
                    break;
                }

                // 2. Active query listening mode (after greeting was spoken or orb tapped)
                if (isSreeListeningForQuery) {
                    if (clean.length > 2 && isFinal) {
                        clearTimeout(sreeQueryTimeout);
                        isSreeListeningForQuery = false;
                        const userQuery = clean.replace(/^(hey|hi|hello|ok)?\s*(sree|shree|sri|siri|three)?\s*/i, '').trim();
                        if (userQuery.length > 1) {
                            processSreeVoiceQuery(userQuery);
                        } else {
                            processSreeVoiceQuery(clean);
                        }
                        break;
                    }
                    continue;
                }

                // 3. Wake word detection
                const wakeKeywords = [
                    "hey sree", "hi sree", "hello sree", "ok sree",
                    "hey shree", "hi shree", "hello shree", "ok shree",
                    "hey sri", "hi sri", "hello sri", "ok sri",
                    "hey siri", "hi siri", "hello siri",
                    "hey three", "hey 3", "a3",
                    "sree", "shree", "sri", "siri"
                ];

                let matchedKeyword = null;
                let matchIndex = -1;
                for (const kw of wakeKeywords) {
                    const idx = clean.indexOf(kw);
                    if (idx !== -1) {
                        matchedKeyword = kw;
                        matchIndex = idx;
                        break;
                    }
                }

                if (matchedKeyword) {
                    // Extract query if spoken directly after the wake word
                    let queryAfter = clean.substring(matchIndex + matchedKeyword.length).trim();
                    queryAfter = queryAfter.replace(/^[,\s.:?]+/, '').trim();

                    if (queryAfter.length > 2 && isFinal) {
                        // Spoke wake word + query together in one breath
                        playWakeChime();
                        processSreeVoiceQuery(queryAfter);
                        break;
                    } else if (queryAfter.length <= 2 && (isFinal || clean === matchedKeyword)) {
                        // Called "Hey Sree" alone -> chime, greet, and listen for query
                        playWakeChime();
                        openSreeOverlay();
                        updateSreeStatus(`<strong>Sree:</strong> "${getSreeVoiceGreeting()}" 🎙️`);
                        appendOverlayBotMessage(getSreeVoiceGreeting(), []);

                        speakAssistantVoice(getSreeVoiceGreeting(), () => {
                            isSreeListeningForQuery = true;
                            updateSreeStatus(`Sree is listening to your question... Speak now! 🎙️`);
                            clearTimeout(sreeQueryTimeout);
                            sreeQueryTimeout = setTimeout(() => {
                                if (isSreeListeningForQuery) {
                                    isSreeListeningForQuery = false;
                                    updateSreeStatus(`Listening for <strong>"Hey Sree"</strong> (or type below)... 🎙️`);
                                }
                            }, 12000);
                        });
                        break;
                    }
                }
            }
        };

        rec.onerror = (e) => {
            console.warn("SpeechRecognition error:", e.error);
            stopWakeWordEngine(false); // Don't close overlay so user can type!
            setSreeModalMode("type");
            if (sreeTypeModeBanner) {
                sreeTypeModeBanner.innerHTML = `<i class="fa-solid fa-circle-info" style="color:#f59e0b;"></i> <span>Microphone not available or blocked. Switched to Keyboard Typing mode — type your question freely below! ⌨️</span>`;
            }
            if (sreeOverlayStatus) {
                sreeOverlayStatus.innerHTML = `<span style="color:#f59e0b;"><i class="fa-solid fa-keyboard"></i> Switched to Typing Mode. Type your question below! ⌨️</span>`;
            }
            if (micPermissionToast) micPermissionToast.classList.add("hidden");
        };

        rec.onend = () => {
            isRecognitionRunning = false;
            console.log("SpeechRecognition cycle ended.");
            if (isWakeWordMode && !isSpeaking) {
                clearTimeout(speechRestartTimeout);
                speechRestartTimeout = setTimeout(() => {
                    if (isWakeWordMode && !isSpeaking && !isRecognitionRunning) {
                        safeStartRecognition();
                    }
                }, 300);
            }
        };

        wakeWordRecognition = rec;
        return wakeWordRecognition;
    }

    function safeStartRecognition() {
        if (!isWakeWordMode || isSpeaking || isRecognitionRunning) return;
        if (!wakeWordRecognition) initWakeWordEngine();
        if (!wakeWordRecognition) return;

        try {
            wakeWordRecognition.lang = currentLanguage || "en-IN";
            wakeWordRecognition.start();
        } catch (e) {
            console.warn("safeStartRecognition start error:", e.message);
            clearTimeout(speechRestartTimeout);
            speechRestartTimeout = setTimeout(() => {
                if (isWakeWordMode && !isSpeaking && !isRecognitionRunning && wakeWordRecognition) {
                    try { wakeWordRecognition.start(); } catch (err) {}
                }
            }, 600);
        }
    }

    function safeStopRecognition() {
        if (wakeWordRecognition && isRecognitionRunning) {
            try {
                wakeWordRecognition.stop();
            } catch (e) {}
        }
    }

    function speakAssistantVoice(text, onComplete) {
        if (!('speechSynthesis' in window)) {
            if (onComplete) onComplete();
            return;
        }

        try {
            isSpeaking = true;
            safeStopRecognition();
            window.speechSynthesis.cancel();

            const cleanText = text.replace(/[*#_`>]/g, '').replace(/https?:\/\/\S+/g, '').trim();
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = currentLanguage || "en-IN";
            activeUtterance = utterance;

            let finished = false;
            const handleFinish = () => {
                if (finished) return;
                finished = true;
                isSpeaking = false;
                activeUtterance = null;
                if (onComplete) onComplete();
                if (isWakeWordMode) {
                    setTimeout(() => safeStartRecognition(), 300);
                }
            };

            utterance.onend = handleFinish;
            utterance.onerror = (err) => {
                console.warn("SpeechSynthesis utterance error:", err);
                handleFinish();
            };

            // Watchdog in case Chrome stalls speechSynthesis.onend
            const durationEstimate = Math.max(3000, Math.min(30000, cleanText.length * 90));
            setTimeout(() => {
                if (isSpeaking && activeUtterance === utterance) {
                    window.speechSynthesis.cancel();
                    handleFinish();
                }
            }, durationEstimate + 2500);

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn("speakAssistantVoice exception:", e);
            isSpeaking = false;
            activeUtterance = null;
            if (onComplete) onComplete();
            if (isWakeWordMode) setTimeout(() => safeStartRecognition(), 300);
        }
    }

    function processSreeVoiceQuery(query) {
        if (!query || !query.trim()) return;
        const cleanQuery = query.trim();

        openSreeOverlay();
        updateSreeStatus(`Processing query: <em>"${escapeQuotes(cleanQuery)}"</em>...`);
        appendOverlayUserMessage(cleanQuery);
        showOverlayThinking();

        if (userInput) userInput.value = cleanQuery;
        safeStopRecognition();

        submitGlobalSreeVoiceChat(cleanQuery);
    }

    async function submitGlobalSreeVoiceChat(queryText) {
        const headers = { "Content-Type": "application/json" };
        if (authToken) headers["X-User-Token"] = authToken;

        // If currently in exam detail screen with chat history visible, append user query
        if (examChatHistory && currentExamContext) {
            appendMessage("user", queryText, currentUserRole);
        }

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    query: queryText,
                    persona: currentUserRole || "Student",
                    exam_context: currentExamContext || null,
                    language: currentLanguage,
                    session_id: currentSessionId
                })
            });

            const data = await res.json();
            if (res.ok) {
                updateSreeStatus(`<strong>Sree AI Response</strong>`);
                appendOverlayBotMessage(data.answer, data.sources);

                if (data.session_id) {
                    currentSessionId = data.session_id;
                    if (authToken) fetchUserSessions();
                }

                // Also append to exam chat history if visible
                if (examChatHistory && currentExamContext) {
                    appendMessage("bot", data.answer, currentUserRole, data.sources, data.confidence, data.is_faq_short_circuit);
                }

                // Read aloud response
                speakAssistantVoice(data.answer, () => {
                    if (isWakeWordMode) {
                        updateSreeStatus(`Listening for <strong>"Hey Sree"</strong> (or type below)... 🎙️`);
                    } else {
                        updateSreeStatus(`Sree AI Ready. Ask another question by voice or typing! 💬`);
                    }
                });
            } else {
                const errDetail = data.detail || "Unable to get an answer from entrance database.";
                updateSreeStatus(`<span style="color:#ef4444;">Could not process request</span>`);
                appendOverlayBotMessage(`⚠️ ${errDetail}`, []);
                speakAssistantVoice("Sorry, I could not retrieve information for that query. Please try asking again.", () => {
                    if (isWakeWordMode) updateSreeStatus(`Listening for <strong>"Hey Sree"</strong> (or type below)... 🎙️`);
                });
            }
        } catch (err) {
            console.error("Voice chat API error:", err);
            updateSreeStatus(`<span style="color:#ef4444;">Connection error</span>`);
            appendOverlayBotMessage(`⚠️ Error connecting to Entrance Sahaayi AI. Please check your connection.`, []);
            speakAssistantVoice("I am having trouble connecting to the server. Please try again.", () => {
                if (isWakeWordMode) updateSreeStatus(`Listening for <strong>"Hey Sree"</strong> (or type below)... 🎙️`);
            });
        }
    }

    function setSreeModalMode(mode) {
        currentModalMode = mode;
        if (mode === "type") {
            if (tabSreeType) tabSreeType.classList.add("active");
            if (tabSreeVoice) tabSreeVoice.classList.remove("active");
            if (sreeTypeModeBanner) sreeTypeModeBanner.classList.remove("hidden");
            if (sreeVoiceModeSection) sreeVoiceModeSection.classList.add("hidden");
            stopWakeWordEngine(false);
            if (sreeWidgetStatus) sreeWidgetStatus.textContent = "Type or Speak 💬🎙️";
            setTimeout(() => {
                if (sreeTypedInput) sreeTypedInput.focus();
            }, 100);
        } else {
            if (tabSreeVoice) tabSreeVoice.classList.add("active");
            if (tabSreeType) tabSreeType.classList.remove("active");
            if (sreeVoiceModeSection) sreeVoiceModeSection.classList.remove("hidden");
            if (sreeTypeModeBanner) sreeTypeModeBanner.classList.add("hidden");
            if (!isWakeWordMode) {
                if (localStorage.getItem("sree_mic_permission") === "granted") {
                    startWakeWordEngine();
                } else {
                    requestMicrophoneAccess(() => startWakeWordEngine());
                }
            }
        }
    }

    function openSreeOverlay(initialMode = "type") {
        if (sreeVoiceOverlay) {
            sreeVoiceOverlay.classList.remove("hidden");
            setSreeModalMode(initialMode);
        }
    }

    function closeSreeOverlay() {
        if (sreeVoiceOverlay) sreeVoiceOverlay.classList.add("hidden");
    }

    function updateVoiceUIState(isActive) {
        if (wakeWordToggleBtn) {
            if (isActive) {
                wakeWordToggleBtn.classList.add("active");
                if (wakeWordBtnLabel) wakeWordBtnLabel.textContent = `"Hey Sree" Active 🎙️`;
            } else {
                wakeWordToggleBtn.classList.remove("active");
                if (wakeWordBtnLabel) wakeWordBtnLabel.textContent = `"Hey Sree" Voice`;
            }
        }
        if (sreeFloatingWidget) {
            if (isActive) {
                sreeFloatingWidget.classList.add("active");
                if (sreeWidgetStatus) sreeWidgetStatus.textContent = "Active ('Hey Sree') 🎙️";
            } else {
                sreeFloatingWidget.classList.remove("active");
                if (sreeWidgetStatus) sreeWidgetStatus.textContent = `Type or Speak 💬🎙️`;
            }
        }
        if (siriVoiceBanner) {
            if (isActive) siriVoiceBanner.classList.remove("hidden");
            else siriVoiceBanner.classList.add("hidden");
        }
        if (sreeMuteBtnLabel) {
            sreeMuteBtnLabel.textContent = isActive ? "Mute Mic" : "Unmute Mic";
        }
    }

    function updateSreeStatus(html) {
        if (sreeOverlayStatus) sreeOverlayStatus.innerHTML = html;
        if (siriVoiceText) siriVoiceText.innerHTML = html;
        if (sreeWidgetStatus) sreeWidgetStatus.textContent = isWakeWordMode ? "Active ('Hey Sree') 🎙️" : "Type or Speak 💬🎙️";
    }

    function updateSreeTranscript(html) {
        if (sreeOverlayTranscript) sreeOverlayTranscript.innerHTML = html;
    }

    function toggleWakeWordMode() {
        if (isWakeWordMode) {
            stopWakeWordEngine(true);
        } else {
            openSreeOverlay("voice");
        }
    }

    function startWakeWordEngine() {
        isWakeWordMode = true;
        localStorage.setItem("sree_mic_permission", "granted");
        if (micPermissionToast) micPermissionToast.classList.add("hidden");

        updateVoiceUIState(true);
        if (siriVoiceText) siriVoiceText.innerHTML = `Listening for <strong>"Hey Sree"</strong>... Say <em>"Hey Sree"</em> to speak!`;

        if (!wakeWordRecognition) initWakeWordEngine();
        safeStartRecognition();
    }

    function stopWakeWordEngine(fullTurnOff = true) {
        if (fullTurnOff) {
            isWakeWordMode = false;
            updateVoiceUIState(false);
            closeSreeOverlay();
        } else {
            isWakeWordMode = false;
            updateVoiceUIState(false);
        }
        safeStopRecognition();
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            isSpeaking = false;
        }
    }

    function requestMicrophoneAccess(callback) {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                localStorage.setItem("sree_mic_permission", "granted");
                if (micPermissionToast) micPermissionToast.classList.add("hidden");
                stream.getTracks().forEach(t => t.stop());
                startWakeWordEngine();
                if (callback) callback(true);
            }).catch(err => {
                console.warn("Microphone access prompt rejected or unavailable:", err);
                setSreeModalMode("type");
                if (sreeTypeModeBanner) {
                    sreeTypeModeBanner.innerHTML = `<i class="fa-solid fa-circle-info" style="color:#f59e0b;"></i> <span>Microphone not available or blocked. Switched to Keyboard Typing mode — type your question freely below! ⌨️</span>`;
                }
                openSreeOverlay("type");
                if (callback) callback(false);
            });
        } else {
            startWakeWordEngine();
            if (callback) callback(true);
        }
    }

    function triggerSreeListenImmediate() {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            isSpeaking = false;
        }
        if (!isWakeWordMode) startWakeWordEngine();
        playWakeChime();
        isSreeListeningForQuery = true;
        updateSreeStatus(`Listening to you... Speak your question now! 🎙️`);
        safeStartRecognition();

        clearTimeout(sreeQueryTimeout);
        sreeQueryTimeout = setTimeout(() => {
            if (isSreeListeningForQuery) {
                isSreeListeningForQuery = false;
                updateSreeStatus(`Listening for <strong>"Hey Sree"</strong> (or type below)... 🎙️`);
            }
        }, 12000);
    }

    // -------------------------------------------------------------
    // LANDING PAGE DIRECT AI QUERY SEARCH & CHAT ENGINE
    // -------------------------------------------------------------
    async function submitLandingQuery(queryText) {
        if (!queryText || !queryText.trim()) return;
        const cleanQuery = queryText.trim();

        if (landingQueryInput) landingQueryInput.value = cleanQuery;
        if (landingSendBtn) {
            landingSendBtn.disabled = true;
            landingSendBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Searching...</span>`;
        }

        if (landingQueryResponse) landingQueryResponse.classList.remove("hidden");
        if (landingUserQueryText) landingUserQueryText.textContent = cleanQuery;
        if (landingResponseBody) {
            landingResponseBody.innerHTML = `<div class="sree-bubble-thinking"><i class="fa-solid fa-spinner fa-spin"></i> Sree is analyzing official brochures & preparing your answer...</div>`;
        }
        if (landingResponseSources) landingResponseSources.innerHTML = "";

        try {
            const headers = { "Content-Type": "application/json" };
            if (authToken) headers["X-User-Token"] = authToken;

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    query: cleanQuery,
                    persona: currentUserRole || "Student",
                    exam_context: null,
                    language: currentLanguage,
                    session_id: currentSessionId
                })
            });

            const data = await res.json();
            if (res.ok) {
                currentLandingAnswerText = data.answer;
                if (landingResponseBody) landingResponseBody.innerHTML = formatMarkdown(data.answer);

                if (landingResponseSources) {
                    if (data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
                        landingResponseSources.innerHTML = `
                            <span class="chip-label" style="margin-right:6px;"><i class="fa-solid fa-book-bookmark"></i> Official Sources:</span>
                            ${data.sources.map(s => `<span class="sree-bubble-badge">${escapeQuotes(typeof s === 'string' ? s : s.title || s.source || 'Official Brochure')}</span>`).join(' ')}
                        `;
                    } else {
                        landingResponseSources.innerHTML = `<span style="font-size:0.75rem; color:#94a3b8; font-style:italic;"><i class="fa-solid fa-shield-halved"></i> Grounded strictly in official entrance brochures.</span>`;
                    }
                }

                if (data.session_id) {
                    currentSessionId = data.session_id;
                    if (authToken) fetchUserSessions();
                }

                // Mirror to Sree overlay transcript so conversation continues seamlessly if full chat is opened
                appendOverlayUserMessage(cleanQuery);
                appendOverlayBotMessage(data.answer, data.sources);

                if (landingQueryResponse) {
                    landingQueryResponse.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }
            } else {
                const errDetail = data.detail || "Unable to retrieve information from brochures.";
                if (landingResponseBody) landingResponseBody.innerHTML = `<p style="color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeQuotes(errDetail)}</p>`;
            }
        } catch (err) {
            console.error("Landing query error:", err);
            if (landingResponseBody) landingResponseBody.innerHTML = `<p style="color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Error connecting to Entrance Sahaayi AI. Please check your connection.</p>`;
        } finally {
            if (landingSendBtn) {
                landingSendBtn.disabled = false;
                landingSendBtn.innerHTML = `<span>Ask Sree</span> <i class="fa-solid fa-paper-plane"></i>`;
            }
        }
    }

    function initLandingSpeech() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if (landingMicBtn) {
                landingMicBtn.title = "Microphone not supported in this browser (Typing works anytime!)";
                landingMicBtn.addEventListener("click", () => {
                    alert("Voice recognition is not supported in this browser. Please type your query in the box!");
                    if (landingQueryInput) landingQueryInput.focus();
                });
            }
            return;
        }

        landingSpeechRec = new SpeechRecognition();
        landingSpeechRec.continuous = false;
        landingSpeechRec.interimResults = false;
        landingSpeechRec.lang = currentLanguage || "en-IN";

        landingSpeechRec.onstart = () => {
            isLandingMicListening = true;
            if (landingMicBtn) landingMicBtn.classList.add("listening");
        };

        landingSpeechRec.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            if (landingQueryInput) landingQueryInput.value = transcript;
            submitLandingQuery(transcript);
        };

        landingSpeechRec.onend = () => {
            isLandingMicListening = false;
            if (landingMicBtn) landingMicBtn.classList.remove("listening");
        };

        landingSpeechRec.onerror = (e) => {
            console.warn("Landing speech error:", e.error);
            isLandingMicListening = false;
            if (landingMicBtn) landingMicBtn.classList.remove("listening");
            if (landingQueryInput) landingQueryInput.focus();
        };

        if (landingMicBtn) {
            landingMicBtn.addEventListener("click", () => {
                if (isLandingMicListening) {
                    landingSpeechRec.stop();
                } else {
                    landingSpeechRec.lang = currentLanguage || "en-IN";
                    try {
                        landingSpeechRec.start();
                    } catch (err) {
                        console.warn("Landing speech start error:", err);
                    }
                }
            });
        }
    }

    initLandingSpeech();

    // Attach listeners
    if (navAskSreeBtn) navAskSreeBtn.addEventListener("click", () => openSreeOverlay("type"));
    if (wakeWordToggleBtn) wakeWordToggleBtn.addEventListener("click", toggleWakeWordMode);
    if (stopSiriVoiceBtn) stopSiriVoiceBtn.addEventListener("click", () => stopWakeWordEngine(true));
    if (enableMicBtn) enableMicBtn.addEventListener("click", () => requestMicrophoneAccess());

    if (typeInsteadBtn) {
        typeInsteadBtn.addEventListener("click", () => {
            if (micPermissionToast) micPermissionToast.classList.add("hidden");
            openSreeOverlay("type");
        });
    }

    if (tabSreeType) tabSreeType.addEventListener("click", () => setSreeModalMode("type"));
    if (tabSreeVoice) tabSreeVoice.addEventListener("click", () => setSreeModalMode("voice"));
    if (sreeSwitchToTypeBtn) sreeSwitchToTypeBtn.addEventListener("click", () => setSreeModalMode("type"));

    if (landingQueryForm) {
        landingQueryForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!landingQueryInput) return;
            const query = landingQueryInput.value.trim();
            if (query) submitLandingQuery(query);
        });
    }

    document.querySelectorAll(".landing-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const query = chip.getAttribute("data-query");
            if (query) submitLandingQuery(query);
        });
    });

    if (landingListenBtn) {
        landingListenBtn.addEventListener("click", () => {
            if (currentLandingAnswerText) {
                speakAssistantVoice(currentLandingAnswerText);
            }
        });
    }

    if (landingCopyBtn) {
        landingCopyBtn.addEventListener("click", () => {
            if (currentLandingAnswerText) {
                navigator.clipboard.writeText(currentLandingAnswerText).then(() => {
                    const originalHtml = landingCopyBtn.innerHTML;
                    landingCopyBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Copied!</span>`;
                    setTimeout(() => { landingCopyBtn.innerHTML = originalHtml; }, 2000);
                }).catch(() => {});
            }
        });
    }

    if (landingOpenChatBtn) {
        landingOpenChatBtn.addEventListener("click", () => openSreeOverlay("type"));
    }

    if (landingDismissBtn) {
        landingDismissBtn.addEventListener("click", () => {
            if (landingQueryResponse) landingQueryResponse.classList.add("hidden");
        });
    }

    if (sreeFloatingWidget) {
        sreeFloatingWidget.addEventListener("click", () => {
            openSreeOverlay("type");
        });
    }

    if (siriOrbLarge) {
        siriOrbLarge.addEventListener("click", triggerSreeListenImmediate);
    }

    if (sreeOrbMicBtn) {
        sreeOrbMicBtn.addEventListener("click", triggerSreeListenImmediate);
    }

    // Form submit for typing queries directly
    if (sreeTypedForm) {
        sreeTypedForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!sreeTypedInput) return;
            const query = sreeTypedInput.value.trim();
            if (!query) return;
            sreeTypedInput.value = "";
            processSreeVoiceQuery(query);
        });
    }

    // Quick chips click handlers
    document.querySelectorAll(".sree-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const query = chip.getAttribute("data-query");
            if (query) {
                processSreeVoiceQuery(query);
            }
        });
    });

    if (sreeClearChatBtn) {
        sreeClearChatBtn.addEventListener("click", clearOverlayTranscript);
    }

    if (sreeOverlayCloseBtn) sreeOverlayCloseBtn.addEventListener("click", closeSreeOverlay);

    if (sreeOverlayMuteBtn) {
        sreeOverlayMuteBtn.addEventListener("click", () => {
            if (isWakeWordMode) {
                stopWakeWordEngine(false); // keep overlay open so user can type!
                updateSreeStatus(`<span style="color:#94a3b8;"><i class="fa-solid fa-microphone-slash"></i> Microphone muted. You can still type queries below! 💬</span>`);
                if (sreeMuteBtnLabel) sreeMuteBtnLabel.textContent = "Unmute Mic";
            } else {
                startWakeWordEngine();
                updateSreeStatus(`Listening for <strong>"Hey Sree"</strong> (or type below)... 🎙️`);
                if (sreeMuteBtnLabel) sreeMuteBtnLabel.textContent = "Mute Mic";
            }
        });
    }

    // Auto-bootstrap on first user interaction if permission was previously granted
    function checkAutoMicPermission() {
        if (localStorage.getItem("sree_mic_permission") === "granted") {
            const onFirstInteraction = () => {
                window.removeEventListener("click", onFirstInteraction);
                window.removeEventListener("keydown", onFirstInteraction);
                window.removeEventListener("touchstart", onFirstInteraction);
                if (!isWakeWordMode) {
                    startWakeWordEngine();
                }
            };
            window.addEventListener("click", onFirstInteraction, { once: true });
            window.addEventListener("keydown", onFirstInteraction, { once: true });
            window.addEventListener("touchstart", onFirstInteraction, { once: true });
        } else {
            if (micPermissionToast) micPermissionToast.classList.remove("hidden");
        }
    }

    checkAutoMicPermission();

    // Speech Recognition for manual button
    function changeLanguage(language) {
        currentLanguage = language;
        speechLanguageSelect.value = language;
        if (loginLanguageSelect) loginLanguageSelect.value = language;
        const selectedText = speechLanguageSelect.options[speechLanguageSelect.selectedIndex].text;
        if (currentLangLabel) currentLangLabel.textContent = selectedText.split(" ")[0];
        if (recognition) recognition.lang = currentLanguage;
        if (wakeWordRecognition) wakeWordRecognition.lang = currentLanguage;
        applyLanguage();
        if (currentExamContext) examSummaryBody.innerHTML = getExamSummary(currentExamContext);
        if (currentExamContext) {
            const welcome = examChatHistory.querySelector(".bot-message p");
            if (welcome) welcome.textContent = t("greeting", currentExamContext);
        }
    }

    speechLanguageSelect.addEventListener("change", (e) => changeLanguage(e.target.value));
    if (loginLanguageSelect) {
        loginLanguageSelect.addEventListener("change", (e) => changeLanguage(e.target.value));
        loginLanguageSelect.addEventListener("input", (e) => changeLanguage(e.target.value));
    }

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

    window.speakText = function(text, button) {
        if ('speechSynthesis' in window) {
            if (activeSpeech) resetSpeechControls(activeSpeech);
            isSpeaking = true;
            safeStopRecognition();
            window.speechSynthesis.cancel();
            const cleanText = text.replace(/[*#_`]/g, '');
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = currentLanguage || "en-IN";
            activeUtterance = utterance;
            const pauseButton = button.parentElement.querySelector(".audio-pause-btn");
            const resumeButton = button.parentElement.querySelector(".audio-resume-btn");
            const speech = { button, pauseButton, resumeButton, utterance, isPaused: false };
            activeSpeech = speech;
            setSpeechControls(speech, true);
            utterance.onend = () => {
                resetSpeechControls(speech);
                isSpeaking = false;
                activeUtterance = null;
                if (isWakeWordMode) {
                    // Continuous Siri voice loop: resume listening after Sree finishes speaking!
                    setTimeout(() => safeStartRecognition(), 400);
                }
            };
            utterance.onerror = () => {
                resetSpeechControls(speech);
                isSpeaking = false;
                activeUtterance = null;
                if (isWakeWordMode) {
                    setTimeout(() => safeStartRecognition(), 400);
                }
            };
            window.speechSynthesis.speak(utterance);
        }
    };

    window.pauseSpeech = function(button) {
        if (activeSpeech && activeSpeech.pauseButton === button && !activeSpeech.isPaused) {
            window.speechSynthesis.pause();
            activeSpeech.isPaused = true;
            setSpeechControls(activeSpeech, false);
        }
    };

    window.resumeSpeech = function(button) {
        if (activeSpeech && activeSpeech.resumeButton === button && activeSpeech.isPaused) {
            window.speechSynthesis.resume();
            activeSpeech.isPaused = false;
            setSpeechControls(activeSpeech, true);
        }
    };

    window.restartSpeech = function(button, text) {
        const controls = button.parentElement;
        const playButton = controls.querySelector(".audio-play-btn");
        if (playButton) {
            // Start one fresh session; speakText resets the previous response.
            speakText(text, playButton);
        }
    };

    function setSpeechControls(speech, isPlaying) {
        if (!speech || !speech.button || !speech.pauseButton) return;
        speech.button.disabled = false;
        speech.button.innerHTML = '<i class="fa-solid fa-play"></i> Listen';
        speech.pauseButton.disabled = !isPlaying;
        if (speech.resumeButton) speech.resumeButton.disabled = isPlaying;
    }

    function resetSpeechControls(speech) {
        if (!speech) return;
        if (speech.button) {
            speech.button.disabled = false;
            speech.button.innerHTML = `<i class="fa-solid fa-play"></i> ${t("listen")}`;
        }
        if (speech.pauseButton) speech.pauseButton.disabled = true;
        if (speech.resumeButton) speech.resumeButton.disabled = true;
        if (activeSpeech === speech) activeSpeech = null;
    }

    // Initialize Manual Speech Recognition
    initSpeechRecognition();

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
        return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ');
    }
});
