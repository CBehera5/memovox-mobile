// src/services/LanguageService.ts

/**
 * LanguageService
 * Handles multi-language support for JARVIS AI
 * Supports: English, Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Bengali
 */

import StorageService from './StorageService';

export type SupportedLanguage = 
  | 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'mr' | 'gu' | 'bn';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  isRTL: boolean;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    isRTL: false,
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    isRTL: false,
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    isRTL: false,
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    isRTL: false,
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    isRTL: false,
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    isRTL: false,
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    isRTL: false,
  },
  gu: {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    isRTL: false,
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    isRTL: false,
  },
};

export const LANGUAGE_SYSTEM_PROMPTS: Record<SupportedLanguage, string> = {
  en: `You are JARVIS, a helpful AI assistant. You respond in English and help users with their tasks, reminders, and questions.`,
  
  hi: `आप JARVIS हैं, एक सहायक AI सहायक। आप हिंदी में जवाब देते हैं और उपयोगकर्ताओं को उनके कार्यों, रिमाइंडर और सवालों में मदद करते हैं।`,
  
  ta: `நீங்கள் JARVIS, ஒரு உதவிகரமான AI உதவியாளர். நீங்கள் தமிழ் மொழியில் பதிலளிக்கிறீர்கள் மற்றும் பயனர்களுக்கு அவர்களின் பணிகள், நினைவூட்டல்கள் மற்றும் கேள்விகளில் உதவுகிறீர்கள்.`,
  
  te: `మీరు JARVIS, సహాయక AI సహాయক. మీరు తెలుగు భాషలో సమాధానం ఇస్తారు మరియు వినియోగదారులకు వారి పనులు, రిమైండర్‌లు మరియు ప్రశ్నలలో సహాయం చేస్తారు.`,
  
  kn: `ನೀವು JARVIS, ಸಹಾಯಕ AI ಸಹಾಯಕ. ನೀವು ಕನ್ನಡ ಭಾಷೆಯಲ್ಲಿ ಉತ್ತರಿಸುತ್ತೀರಿ ಮತ್ತು ಬಳಕೆದಾರರಿಗೆ ಅವರ ಕಾರ್ಯಗಳು, ಜ್ಞಾಪನೆಗಳು ಮತ್ತು ಪ್ರಶ್ನೆಗಳಲ್ಲಿ ಸಹಾಯ ಮಾಡುತ್ತೀರಿ.`,
  
  ml: `നിങ്ങൾ JARVIS, ഒരു സഹായകമായ AI സഹായി. നിങ്ങൾ മലയാളം ഭാഷയിൽ ഉത്തരം നൽകുകയും ഉപയോക്താക്കളെ അവരുടെ ജോലികൾ, ഓർമ്മപ്പെടുത്തലുകൾ, പ്രശ്നങ്ങൾ എന്നിവയിൽ സഹായിക്കുകയും ചെയ്യുന്നു.`,
  
  mr: `तुम JARVIS आहात, एक सहायक AI सहायक. तुम मराठीमध्ये प्रतिक्रिया देता आहात आणि वापरकर्त्यांना त्यांच्या कार्यांमध्ये, स्मरणीयांमध्ये आणि प्रश्नांमध्ये मदत करता आहात.`,
  
  gu: `તમે JARVIS છો, એક સહાયક AI સહાયક. તમે ગુજરાતી ભાષામાં જવાબ આપો છો અને વપરાશકર્તાઓને તેમના કાર્યો, રિમાઈન્ડર્સ અને પ્રશ્નોમાં મદદ કરો છો.`,
  
  bn: `আপনি JARVIS, একটি সহায়ক AI সহায়ক। আপনি বাংলা ভাষায় উত্তর দেন এবং ব্যবহারকারীদের তাদের কাজ, রিমাইন্ডার এবং প্রশ্নে সহায়তা করেন।`,
};

class LanguageService {
  private currentLanguage: SupportedLanguage = 'en';
  private readonly LANGUAGE_KEY = 'memovox_language';

  constructor() {
    this.loadLanguagePreference();
  }

