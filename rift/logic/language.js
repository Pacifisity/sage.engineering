// language.js
// Detects user language and provides translation utilities using Google Translate

export function detectUserLanguage() {
    if (navigator.languages && navigator.languages.length) {
        return navigator.languages[0];
    }
    return navigator.language || navigator.userLanguage || 'en';
}

// Loads Google Translate widget script dynamically
export function loadGoogleTranslate(callback) {
    if (document.getElementById('google-translate-script')) return;
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.onload = callback;
    document.body.appendChild(script);
}

// Initializes the Google Translate widget for the page
export function initGoogleTranslate(targetLang) {
    window.googleTranslateElementInit = function() {
        new window.google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: targetLang,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
        }, 'google_translate_element');
    };
    loadGoogleTranslate();
}
