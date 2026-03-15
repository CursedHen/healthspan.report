import Link from "next/link";
import Image from "next/image";
import fullLogo from "@/Healthspan Logo.png";
import { SubscribeForm, SuggestionForm } from "@/components/ui";
import styles from "./Footer.module.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brandBlock}>
          <Link href="/" className={styles.footerLogoLink} aria-label="Healthspan home">
            <Image
              src={fullLogo}
              alt="Healthspan"
              className={styles.footerLogo}
              priority
            />
          </Link>

          <nav className={styles.aboutLinks} aria-label="Footer links">
            <h4>About</h4>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Use</Link>
            <Link href="/advertise">Advertise with Us</Link>
            <Link href="/legal">Legal</Link>
          </nav>
        </div>

        <div className={styles.formGrid}>
          <section className={styles.formColumn}>
            <h4 className={styles.columnTitle}>Subscribe</h4>
            <SubscribeForm variant="stacked" />
          </section>

          <section className={styles.formColumn}>
            <h4 className={styles.columnTitle}>Suggestions</h4>
            <SuggestionForm />
          </section>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© {currentYear} Healthspan. All rights reserved.</p>
      </div>
    </footer>
  );
}