  /**
   * Load user's language preference from storage
   */
  private async loadLanguagePreference(): Promise<void> {
    try {
      const saved = await StorageService.getLanguagePreference?.();
      if (saved && this.isValidLanguage(saved)) {
        this.currentLanguage = saved;
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
    }
  }

  /**
   * Set user's language preference
   */
  async setLanguage(language: SupportedLanguage): Promise<void> {
    if (!this.isValidLanguage(language)) {
      console.warn(`Unsupported language: ${language}`);
      return;
    }
    
    this.currentLanguage = language;
    
    try {
      await StorageService.setLanguagePreference?.(language);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Get language config
   */
  getLanguageConfig(): LanguageConfig {
    return SUPPORTED_LANGUAGES[this.currentLanguage];
  }

  /**
   * Get system prompt for JARVIS in current language
   */
  getSystemPrompt(): string {
    return LANGUAGE_SYSTEM_PROMPTS[this.currentLanguage];
  }

  /**
   * Get system prompt for action parsing in current language
   */
  getActionParsingPrompt(): string {
    const basePrompt = `You are an action parser that extracts action requests from user messages in ${SUPPORTED_LANGUAGES[this.currentLanguage].name}.`;
    
    const languageSpecificExamples: Record<SupportedLanguage, string> = {
      en: `When a user asks to set reminders, alarms, create tasks, or schedule notifications in English, extract:
      1. Action type: 'reminder', 'alarm', 'notification', 'calendar', 'task', or null if no action detected
      2. Title: What action to perform (e.g., "Call mother", "Team meeting", "Gym session")
      3. Due time: When to perform it (parse natural language like "tomorrow at 3pm", "in 2 hours", "next Monday")
      4. Priority: 'high', 'medium', or 'low' based on urgency indicators`,
      
      hi: `जब उपयोगकर्ता हिंदी में रिमाइंडर सेट करने, अलार्म, कार्य बनाने या सूचनाएं शेड्यूल करने के लिए कहते हैं, तो निकालें:
      1. कार्रवाई प्रकार: 'reminder', 'alarm', 'notification', 'calendar', 'task', या null यदि कोई कार्रवाई नहीं
      2. शीर्षक: क्या कार्रवाई करनी है (जैसे "माँ को कॉल करना", "टीम मीटिंग", "जिम सेशन")
      3. समय: कब करना है (उदाहरण: "कल 3 बजे", "2 घंटे में", "अगले सोमवार")
      4. प्राथमिकता: 'high', 'medium', या 'low' तात्कालिकता के आधार पर`,
      
      ta: `பயனர் தமிழில் நினைவூட்டல் அமைக்க, அலாரம், பணியை உருவாக்க அல்லது அறிவிப்புக்களைத் திட்டமிட கேட்டால், பிரித்தெடுக்க:
      1. நடவடிக்கை வகை: 'reminder', 'alarm', 'notification', 'calendar', 'task', அல்லது null
      2. தலைப்பு: என்ன செய்ய வேண்டும் (எ.கா., "அம்மாவுக்கு அழைப்பு", "குழு சந்திப்பு")
      3. நேரம்: எப்போது செய்ய வேண்டும் (எ.கா., "நாளை 3 மணிக்கு", "2 மணிநேரத்தில்")
      4. ஆதிக்கம்: 'high', 'medium', அல்லது 'low'`,
      
      te: `వినియోగదారు తెలుగులో రిమైండర్‌లను సెట్ చేయమని, అలారం, పని సృష్టించమని లేదా నోటిఫికేషన్‌లను షెడ్యూల్ చేయమని అడిగినప్పుడు, సంగ్రహించండి:
      1. చర్య రకం: 'reminder', 'alarm', 'notification', 'calendar', 'task', లేదా null
      2. శీర్షిక: ఏ చర్యను నిర్వహించాలి (ఉదా., "ట్రెండ్‌డీకి కॉల్ చేయండి", "టీమ్ మీటింగ్")
      3. సమయం: ఎప్పుడు చేయాలి (ఉదా., "రేపు 3 గంటలకు", "2 గంటల్లో")
      4. ప్రాధాన్యత: 'high', 'medium', లేదా 'low'`,
      
      kn: `ಬಳಕೆದಾರ ಕನ್ನಡದಲ್ಲಿ ಜ್ಞಾಪನೆಗಳನ್ನು ಸೆಟ್ ಮಾಡಲು, ಅಲಾರಮ್, ಕಾರ್ಯವನ್ನು ರಚಿಸಲು ಅಥವಾ ಅಧಿಸೂಚನೆಗಳನ್ನು ವೇಳಾಪಟ್ಟಿ ಮಾಡಲು ಕೇಳಿದಾಗ, ಹೊರತೆಗೆಯಿರಿ:
      1. ಕ್ರಿಯೆಯ ಪ್ರಕಾರ: 'reminder', 'alarm', 'notification', 'calendar', 'task', ಅಥವಾ null
      2. ಶೀರ್ಷಿಕೆ: ಯಾವ ಕ್ರಿಯೆಯನ್ನು ನಿರ್ವಹಿಸಬೇಕು (ಉದಾ., "ಅಮ್ಮನಿಗೆ ಕರೆ", "ತಂಡ ಸಭೆ")
      3. ಸಮಯ: ಯಾವಾಗ ಮಾಡಬೇಕು (ಉದಾ., "ನಾಳೆ 3 ಗಂಟೆಗೆ", "2 ಗಂಟೆಗಳಲ್ಲಿ")
      4. ಆದ್ಯತೆ: 'high', 'medium', ಅಥವಾ 'low'`,
      
      ml: `ഉപയോക്താവ് മലയാളത്തിൽ നിരൂപണങ്ങൾ സജ്ജമാക്കാൻ, അലാറം, ജോലി സൃഷ്ടിക്കാൻ അല്ലെങ്കിൽ അറിയിപ്പുകൾ ഷെഡ്യൂൾ ചെയ്യാൻ ആവശ്യപ്പെടുമ്പോൾ, വേർതിരിച്ചെടുക്കുക:
      1. നടപടി വിഭാഗം: 'reminder', 'alarm', 'notification', 'calendar', 'task', അല്ലെങ്കിൽ null
      2. ശീർഷകം: ഏത് പ്രവർത്തനം നിർവ്വഹിക്കണം (ഉദാ., "അമ്മയ്ക്ക് വിളിക്കുക", "ടീം മീറ്റിംഗ്")
      3. സമയം: എപ്പോൾ ചെയ്യണം (ഉദാ., "നാളെ 3 മണിക്കൂർ", "2 മണിക്കൂരിൽ")
      4. മുൻഗണന: 'high', 'medium', അല്ലെങ്കിൽ 'low'`,
      
      mr: `वापरकर्ता मराठीमध्ये स्मरणीय सेट करण्यास, अलार्म, कार्य तयार करण्यास किंवा सूचना शेड्यूल करण्यास सांगितल्यास, काढून घ्या:
      1. क्रिया प्रकार: 'reminder', 'alarm', 'notification', 'calendar', 'task', किंवा null
      2. शीर्षक: कोणत्या क्रিया करायच्या आहेत (उदा., "आईला कॉल करा", "टीम मीटिंग")
      3. समय: केव्हा करायचे आहे (उदा., "उद्या 3 वाजता", "2 तासांत")
      4. प्राधान्य: 'high', 'medium', किंवा 'low'`,
      
      gu: `જ્યારે વપરાશકર્તા ગુજરાતીમાં રીમાઈન્ડર્સ સેટ કરવા, અલાર્મ, કાર્ય બનાવવા અથવા સૂચનાઓ શેડ્યૂલ કરવા માટે કહે, તો બહાર કાઢો:
      1. ક્રિયાનો પ્રકાર: 'reminder', 'alarm', 'notification', 'calendar', 'task', અથવા null
      2. શીર્ષક: કઈ ક્રિયા કરવી (જેમ કે., "માતાને કૉલ કરો", "ટીમ મીટિંગ")
      3. સમય: ક્યારે કરવું (જેમ કે., "આવતા કાલ 3 વાગે", "2 કલાકમાં")
      4. ગુણવત્તા: 'high', 'medium', અથવા 'low'`,
      
      bn: `যখন ব্যবহারকারী বাংলায় রিমাইন্ডার সেট করতে, অ্যালার্ম, কাজ তৈরি করতে বা বিজ্ঞপ্তি শিডিউল করতে বলে, তখন বের করুন:
      1. ক্রিয়া ধরন: 'reminder', 'alarm', 'notification', 'calendar', 'task', বা null
      2. শিরোনাম: কোন ক্রিয়া করতে হবে (যেমন., "মায়ের কাছে কল করুন", "টিম মিটিং")
      3. সময়: কখন করতে হবে (যেমন., "আগামীকাল 3 টায়", "2 ঘন্টায়")
      4. অগ্রাধিকার: 'high', 'medium', বা 'low'`,
    };
    
    return `${basePrompt}\n${languageSpecificExamples[this.currentLanguage]}`;
  }

  /**
   * Check if language is valid
   */
  private isValidLanguage(language: any): language is SupportedLanguage {
    return language in SUPPORTED_LANGUAGES;
  }

  /**
   * Get all supported languages
   */
  getAllLanguages(): LanguageConfig[] {
    return Object.values(SUPPORTED_LANGUAGES);
  }

  /**
   * Translate a key phrase (simple translations)
   */
  translatePhrase(phrase: string): string {
    const translations: Record<SupportedLanguage, Record<string, string>> = {
      en: {
        'Generating insights...': 'Generating insights...',
        'Ask More Questions': 'Ask More Questions',
        'Chat with JARVIS': 'Chat with JARVIS',
        'Set Reminder': 'Set Reminder',
      },
      hi: {
        'Generating insights...': 'अंतर्दृष्टि उत्पन्न की जा रही है...',
        'Ask More Questions': 'और सवाल पूछें',
        'Chat with JARVIS': 'JARVIS के साथ चैट करें',
        'Set Reminder': 'रिमाइंडर सेट करें',
      },
      ta: {
        'Generating insights...': 'நுண்ணறிவு உருவாக்கப்படுகிறது...',
        'Ask More Questions': 'கூடுதல் கேள்விகள் கேளுங்கள்',
        'Chat with JARVIS': 'JARVIS உடன் சேட் செய்யவும்',
        'Set Reminder': 'நினைவூட்டல் அமைக்கவும்',
      },
      te: {
        'Generating insights...': 'అంతర్దృష్టులు ఉత్పత్తి చేయబడుతున్నాయి...',
        'Ask More Questions': 'మరిన్ని ప్రశ్నలను అడగండి',
        'Chat with JARVIS': 'JARVIS తో చాట్ చేయండి',
        'Set Reminder': 'రిమైండర్‌ను సెట్ చేయండి',
      },
      kn: {
        'Generating insights...': 'ಅಂತರ್ದೃಷ್ಟಿ ಉತ್ಪಾದಿತವಾಗುತ್ತಿದೆ...',
        'Ask More Questions': 'ಹೆಚ್ಚಿನ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ',
        'Chat with JARVIS': 'JARVIS ನೊಂದಿಗೆ ಚ್ಯಾಟ್ ಮಾಡಿ',
        'Set Reminder': 'ಜ್ಞಾಪನೆ ಹೊಂದಿಸಿ',
      },
      ml: {
        'Generating insights...': 'ഉൾക്കാഴ്ച് ഉത്പാദിപ്പിക്കുന്നു...',
        'Ask More Questions': 'കൂടുതൽ ചോദ്യങ്ങൾ ചോദിക്കുക',
        'Chat with JARVIS': 'JARVIS ​​ഉമായി ചാറ്റ് ചെയ്യുക',
        'Set Reminder': 'ഓർമ്മപ്പെടുത്തൽ സെറ്റ് ചെയ്യുക',
      },
      mr: {
        'Generating insights...': 'अंतर्दृष्टी तयार केल्या जात आहेत...',
        'Ask More Questions': 'आणखी प्रश्न विचारा',
        'Chat with JARVIS': 'JARVIS सह चॅट करा',
        'Set Reminder': 'स्मरणीय सेट करा',
      },
      gu: {
        'Generating insights...': 'આંતરદૃષ્ટિ ઉત્પન્ન કરવામાં આવી રહ્યો છે...',
        'Ask More Questions': 'વધુ પ્રશ્નો પૂછો',
        'Chat with JARVIS': 'JARVIS સાથે ચેટ કરો',
        'Set Reminder': 'રીમાઈન્ડર સેટ કરો',
      },
      bn: {
        'Generating insights...': 'অন্তর্দৃষ্টি তৈরি হচ্ছে...',
        'Ask More Questions': 'আরও প্রশ্ন জিজ্ঞাসা করুন',
        'Chat with JARVIS': 'JARVIS এর সাথে চ্যাট করুন',
        'Set Reminder': 'রিমাইন্ডার সেট করুন',
      },
    };
    
    return translations[this.currentLanguage]?.[phrase] ?? phrase;
  }
}

export default new LanguageService();
