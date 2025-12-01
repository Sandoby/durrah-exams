import json
import os

# Define the checkout section for each language
checkout_en = {
    "back": "Back",
    "title": "for Tutors",
    "subtitle": "Choose the plan that fits your needs",
    "monthly": "Monthly",
    "yearly": "Yearly",
    "save": "SAVE 17%",
    "save20": "SAVE 20%",
    "mostPopular": "MOST POPULAR",
    "plans": {
        "starter": {
            "name": "Free",
            "desc": "Perfect for getting started"
        },
        "pro": {
            "name": "Professional",
            "desc": "For serious educators"
        }
    },
    "selected": "Select Plan",
    "choose": "Choose",
    "secure": "Secure Checkout",
    "secureCheckout": "Secure Checkout",
    "securePayment": "Secure Payment",
    "processing": "Processing...",
    "proceed": "Proceed to Payment",
    "coupon": {
        "label": "Have a coupon code?",
        "placeholder": "Enter code",
        "apply": "Apply",
        "remove": "Remove",
        "free": "Free",
        "off": "OFF"
    },
    "summary": {
        "title": "Order Summary",
        "original": "Original Price:",
        "discount": "Discount:",
        "final": "Final Price:",
        "free": "Free"
    },
    "features": {
        "fast": {
            "title": "Lightning Fast",
            "desc": "Create exams in minutes with our AI-powered tools."
        },
        "antiCheat": {
            "title": "Anti-Cheating",
            "desc": "Advanced monitoring features including tab switching detection and fullscreen enforcement."
        },
        "interface": {
            "title": "Beautiful Interface",
            "desc": "Clean, distraction-free experience for both you and your students."
        }
    }
}

checkout_ar = {
    "back": "عودة",
    "title": "للمعلمين",
    "subtitle": "اختر الخطة التي تناسب احتياجاتك",
    "monthly": "شهري",
    "yearly": "سنوي",
    "save": "وفر 17%",
    "save20": "وفر 20%",
    "mostPopular": "الأكثر شيوعاً",
    "plans": {
        "starter": {
            "name": "مجاني",
            "desc": "مثالية للبدء"
        },
        "pro": {
            "name": "محترف",
            "desc": "للمعلمين الجادين"
        }
    },
    "selected": "اختر الخطة",
    "choose": "اختر",
    "secure": "دفع آمن",
    "secureCheckout": "دفع آمن",
    "securePayment": "دفع آمن",
    "processing": "جارٍ المعالجة...",
    "proceed": "متابعة الدفع",
    "coupon": {
        "label": "هل لديك رمز قسيمة؟",
        "placeholder": "أدخل الرمز",
        "apply": "تطبيق",
        "remove": "إزالة",
        "free": "مجاني",
        "off": "خصم"
    },
    "summary": {
        "title": "ملخص الطلب",
        "original": "السعر الأصلي:",
        "discount": "الخصم:",
        "final": "السعر النهائي:",
        "free": "مجاني"
    },
    "features": {
        "fast": {
            "title": "سريع جداً",
            "desc": "أنشئ اختبارات في دقائق باستخدام أدواتنا المدعومة بالذكاء الاصطناعي."
        },
        "antiCheat": {
            "title": "مكافحة الغش",
            "desc": "ميزات مراقبة متقدمة تشمل كشف تبديل علامات التبويب وفرض ملء الشاشة."
        },
        "interface": {
            "title": "واجهة جميلة",
            "desc": "تجربة نظيفة وخالية من المشتتات لك ولطلابك."
        }
    }
}

checkout_fr = {
    "back": "Retour",
    "title": "pour les Tuteurs",
    "subtitle": "Choisissez le plan qui correspond à vos besoins",
    "monthly": "Mensuel",
    "yearly": "Annuel",
    "save": "ÉCONOMISEZ 17%",
    "save20": "ÉCONOMISEZ 20%",
    "mostPopular": "LE PLUS POPULAIRE",
    "plans": {
        "starter": {
            "name": "Gratuit",
            "desc": "Parfait pour commencer"
        },
        "pro": {
            "name": "Professionnel",
            "desc": "Pour les éducateurs sérieux"
        }
    },
    "selected": "Sélectionner un plan",
    "choose": "Choisir",
    "secure": "Paiement sécurisé",
    "secureCheckout": "Paiement sécurisé",
    "securePayment": "Paiement sécurisé",
    "processing": "Traitement...",
    "proceed": "Procéder au paiement",
    "coupon": {
        "label": "Avez-vous un code promo ?",
        "placeholder": "Entrer le code",
        "apply": "Appliquer",
        "remove": "Retirer",
        "free": "Gratuit",
        "off": "DE RÉDUCTION"
    },
    "summary": {
        "title": "Résumé de la commande",
        "original": "Prix original :",
        "discount": "Remise :",
        "final": "Prix final :",
        "free": "Gratuit"
    },
    "features": {
        "fast": {
            "title": "Éclair Rapide",
            "desc": "Créez des examens en quelques minutes avec nos outils alimentés par l'IA."
        },
        "antiCheat": {
            "title": "Anti-Triche",
            "desc": "Fonctionnalités de surveillance avancées, y compris la détection de changement d'onglet."
        },
        "interface": {
            "title": "Belle Interface",
            "desc": "Expérience propre et sans distraction pour vous et vos étudiants."
        }
    }
}

checkout_es = {
    "back": "Atrás",
    "title": "para Tutores",
    "subtitle": "Elige el plan que se adapte a tus necesidades",
    "monthly": "Mensual",
    "yearly": "Anual",
    "save": "AHORRA 17%",
    "save20": "AHORRA 20%",
    "mostPopular": "MÁS POPULAR",
    "plans": {
        "starter": {
            "name": "Gratis",
            "desc": "Perfecto para empezar"
        },
        "pro": {
            "name": "Profesional",
            "desc": "Para educadores serios"
        }
    },
    "selected": "Seleccionar plan",
    "choose": "Elegir",
    "secure": "Pago seguro",
    "secureCheckout": "Pago seguro",
    "securePayment": "Pago seguro",
    "processing": "Procesando...",
    "proceed": "Proceder al pago",
    "coupon": {
        "label": "¿Tienes un código de cupón?",
        "placeholder": "Introduce el código",
        "apply": "Aplicar",
        "remove": "Eliminar",
        "free": "Gratis",
        "off": "DE DESCUENTO"
    },
    "summary": {
        "title": "Resumen del pedido",
        "original": "Precio original:",
        "discount": "Descuento:",
        "final": "Precio final:",
        "free": "Gratis"
    },
    "features": {
        "fast": {
            "title": "Relámpago Rápido",
            "desc": "Crea exámenes en minutos con nuestras herramientas impulsadas por IA."
        },
        "antiCheat": {
            "title": "Anti-Trampas",
            "desc": "Funciones de monitoreo avanzadas que incluyen detección de cambio de pestaña."
        },
        "interface": {
            "title": "Hermosa Interfaz",
            "desc": "Experiencia limpia y sin distracciones para ti y tus estudiantes."
        }
    }
}

base_path = r"frontend/src/locales"
langs = {
    "en": checkout_en,
    "ar": checkout_ar,
    "fr": checkout_fr,
    "es": checkout_es
}

for lang, content in langs.items():
    file_path = os.path.join(base_path, lang, "translation.json")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        data['checkout'] = content
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        print(f"Updated {lang} translation file.")
    except Exception as e:
        print(f"Error updating {lang}: {e}")
