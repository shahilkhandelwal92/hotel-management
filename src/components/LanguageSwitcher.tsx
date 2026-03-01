"use client";

import { useEffect } from "react";
import Script from "next/script";

export function LanguageSwitcher() {
    useEffect(() => {
        (window as any).googleTranslateElementInit = () => {
            new (window as any).google.translate.TranslateElement(
                {
                    pageLanguage: 'en',
                    layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE
                },
                'google_translate_element'
            );
        };
    }, []);

    return (
        <div style={{ display: 'flex', alignItems: 'center', marginRight: '10px' }}>
            <div id="google_translate_element"></div>
            <Script
                src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
                strategy="lazyOnload"
            />
            {/* Custom Styles to make the Google Widget match our premium theme */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .goog-te-combo {
                    padding: 0.4rem;
                    border-radius: 8px;
                    background: var(--bg-secondary) !important;
                    color: var(--text-primary) !important;
                    border: 1px solid var(--border-color) !important;
                    outline: none;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 0.9rem;
                }
                /* Hide the top Google Translate banner */
                .goog-te-banner-frame.skiptranslate {
                    display: none !important;
                }
                body {
                    top: 0px !important; 
                }
                /* Hide the 'Powered by Google' branding if desired (optional) */
                .goog-logo-link {
                    display: none !important;
                }
                .goog-te-gadget {
                    color: transparent !important;
                    font-size: 0px;
                }
            `}} />
        </div>
    );
}
