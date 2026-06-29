import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – Nodebase",
  description: "Privacy Policy for Nodebase",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-sm leading-relaxed text-foreground">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mb-10 text-muted-foreground">Last updated: June 29, 2026</p>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">1. Introduction</h2>
        <p>
          Nodebase ("we", "us", or "our") operates a workflow automation and messaging platform.
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information
          when you use our services, including integrations with WhatsApp via the Meta Business
          Platform.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">2. Information We Collect</h2>
        <p className="mb-3">We may collect the following categories of information:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Account information:</strong> name, email address, and organization details
            provided during registration.
          </li>
          <li>
            <strong>Messaging data:</strong> content of messages sent and received through connected
            channels (WhatsApp, Instagram, etc.) solely to deliver and operate the service.
          </li>
          <li>
            <strong>Usage data:</strong> log files, IP addresses, browser type, pages visited, and
            timestamps.
          </li>
          <li>
            <strong>Integration credentials:</strong> OAuth tokens and API keys required to connect
            third-party services. These are stored encrypted and never shared.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">3. How We Use Your Information</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>To provide, operate, and improve our platform and services.</li>
          <li>To send and receive messages on your behalf through connected channels.</li>
          <li>To authenticate users and protect account security.</li>
          <li>To comply with legal obligations and enforce our Terms of Service.</li>
          <li>To respond to support requests and communicate service updates.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">4. WhatsApp and Meta Platform Data</h2>
        <p className="mb-3">
          Our integration with WhatsApp is governed by the{" "}
          <a
            href="https://www.whatsapp.com/legal/business-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            WhatsApp Business Policy
          </a>{" "}
          and the{" "}
          <a
            href="https://developers.facebook.com/policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Meta Platform Policy
          </a>
          . Specifically:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Message content transmitted via the WhatsApp Business API is processed only to deliver
            messages and is not used for advertising or sold to third parties.
          </li>
          <li>
            We do not store WhatsApp messages longer than necessary to operate the service.
          </li>
          <li>
            End users may opt out of communications at any time by replying <strong>STOP</strong> or
            contacting the business directly.
          </li>
          <li>
            We comply with Meta's data deletion requirements. To request deletion of your data,
            contact us at the address below.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">5. Data Sharing and Disclosure</h2>
        <p className="mb-3">We do not sell your personal data. We may share data with:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Service providers:</strong> third-party vendors (hosting, database, email) who
            process data on our behalf under strict confidentiality agreements.
          </li>
          <li>
            <strong>Legal requirements:</strong> when required by law, court order, or governmental
            authority.
          </li>
          <li>
            <strong>Business transfers:</strong> in connection with a merger, acquisition, or sale of
            assets, with notice provided to affected users.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">6. Data Retention</h2>
        <p>
          We retain personal data for as long as your account is active or as needed to provide
          services. You may request deletion of your account and associated data at any time.
          Messaging logs may be retained for up to 90 days for operational and compliance purposes
          before permanent deletion.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">7. Security</h2>
        <p>
          We implement industry-standard security measures including encryption at rest and in
          transit, access controls, and regular security audits. No method of transmission over the
          Internet is 100% secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">8. Your Rights</h2>
        <p className="mb-3">
          Depending on your jurisdiction, you may have the right to:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your data.</li>
          <li>Object to or restrict certain processing activities.</li>
          <li>Data portability where technically feasible.</li>
        </ul>
        <p className="mt-3">
          To exercise these rights, contact us at{" "}
          <a href="mailto:privacy@nodebase.app" className="underline">
            privacy@nodebase.app
          </a>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">9. Cookies</h2>
        <p>
          We use essential cookies to maintain your session and preferences. No third-party
          advertising cookies are used.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify registered users of
          material changes via email or an in-app notice. Continued use of the service after changes
          take effect constitutes acceptance of the updated policy.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">11. Contact Us</h2>
        <p>
          If you have questions or concerns about this Privacy Policy or our data practices, please
          contact:
        </p>
        <address className="mt-3 not-italic">
          <strong>Nodebase</strong>
          <br />
          <a href="mailto:privacy@nodebase.app" className="underline">
            privacy@nodebase.app
          </a>
        </address>
      </section>
    </main>
  );
}
