"use client";

import { useState, useEffect } from "react";
import { Header, Footer } from "@/components/layout";
import { ThemeToggle, Button } from "@/components/ui";
import styles from "./page.module.css";

export default function SettingsPage() {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Roboto (Default)");
  const [language, setLanguage] = useState("English");

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedMotion = localStorage.getItem("healthspan-reduce-motion") === "true";
    const savedFontSize = localStorage.getItem("healthspan-font-size") || "16";
    const savedFontFamily = localStorage.getItem("healthspan-font-family") || "Roboto (Default)";
    const savedLanguage = localStorage.getItem("healthspan-language") || "English";

    setIsReducedMotion(savedMotion);
    setFontSize(parseInt(savedFontSize));
    setFontFamily(savedFontFamily);
    setLanguage(savedLanguage);

    // Apply initial states to document
    document.documentElement.setAttribute("data-reduce-motion", savedMotion.toString());
    document.documentElement.style.fontSize = `${savedFontSize}px`;
  }, []);

  return (
    <div className={styles.page}>
      <Header />
      
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Settings</h1>
          
          <div className={styles.subheadingGroup}>
            <h2 className={styles.subheading}>Preferences</h2>
            
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Appearance</h3>
              <p className={styles.sectionDescription}>
                Customize how Healthspan looks on your device.
              </p>
              <ThemeToggle />
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Font</h3>
              <p className={styles.sectionDescription}>
                Adjust the font family and size for better readability.
              </p>
              <div className={styles.controlRow}>
                <div className={styles.control}>
                  <label className={styles.label}>Font Size ({fontSize}px)</label>
                  <div className={styles.sliderContainer}>
                    <input 
                      type="range" 
                      className={styles.slider} 
                      min="12" 
                      max="24" 
                      value={fontSize}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFontSize(parseInt(val));
                        document.documentElement.style.fontSize = `${val}px`;
                        localStorage.setItem("healthspan-font-size", val);
                      }}
                    />
                    <div className={styles.defaultMarker} title="Default (16px)" />
                  </div>
                </div>
                <div className={styles.control}>
                  <label className={styles.label}>Font Family</label>
                  <select 
                    className={styles.select}
                    value={fontFamily}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFontFamily(val);
                      localStorage.setItem("healthspan-font-family", val);
                    }}
                  >
                    <option>Roboto (Default)</option>
                    <option>Open Sans</option>
                    <option>Inter</option>
                  </select>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Reduced Animations</h3>
              <p className={styles.sectionDescription}>
                Minimize motion effects throughout the application.
              </p>
            <Button 
              variant={isReducedMotion ? "primary" : "outline"} 
              size="sm"
              onClick={() => {
                const nextValue = !isReducedMotion;
                setIsReducedMotion(nextValue);
                document.documentElement.setAttribute("data-reduce-motion", nextValue.toString());
                localStorage.setItem("healthspan-reduce-motion", nextValue.toString());
              }}
            >
              {isReducedMotion ? "Reduced Motion Enabled" : "Enable Reduced Motion"}
            </Button>
            </section>
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Language</h2>
            <p className={styles.sectionDescription}>
              Select your preferred language for the interface.
            </p>
            <select 
              className={styles.select}
              value={language}
              onChange={(e) => {
                const val = e.target.value;
                setLanguage(val);
                localStorage.setItem("healthspan-language", val);
              }}
            >
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>System</h2>
            <p className={styles.sectionDescription}>
              Manage application data and clear temporary files.
            </p>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
            >Clear Cache</Button>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Account Information</h2>
            <p className={styles.sectionDescription}>
              Manage your profile details and contact information.
            </p>
            <div className={styles.placeholderText}>Account details functionality coming soon...</div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}