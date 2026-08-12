'use client';

// UI string translations. Keys are stable; values are per-language.
// English is the source. Translations cover the app's visible chrome — nav,
// hero, CTAs, settings, common actions. Legal document BODIES stay English
// (authoritative); only their surrounding UI is translated.
//
// Missing keys fall back to English (see useI18n's t()), so the app never shows
// a blank — untranslated strings degrade to English rather than breaking.

export const STRINGS = {
  // ---- Nav ----
  'nav.docs':        { en:'Docs', sw:'Nyaraka', fr:'Docs', es:'Docs', ar:'المستندات', pt:'Docs', hi:'दस्तावेज़', zh:'文档', de:'Docs', am:'ሰነዶች' },
  'nav.pricing':     { en:'Pricing', sw:'Bei', fr:'Tarifs', es:'Precios', ar:'الأسعار', pt:'Preços', hi:'मूल्य', zh:'定价', de:'Preise', am:'ዋጋ' },
  'nav.github':      { en:'GitHub', sw:'GitHub', fr:'GitHub', es:'GitHub', ar:'GitHub', pt:'GitHub', hi:'GitHub', zh:'GitHub', de:'GitHub', am:'GitHub' },
  'nav.labs':        { en:'Labs', sw:'Maabara', fr:'Labs', es:'Labs', ar:'المختبرات', pt:'Labs', hi:'लैब्स', zh:'实验室', de:'Labs', am:'ላብራቶሪ' },
  'nav.signin':      { en:'Sign in', sw:'Ingia', fr:'Se connecter', es:'Iniciar sesión', ar:'تسجيل الدخول', pt:'Entrar', hi:'साइन इन', zh:'登录', de:'Anmelden', am:'ግባ' },
  'nav.console':     { en:'Go to console', sw:'Nenda kwenye console', fr:'Accéder à la console', es:'Ir a la consola', ar:'الذهاب إلى وحدة التحكم', pt:'Ir para o console', hi:'कंसोल पर जाएं', zh:'进入控制台', de:'Zur Konsole', am:'ወደ ኮንሶል ሂድ' },
  'nav.startfree':   { en:'Start for free', sw:'Anza bila malipo', fr:'Commencer gratuitement', es:'Comienza gratis', ar:'ابدأ مجانًا', pt:'Começar grátis', hi:'मुफ़्त में शुरू करें', zh:'免费开始', de:'Kostenlos starten', am:'በነጻ ጀምር' },

  // ---- Hero ----
  'hero.eyebrow':    { en:'Payment infrastructure', sw:'Miundombinu ya malipo', fr:'Infrastructure de paiement', es:'Infraestructura de pagos', ar:'بنية المدفوعات', pt:'Infraestrutura de pagamentos', hi:'भुगतान अवसंरचना', zh:'支付基础设施', de:'Zahlungsinfrastruktur', am:'የክፍያ መሠረተ ልማት' },
  'hero.title':      { en:'One integration. Every payment provider.', sw:'Uunganishaji mmoja. Kila mtoa huduma wa malipo.', fr:'Une intégration. Tous les fournisseurs de paiement.', es:'Una integración. Todos los proveedores de pago.', ar:'تكامل واحد. كل مزوّدي الدفع.', pt:'Uma integração. Todos os provedores de pagamento.', hi:'एक एकीकरण। हर भुगतान प्रदाता।', zh:'一次集成，对接所有支付提供商。', de:'Eine Integration. Alle Zahlungsanbieter.', am:'አንድ ውህደት። ሁሉም የክፍያ አቅራቢዎች።' },
  'hero.sub':        { en:'Every payment provider has a different API. Konduyt gives you one.', sw:'Kila mtoa huduma wa malipo ana API tofauti. Konduyt inakupa moja.', fr:'Chaque fournisseur de paiement a une API différente. Konduyt vous en donne une seule.', es:'Cada proveedor de pago tiene una API distinta. Konduyt te da una sola.', ar:'لكل مزوّد دفع واجهة برمجية مختلفة. يمنحك Konduyt واحدة.', pt:'Cada provedor de pagamento tem uma API diferente. A Konduyt te dá uma só.', hi:'हर भुगतान प्रदाता का API अलग होता है। Konduyt आपको एक देता है।', zh:'每个支付提供商都有不同的 API。Konduyt 让你只用一个。', de:'Jeder Zahlungsanbieter hat eine andere API. Konduyt gibt dir eine.', am:'እያንዳንዱ የክፍያ አቅራቢ የተለየ API አለው። Konduyt አንድ ይሰጥሃል።' },
  'hero.viewdemo':   { en:'View demo', sw:'Tazama onyesho', fr:'Voir la démo', es:'Ver demo', ar:'عرض التجربة', pt:'Ver demonstração', hi:'डेमो देखें', zh:'查看演示', de:'Demo ansehen', am:'ማሳያ ይመልከቱ' },
  'hero.viewdocs':   { en:'View documentation', sw:'Tazama nyaraka', fr:'Voir la documentation', es:'Ver documentación', ar:'عرض التوثيق', pt:'Ver documentação', hi:'दस्तावेज़ देखें', zh:'查看文档', de:'Dokumentation ansehen', am:'ሰነዶችን ይመልከቱ' },

  // ---- Common actions ----
  'common.copy':     { en:'Copy', sw:'Nakili', fr:'Copier', es:'Copiar', ar:'نسخ', pt:'Copiar', hi:'कॉपी', zh:'复制', de:'Kopieren', am:'ቅዳ' },
  'common.copied':   { en:'Copied', sw:'Imenakiliwa', fr:'Copié', es:'Copiado', ar:'تم النسخ', pt:'Copiado', hi:'कॉपी हो गया', zh:'已复制', de:'Kopiert', am:'ተቀድቷል' },
  'common.back':     { en:'Back to Konduyt', sw:'Rudi Konduyt', fr:'Retour à Konduyt', es:'Volver a Konduyt', ar:'العودة إلى Konduyt', pt:'Voltar para Konduyt', hi:'Konduyt पर वापस', zh:'返回 Konduyt', de:'Zurück zu Konduyt', am:'ወደ Konduyt ተመለስ' },
  'common.loading':  { en:'Loading…', sw:'Inapakia…', fr:'Chargement…', es:'Cargando…', ar:'جارٍ التحميل…', pt:'Carregando…', hi:'लोड हो रहा है…', zh:'加载中…', de:'Wird geladen…', am:'በመጫን ላይ…' },

  // ---- Settings ----
  'settings.title':      { en:'Settings', sw:'Mipangilio', fr:'Paramètres', es:'Configuración', ar:'الإعدادات', pt:'Configurações', hi:'सेटिंग्स', zh:'设置', de:'Einstellungen', am:'ቅንብሮች' },
  'settings.sub':        { en:'Manage your account, appearance and preferences.', sw:'Dhibiti akaunti, muonekano na mapendeleo yako.', fr:'Gérez votre compte, l\u2019apparence et vos préférences.', es:'Gestiona tu cuenta, apariencia y preferencias.', ar:'أدر حسابك ومظهرك وتفضيلاتك.', pt:'Gerencie sua conta, aparência e preferências.', hi:'अपना खाता, रूप और प्राथमिकताएँ प्रबंधित करें।', zh:'管理你的账户、外观和偏好设置。', de:'Verwalte dein Konto, Erscheinungsbild und Einstellungen.', am:'መለያዎን፣ መልክዎን እና ምርጫዎችዎን ያስተዳድሩ።' },
  'settings.profile':    { en:'Profile', sw:'Wasifu', fr:'Profil', es:'Perfil', ar:'الملف الشخصي', pt:'Perfil', hi:'प्रोफ़ाइल', zh:'个人资料', de:'Profil', am:'መገለጫ' },
  'settings.appearance': { en:'Appearance', sw:'Muonekano', fr:'Apparence', es:'Apariencia', ar:'المظهر', pt:'Aparência', hi:'रूप', zh:'外观', de:'Erscheinungsbild', am:'መልክ' },
  'settings.darkmode':   { en:'Dark mode', sw:'Hali ya giza', fr:'Mode sombre', es:'Modo oscuro', ar:'الوضع الداكن', pt:'Modo escuro', hi:'डार्क मोड', zh:'深色模式', de:'Dunkelmodus', am:'ጨለማ ሁነታ' },
  'settings.darkmode.d': { en:'Switch between light and dark across the whole site.', sw:'Badilisha kati ya mwanga na giza kwenye tovuti nzima.', fr:'Basculez entre clair et sombre sur tout le site.', es:'Cambia entre claro y oscuro en todo el sitio.', ar:'بدّل بين الفاتح والداكن في الموقع بأكمله.', pt:'Alterne entre claro e escuro em todo o site.', hi:'पूरी साइट पर हल्के और गहरे के बीच स्विच करें।', zh:'在整个网站切换浅色和深色。', de:'Wechsle im gesamten Portal zwischen hell und dunkel.', am:'በጠቅላላው ጣቢያ በብርሃን እና በጨለማ መካከል ይቀያይሩ።' },
  'settings.language':   { en:'Language', sw:'Lugha', fr:'Langue', es:'Idioma', ar:'اللغة', pt:'Idioma', hi:'भाषा', zh:'语言', de:'Sprache', am:'ቋንቋ' },
  'settings.language.d': { en:'Choose your language. It applies across the whole site.', sw:'Chagua lugha yako. Inatumika kwenye tovuti nzima.', fr:'Choisissez votre langue. Elle s\u2019applique à tout le site.', es:'Elige tu idioma. Se aplica a todo el sitio.', ar:'اختر لغتك. تُطبَّق على الموقع بأكمله.', pt:'Escolha seu idioma. Aplica-se a todo o site.', hi:'अपनी भाषा चुनें। यह पूरी साइट पर लागू होती है।', zh:'选择你的语言，将应用于整个网站。', de:'Wähle deine Sprache. Sie gilt für das gesamte Portal.', am:'ቋንቋዎን ይምረጡ። በጠቅላላው ጣቢያ ላይ ይተገበራል።' },
  'settings.plan':       { en:'Plan', sw:'Mpango', fr:'Forfait', es:'Plan', ar:'الخطة', pt:'Plano', hi:'योजना', zh:'套餐', de:'Tarif', am:'እቅድ' },
  'settings.currentplan':{ en:'Current plan', sw:'Mpango wa sasa', fr:'Forfait actuel', es:'Plan actual', ar:'الخطة الحالية', pt:'Plano atual', hi:'वर्तमान योजना', zh:'当前套餐', de:'Aktueller Tarif', am:'የአሁኑ እቅድ' },
  'settings.viewpricing':{ en:'View pricing', sw:'Tazama bei', fr:'Voir les tarifs', es:'Ver precios', ar:'عرض الأسعار', pt:'Ver preços', hi:'मूल्य देखें', zh:'查看定价', de:'Preise ansehen', am:'ዋጋ ይመልከቱ' },
  'settings.resources':  { en:'Resources', sw:'Rasilimali', fr:'Ressources', es:'Recursos', ar:'الموارد', pt:'Recursos', hi:'संसाधन', zh:'资源', de:'Ressourcen', am:'መርጃዎች' },
  'settings.documentation':{ en:'Documentation', sw:'Nyaraka', fr:'Documentation', es:'Documentación', ar:'التوثيق', pt:'Documentação', hi:'दस्तावेज़', zh:'文档', de:'Dokumentation', am:'ሰነዶች' },
  'settings.about':      { en:'About Konduyt', sw:'Kuhusu Konduyt', fr:'À propos de Konduyt', es:'Acerca de Konduyt', ar:'حول Konduyt', pt:'Sobre a Konduyt', hi:'Konduyt के बारे में', zh:'关于 Konduyt', de:'Über Konduyt', am:'ስለ Konduyt' },
  'settings.account':    { en:'Account', sw:'Akaunti', fr:'Compte', es:'Cuenta', ar:'الحساب', pt:'Conta', hi:'खाता', zh:'账户', de:'Konto', am:'መለያ' },
  'settings.logout':     { en:'Log out', sw:'Toka', fr:'Se déconnecter', es:'Cerrar sesión', ar:'تسجيل الخروج', pt:'Sair', hi:'लॉग आउट', zh:'退出登录', de:'Abmelden', am:'ውጣ' },
  'settings.logout.d':   { en:'Sign out of this device.', sw:'Toka kwenye kifaa hiki.', fr:'Se déconnecter de cet appareil.', es:'Cerrar sesión en este dispositivo.', ar:'تسجيل الخروج من هذا الجهاز.', pt:'Sair deste dispositivo.', hi:'इस डिवाइस से साइन आउट करें।', zh:'从此设备退出登录。', de:'Von diesem Gerät abmelden.', am:'ከዚህ መሣሪያ ውጣ።' },
  'settings.delete':     { en:'Delete account', sw:'Futa akaunti', fr:'Supprimer le compte', es:'Eliminar cuenta', ar:'حذف الحساب', pt:'Excluir conta', hi:'खाता हटाएं', zh:'删除账户', de:'Konto löschen', am:'መለያ ሰርዝ' },
  'settings.delete.d':   { en:'Permanently delete your account, projects and connected credentials.', sw:'Futa kabisa akaunti, miradi na vitambulisho vyako vilivyounganishwa.', fr:'Supprimez définitivement votre compte, vos projets et vos identifiants connectés.', es:'Elimina permanentemente tu cuenta, proyectos y credenciales conectadas.', ar:'احذف نهائيًا حسابك ومشاريعك وبيانات الاعتماد المتصلة.', pt:'Exclua permanentemente sua conta, projetos e credenciais conectadas.', hi:'अपना खाता, प्रोजेक्ट और जुड़े क्रेडेंशियल स्थायी रूप से हटाएं।', zh:'永久删除你的账户、项目和已连接的凭据。', de:'Lösche dein Konto, deine Projekte und verbundenen Zugangsdaten dauerhaft.', am:'መለያዎን፣ ፕሮጀክቶችዎን እና የተገናኙ መረጃዎችን በቋሚነት ይሰርዙ።' },
};
