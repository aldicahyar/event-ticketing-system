'use client';

import React, { useState, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, FileText, ChevronRight } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/ui/Footer';
import { PRIVACY_SECTIONS, PRIVACY_META, type PrivacyBlock } from '@/lib/privacy-data';

const EASE = [0.16, 1, 0.3, 1] as const;

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

const staggerItem = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export default function PrivacyPage() {
  const { scrollYProgress } = useScroll();
  const progressScale = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  const [activeSection, setActiveSection] = useState<string>(PRIVACY_SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = visible[0].target.getAttribute('data-section-id');
          if (id) setActiveSection(id);
        }
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );
    PRIVACY_SECTIONS.forEach((s) => {
      const el = document.getElementById(`section-${s.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar
        links={[
          { href: '/events', label: 'Events' },
          { href: '/venues', label: 'Venues' },
          { href: '/help', label: 'Help' },
        ]}
      />

      <motion.div
        className="fixed top-16 left-0 right-0 h-[2px] bg-white z-40 origin-left"
        style={{ scaleX: progressScale }}
        aria-hidden="true"
      />

      {/* Hero */}
      <motion.section
        initial="initial"
        animate="animate"
        variants={pageVariants}
        className="pt-32 pb-10 md:pt-40 md:pb-14 border-b border-mono-dark-grey"
        aria-labelledby="privacy-heading"
      >
        <div className="container mx-auto px-4 md:px-6">
          <motion.p
            variants={staggerItem}
            className="text-mono-light-grey uppercase tracking-widest text-xs mb-3"
          >
            {"// LEGAL_DOCUMENT"}
          </motion.p>
          <motion.h1
            variants={staggerItem}
            id="privacy-heading"
            className="font-display font-bold text-4xl sm:text-6xl md:text-7xl uppercase text-white mb-6"
          >
            Privacy{' '}
            <span
              className="text-transparent stroke-text"
              style={{ WebkitTextStroke: '2px white' }}
              aria-hidden="true"
            >
              Policy
            </span>
          </motion.h1>
          <motion.p
            variants={staggerItem}
            className="text-base md:text-lg text-[#CCCCCC] max-w-2xl mb-6"
          >
            How we collect, use, and protect your personal data. This policy is issued in compliance
            with Indonesian Law No. 27 of 2022 on Personal Data Protection (UU PDP).
          </motion.p>
          <motion.div
            variants={staggerItem}
            className="flex flex-wrap items-center gap-4 md:gap-6 border-t border-mono-dark-grey pt-4 text-xs"
          >
            <span className="flex items-center gap-2 text-mono-light-grey uppercase tracking-widest">
              <FileText className="w-3 h-3" aria-hidden="true" />
              Last Updated: <span className="text-white font-bold">{PRIVACY_META.lastUpdated}</span>
            </span>
            <span className="flex items-center gap-2 text-mono-light-grey uppercase tracking-widest">
              Effective Date: <span className="text-white font-bold">{PRIVACY_META.effectiveDate}</span>
            </span>
          </motion.div>
        </div>
      </motion.section>

      {/* Body: TOC + Content */}
      <section className="py-10 md:py-14" aria-label="Privacy Policy content">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-14">
            {/* Sticky TOC */}
            <aside className="hidden lg:block lg:col-span-1">
              <nav
                className="lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-4"
                aria-label="Table of contents"
              >
                <h2 className="font-bold uppercase text-[10px] tracking-widest text-mono-light-grey mb-4">
                  {"// TABLE_OF_CONTENTS"}
                </h2>
                <ol className="space-y-1">
                  {PRIVACY_SECTIONS.map((section) => {
                    const is_active = activeSection === section.id;
                    return (
                      <li key={section.id}>
                        <Link
                          href={`#section-${section.id}`}
                          aria-current={is_active ? 'true' : undefined}
                          className={`flex items-start gap-2 py-2 px-3 text-xs uppercase tracking-wide border-l-2 transition-colors min-h-touch ${
                            is_active
                              ? 'border-white text-white bg-white/5 font-bold'
                              : 'border-transparent text-mono-light-grey hover:text-white hover:border-mono-dark-grey'
                          } focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2`}
                        >
                          <span className="font-mono tabular-nums shrink-0 text-mono-dark-grey">
                            {String(section.number).padStart(2, '0')}
                          </span>
                          <span>{section.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </aside>

            {/* Content */}
            <div className="lg:col-span-3">
              {/* Mobile TOC */}
              <details className="lg:hidden border border-mono-dark-grey mb-8 group">
                <summary className="cursor-pointer px-4 py-3 flex items-center justify-between text-xs uppercase tracking-widest text-white font-bold min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
                  <span>{"// TABLE_OF_CONTENTS"}</span>
                  <ChevronRight
                    className="w-3 h-3 transition-transform group-open:rotate-90"
                    aria-hidden="true"
                  />
                </summary>
                <ol className="border-t border-mono-dark-grey py-2">
                  {PRIVACY_SECTIONS.map((section) => (
                    <li key={section.id}>
                      <Link
                        href={`#section-${section.id}`}
                        className="flex items-start gap-2 py-2 px-4 text-xs uppercase tracking-wide text-mono-light-grey hover:text-white hover:bg-white/5 min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                      >
                        <span className="font-mono tabular-nums shrink-0 text-mono-dark-grey">
                          {String(section.number).padStart(2, '0')}
                        </span>
                        <span>{section.title}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </details>

              {/* Sections */}
              <div className="max-w-3xl">
                {PRIVACY_SECTIONS.map((section) => (
                  <motion.article
                    key={section.id}
                    id={`section-${section.id}`}
                    data-section-id={section.id}
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, amount: 0.05 }}
                    variants={staggerItem}
                    className="scroll-mt-24 mb-12 last:mb-0"
                    aria-labelledby={`heading-${section.id}`}
                  >
                    <h2
                      id={`heading-${section.id}`}
                      className="font-display font-bold text-xl md:text-2xl uppercase text-white mb-4 flex items-baseline gap-3"
                    >
                      <span className="text-mono-dark-grey tabular-nums text-sm font-mono">
                        {String(section.number).padStart(2, '0')}
                      </span>
                      <span>{section.title}</span>
                    </h2>
                    <div className="space-y-4">
                      {section.body.map((block, i) => (
                        <PrivacyBlockRenderer key={i} block={block} />
                      ))}
                    </div>
                  </motion.article>
                ))}

                {/* Footer CTA */}
                <motion.div
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true, amount: 0.15 }}
                  variants={staggerItem}
                  className="border-2 border-mono-dark-grey p-6 md:p-8 mt-4"
                >
                  <h2 className="font-display font-bold text-lg uppercase text-white mb-2">
                    Privacy Questions?
                  </h2>
                  <p className="text-sm text-[#CCCCCC] mb-4">
                    Contact our Data Protection team for data requests or policy questions.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/help/contact"
                      className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                    >
                      Submit a Request <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </Link>
                    <Link
                      href="/cookies"
                      className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-transparent text-white font-bold uppercase tracking-wide hover:bg-white hover:text-black border-2 border-mono-dark-grey hover:border-white transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                    >
                      Cookie Policy
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ---------- helpers ---------- */

function PrivacyBlockRenderer({ block }: { block: PrivacyBlock }) {
  switch (block.type) {
    case 'paragraph':
      return <p className="text-sm md:text-base text-[#CCCCCC] leading-relaxed">{block.text}</p>;

    case 'heading':
      return (
        <h3 className="font-bold uppercase text-sm tracking-widest text-white pt-2">{block.text}</h3>
      );

    case 'list':
      return (
        <ul className="space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm md:text-base text-[#CCCCCC]">
              <span
                className="text-mono-light-grey mt-2 shrink-0 w-1.5 h-1.5 bg-mono-light-grey"
                aria-hidden="true"
              />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      );

    case 'definition':
      return (
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 border-b border-mono-dark-grey pb-3">
          <dt className="text-sm font-bold text-white uppercase tracking-wide">{block.term}</dt>
          <dd className="sm:col-span-2 text-sm md:text-base text-[#CCCCCC] leading-relaxed">
            {block.definition}
          </dd>
        </dl>
      );

    default:
      return null;
  }
}
