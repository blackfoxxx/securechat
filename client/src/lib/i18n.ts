export const translations = {
  en: {
    app_name: "Secure Chat",
    welcome: "Welcome",
    login: "Login",
    logout: "Logout",
    chats: "Chats",
    new_chat: "New Chat",
    type_message: "Type a message...",
    send: "Send",
    no_conversations: "No conversations yet",
    start_conversation: "Start a new conversation to begin chatting",
    get_started: "Get Started",
    go_to_chats: "Go to Chats",
    features: {
      encrypted: "End-to-End Encrypted",
      encrypted_desc: "Your messages are secured with industry-standard encryption",
      calls: "Voice & Video Calls",
      calls_desc: "Crystal clear audio and HD video calling powered by Jitsi Meet",
      rtl: "RTL Support",
      rtl_desc: "Full support for Arabic and other RTL languages",
    },
  },
  ar: {
    app_name: "الدردشة الآمنة",
    welcome: "مرحباً",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    chats: "المحادثات",
    new_chat: "محادثة جديدة",
    type_message: "اكتب رسالة...",
    send: "إرسال",
    no_conversations: "لا توجد محادثات بعد",
    start_conversation: "ابدأ محادثة جديدة للبدء في الدردشة",
    get_started: "ابدأ الآن",
    go_to_chats: "الذهاب إلى المحادثات",
    features: {
      encrypted: "تشفير من طرف إلى طرف",
      encrypted_desc: "رسائلك محمية بتشفير معياري صناعي",
      calls: "مكالمات صوتية ومرئية",
      calls_desc: "مكالمات صوتية ومرئية عالية الجودة مدعومة بـ Jitsi Meet",
      rtl: "دعم اللغات من اليمين إلى اليسار",
      rtl_desc: "دعم كامل للعربية واللغات الأخرى من اليمين إلى اليسار",
    },
  },
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
