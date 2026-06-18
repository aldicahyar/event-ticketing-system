'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/ui/Footer';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Briefcase,
  Users,
  Calendar,
  CheckCircle,
  Upload,
  Linkedin,
  Globe,
  FileText,
  AlertCircle,
  Clock,
  Code,
  Sparkles,
} from 'lucide-react';
import {
  getPositionById,
  getRelatedPositions,
  formatSalary,
  POSITION_TYPE_LABELS,
  EXPERIENCE_LABELS,
} from '@/lib/careers-data';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

interface ApplicationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedin: string;
  portfolio: string;
  resumeName: string;
  coverLetter: string;
  source: string;
}

const SOURCE_OPTIONS = [
  'LinkedIn',
  'Twitter / X',
  'Instagram',
  'Job Board (Kalibrr, Glints)',
  'Referral from current employee',
  'Company website',
  'Other',
];

export default function CareerDetailPage() {
  const params = useParams<{ id: string }>();
  const positionId = params?.id ?? '';
  const position = useMemo(() => getPositionById(positionId), [positionId]);
  const related = useMemo(() => getRelatedPositions(positionId, 3), [positionId]);

  const [formData, setFormData] = useState<ApplicationFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedin: '',
    portfolio: '',
    resumeName: '',
    coverLetter: '',
    source: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ApplicationFormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  if (!position) {
    return (
      <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
        <Navbar
          links={[
            { href: '/events', label: 'Events' },
            { href: '/lineup', label: 'Lineup' },
            { href: '/help', label: 'Help' },
          ]}
        />
        <section className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center pt-20">
          <div className="border-2 border-mono-dark-grey p-8 md:p-12 max-w-md w-full">
            <AlertCircle className="w-12 h-12 text-white mx-auto mb-4" aria-hidden="true" />
            <h1 className="font-display font-bold text-3xl uppercase mb-2">Position Not Found</h1>
            <p className="text-mono-light-grey text-sm uppercase tracking-widest mb-6">
              // 404_ROLE_DOES_NOT_EXIST
            </p>
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 px-6 py-4 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Careers
            </Link>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const salaryLabel = formatSalary(position.salaryMin, position.salaryMax, position.currency);
  const postedDateFormatted = new Date(position.postedDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const deadlineFormatted = new Date(position.applicationDeadline).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(position.applicationDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  function validate(): boolean {
    const e: Partial<Record<keyof ApplicationFormData, string>> = {};
    if (!formData.firstName.trim()) e.firstName = 'First name is required';
    if (!formData.lastName.trim()) e.lastName = 'Last name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email format';
    if (!formData.resumeName) e.resumeName = 'Resume / CV is required';
    if (!formData.coverLetter.trim()) e.coverLetter = 'Tell us why you want to join';
    if (formData.linkedin && !/^https?:\/\//i.test(formData.linkedin))
      e.linkedin = 'Must be a valid URL (https://...)';
    if (formData.portfolio && !/^https?:\/\//i.test(formData.portfolio))
      e.portfolio = 'Must be a valid URL (https://...)';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleFileClick() {
    // Mockup: in real implementation this opens file picker
    // For now we simulate selecting a file
    const fakeNames = ['resume-john-doe.pdf', 'cv-2025.pdf', 'John_Doe_CV.docx'];
    const random = fakeNames[Math.floor(Math.random() * fakeNames.length)];
    setFormData((prev) => ({ ...prev, resumeName: random }));
    if (errors.resumeName) setErrors((prev) => ({ ...prev, resumeName: undefined }));
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) {
      const firstError = document.querySelector('[aria-invalid="true"]') as HTMLElement | null;
      firstError?.focus();
      return;
    }
    // Mockup submission: generate fake application ID
    const id = `APP-${Date.now().toString(36).toUpperCase()}`;
    setTicketId(id);
    setSubmitted(true);
  }

  function resetForm() {
    setSubmitted(false);
    setTicketId('');
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      linkedin: '',
      portfolio: '',
      resumeName: '',
      coverLetter: '',
      source: '',
    });
    setErrors({});
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar
        links={[
          { href: '/events', label: 'Events' },
          { href: '/lineup', label: 'Lineup' },
          { href: '/help', label: 'Help' },
        ]}
      />

      {/* Back link */}
      <div className="pt-20">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-mono-light-grey hover:text-white transition-colors min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            <ArrowLeft className="w-3 h-3" aria-hidden="true" /> All Positions
          </Link>
        </div>
      </div>

      {/* Hero / Header */}
      <motion.section
        initial="initial"
        animate="animate"
        variants={pageVariants}
        className="border-b border-mono-dark-grey pb-10 md:pb-14"
        aria-labelledby="position-title"
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="text-[10px] uppercase tracking-widest bg-white text-black px-2 py-0.5">
              {position.department}
            </span>
            <span className="text-[10px] uppercase tracking-widest border border-mono-dark-grey text-mono-light-grey px-2 py-0.5">
              {POSITION_TYPE_LABELS[position.type]}
            </span>
            <span className="text-[10px] uppercase tracking-widest border border-mono-dark-grey text-mono-light-grey px-2 py-0.5">
              {EXPERIENCE_LABELS[position.experienceLevel]}
            </span>
            {daysLeft <= 7 && daysLeft > 0 && (
              <span className="text-[10px] uppercase tracking-widest bg-red-500/20 border border-red-500 text-red-400 px-2 py-0.5">
                Closes in {daysLeft}d
              </span>
            )}
          </div>

          <h1
            id="position-title"
            className="font-display font-bold text-3xl sm:text-5xl md:text-6xl uppercase text-white mb-6"
          >
            {position.title}
          </h1>

          <p className="text-base md:text-lg text-[#CCCCCC] max-w-3xl mb-8">{position.description}</p>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 border-t border-mono-dark-grey pt-6">
            <MetaItem icon={MapPin} label="Location" value={position.location} />
            <MetaItem icon={Briefcase} label="Team" value={position.team} />
            <MetaItem icon={Users} label="Reports to" value={position.reportsTo} />
            <MetaItem icon={Calendar} label="Posted" value={postedDateFormatted} />
            <MetaItem icon={Clock} label="Closes" value={deadlineFormatted} />
          </div>

          {/* Salary + CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-mono-light-grey mb-1">Compensation</p>
              <p className="font-display font-bold text-2xl uppercase text-white">{salaryLabel}</p>
            </div>
            <a
              href="#apply"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            >
              Apply Now <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </motion.section>

      {/* Body: details + sidebar */}
      <section className="py-12 md:py-16 border-b border-mono-dark-grey" aria-label="Job details">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
            {/* Left: content */}
            <div className="lg:col-span-2 space-y-12">
              {/* Overview / Description extended */}
              <motion.div variants={staggerItem} initial="initial" whileInView="animate" viewport={{ once: true }}>
                <h2 className="font-display font-bold text-xl md:text-2xl uppercase text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" aria-hidden="true" /> The Role
                </h2>
                <p className="text-sm md:text-base text-[#CCCCCC] leading-relaxed">
                  {position.description} You will join the {position.team} team and report directly to the{' '}
                  {position.reportsTo}. This is a {POSITION_TYPE_LABELS[position.type].toLowerCase()} role based in{' '}
                  {position.location}.
                </p>
              </motion.div>

              {/* Responsibilities */}
              <motion.div variants={staggerItem} initial="initial" whileInView="animate" viewport={{ once: true }}>
                <h2 className="font-display font-bold text-xl md:text-2xl uppercase text-white mb-4">
                  What You&apos;ll Do
                </h2>
                <ul className="space-y-3">
                  {position.responsibilities.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm md:text-base text-[#CCCCCC]">
                      <span
                        className="text-white font-bold mt-0.5 shrink-0"
                        aria-hidden="true"
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Requirements */}
              <motion.div variants={staggerItem} initial="initial" whileInView="animate" viewport={{ once: true }}>
                <h2 className="font-display font-bold text-xl md:text-2xl uppercase text-white mb-4">
                  What We&apos;re Looking For
                </h2>
                <ul className="space-y-3">
                  {position.requirements.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm md:text-base text-[#CCCCCC]">
                      <CheckCircle className="w-4 h-4 text-white mt-1 shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Nice to haves */}
              {position.niceToHaves && position.niceToHaves.length > 0 && (
                <motion.div variants={staggerItem} initial="initial" whileInView="animate" viewport={{ once: true }}>
                  <h2 className="font-display font-bold text-xl md:text-2xl uppercase text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" aria-hidden="true" /> Nice to Have
                  </h2>
                  <ul className="space-y-3">
                    {position.niceToHaves.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm md:text-base text-[#CCCCCC]">
                        <span className="text-mono-light-grey mt-0.5 shrink-0" aria-hidden="true">
                          +
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Tech stack */}
              {position.techStack && position.techStack.length > 0 && (
                <motion.div variants={staggerItem} initial="initial" whileInView="animate" viewport={{ once: true }}>
                  <h2 className="font-display font-bold text-xl md:text-2xl uppercase text-white mb-4 flex items-center gap-2">
                    <Code className="w-5 h-5" aria-hidden="true" /> Tech Stack
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {position.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="text-xs uppercase tracking-widest border border-mono-dark-grey hover:border-white transition-colors px-3 py-2 text-white"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right: summary sidebar */}
            <aside className="lg:col-span-1 order-first lg:order-last">
              <div className="lg:sticky lg:top-24 space-y-4">
                <div className="border border-mono-dark-grey p-6 bg-black">
                  <h2 className="font-bold uppercase text-xs tracking-widest text-mono-light-grey mb-4">
                    Quick Summary
                  </h2>
                  <dl className="space-y-3 text-sm">
                    <SummaryRow label="Department" value={position.department} />
                    <SummaryRow label="Type" value={POSITION_TYPE_LABELS[position.type]} />
                    <SummaryRow label="Level" value={EXPERIENCE_LABELS[position.experienceLevel]} />
                    <SummaryRow label="Location" value={position.location} />
                    <SummaryRow label="Team" value={position.team} />
                    <SummaryRow label="Compensation" value={salaryLabel} />
                    <SummaryRow label="Closing" value={`${deadlineFormatted} (${daysLeft}d left)`} />
                  </dl>
                  <a
                    href="#apply"
                    className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    Apply Now <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </a>
                </div>
                <div className="border border-mono-dark-grey p-6 bg-white/5">
                  <p className="text-xs text-[#CCCCCC] leading-relaxed">
                    <span className="font-bold uppercase text-white block mb-1">Know someone?</span>
                    Referrals are welcome. Share this role with your network.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Application form */}
      <section
        id="apply"
        className="py-16 md:py-24 border-b border-mono-dark-grey scroll-mt-20"
        aria-labelledby="apply-heading"
      >
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <h2 id="apply-heading" className="font-display font-bold text-3xl md:text-4xl uppercase text-white mb-2">
            Apply for this Role
          </h2>
          <p className="text-mono-light-grey uppercase tracking-widest text-xs mb-10">
            // SUBMIT_YOUR_APPLICATION_BELOW
          </p>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="border-2 border-white p-8 md:p-10 text-center"
              >
                <CheckCircle className="w-16 h-16 text-white mx-auto mb-4" aria-hidden="true" />
                <h3 className="font-display font-bold text-2xl md:text-3xl uppercase text-white mb-2">
                  Application Submitted
                </h3>
                <p className="text-[#CCCCCC] mb-1">Thank you for your interest, {formData.firstName}.</p>
                <p className="text-mono-light-grey text-sm mb-6">
                  Your application reference: <span className="font-mono font-bold text-white">{ticketId}</span>
                </p>
                <p className="text-xs text-mono-light-grey uppercase tracking-widest mb-8">
                  // OUR_TEAM_WILL_REVIEW_AND_RESPOND_WITHIN_5_BUSINESS_DAYS
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/careers"
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Browse More Roles
                  </Link>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-transparent text-white font-bold uppercase tracking-wide hover:bg-white hover:text-black border-2 border-white transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    Submit Another
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                noValidate
                className="space-y-6"
              >
                {/* Name row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    id="apply-firstName"
                    label="First Name"
                    required
                    autoComplete="given-name"
                    error={errors.firstName}
                  >
                    <input
                      id="apply-firstName"
                      type="text"
                      name="firstName"
                      autoComplete="given-name"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                      required
                      aria-invalid={!!errors.firstName}
                      aria-describedby={errors.firstName ? 'apply-firstName-error' : undefined}
                      className={inputClass(!!errors.firstName)}
                    />
                  </Field>
                  <Field
                    id="apply-lastName"
                    label="Last Name"
                    required
                    autoComplete="family-name"
                    error={errors.lastName}
                  >
                    <input
                      id="apply-lastName"
                      type="text"
                      name="lastName"
                      autoComplete="family-name"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Doe"
                      required
                      aria-invalid={!!errors.lastName}
                      aria-describedby={errors.lastName ? 'apply-lastName-error' : undefined}
                      className={inputClass(!!errors.lastName)}
                    />
                  </Field>
                </div>

                {/* Contact row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field id="apply-email" label="Email" required autoComplete="email" error={errors.email}>
                    <input
                      id="apply-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      required
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'apply-email-error' : undefined}
                      className={inputClass(!!errors.email)}
                    />
                  </Field>
                  <Field id="apply-phone" label="Phone (optional)" autoComplete="tel">
                    <input
                      id="apply-phone"
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+62 812 3456 7890"
                      className={inputClass(false)}
                    />
                  </Field>
                </div>

                {/* Links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    id="apply-linkedin"
                    label="LinkedIn URL (optional)"
                    error={errors.linkedin}
                  >
                    <div className="relative">
                      <Linkedin
                        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-light-grey pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="apply-linkedin"
                        type="url"
                        autoComplete="url"
                        value={formData.linkedin}
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                        placeholder="https://linkedin.com/in/johndoe"
                        aria-invalid={!!errors.linkedin}
                        aria-describedby={errors.linkedin ? 'apply-linkedin-error' : undefined}
                        className={`${inputClass(!!errors.linkedin)} pl-10`}
                      />
                    </div>
                  </Field>
                  <Field
                    id="apply-portfolio"
                    label="Portfolio / Website (optional)"
                    error={errors.portfolio}
                  >
                    <div className="relative">
                      <Globe
                        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-mono-light-grey pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="apply-portfolio"
                        type="url"
                        autoComplete="url"
                        value={formData.portfolio}
                        onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                        placeholder="https://johndoe.dev"
                        aria-invalid={!!errors.portfolio}
                        aria-describedby={errors.portfolio ? 'apply-portfolio-error' : undefined}
                        className={`${inputClass(!!errors.portfolio)} pl-10`}
                      />
                    </div>
                  </Field>
                </div>

                {/* Resume upload (mockup) */}
                <Field
                  id="apply-resume"
                  label="Resume / CV"
                  required
                  error={errors.resumeName}
                >
                  <button
                    type="button"
                    id="apply-resume"
                    onClick={handleFileClick}
                    aria-describedby={errors.resumeName ? 'apply-resume-error' : 'apply-resume-hint'}
                    aria-invalid={!!errors.resumeName}
                    className={`w-full bg-black border text-left px-4 py-4 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white transition-colors min-h-touch flex items-center gap-3 ${
                      errors.resumeName
                        ? 'border-red-500'
                        : 'border-white hover:border-white/50'
                    }`}
                  >
                    <Upload className="w-5 h-5 text-mono-light-grey shrink-0" aria-hidden="true" />
                    <span className={formData.resumeName ? 'text-white truncate' : 'text-[#666]'}>
                      {formData.resumeName || 'Click to upload (PDF, DOC, DOCX max 5MB)'}
                    </span>
                    {formData.resumeName && (
                      <CheckCircle
                        className="w-4 h-4 text-green-500 ml-auto shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                  <p id="apply-resume-hint" className="text-[10px] text-mono-dark-grey uppercase mt-1">
                    Accepted: PDF, DOC, DOCX. Max 5MB.
                  </p>
                </Field>

                {/* Source */}
                <Field id="apply-source" label="How did you hear about us? (optional)">
                  <div className="relative">
                    <select
                      id="apply-source"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="appearance-none w-full bg-black border border-white text-white px-4 py-3 pr-10 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white cursor-pointer transition-colors min-h-touch hover:border-white/50"
                    >
                      <option value="">Select a source&#8230;</option>
                      {SOURCE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ArrowRight
                      className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none text-mono-light-grey"
                      aria-hidden="true"
                    />
                  </div>
                </Field>

                {/* Cover letter */}
                <Field
                  id="apply-coverLetter"
                  label="Why do you want to join EventTicket?"
                  required
                  error={errors.coverLetter}
                >
                  <textarea
                    id="apply-coverLetter"
                    name="coverLetter"
                    autoComplete="off"
                    rows={5}
                    value={formData.coverLetter}
                    onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                    placeholder="Tell us what excites you about this role and why you'd be a great fit&#8230;"
                    required
                    aria-invalid={!!errors.coverLetter}
                    aria-describedby={errors.coverLetter ? 'apply-coverLetter-error' : undefined}
                    className={`w-full bg-black border text-white px-4 py-3 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white transition-colors placeholder-[#666] min-h-touch resize-y ${
                      errors.coverLetter ? 'border-red-500' : 'border-white focus:border-white/50'
                    }`}
                  />
                </Field>

                {/* Submit */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-mono-dark-grey">
                  <p className="text-[10px] text-mono-dark-grey uppercase tracking-widest max-w-sm">
                    // BY_SUBMITTING_YOU_AGREE_TO_OUR_PRIVACY_POLICY
                  </p>
                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white border-2 border-white transition-all min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  >
                    Submit Application <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Related positions */}
      {related.length > 0 && (
        <section className="py-16 md:py-20" aria-labelledby="related-heading">
          <div className="container mx-auto px-4 md:px-6">
            <h2
              id="related-heading"
              className="font-display font-bold text-2xl md:text-3xl uppercase text-white mb-8"
            >
              Similar Roles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/careers/${rel.id}`}
                  className="group block border border-mono-dark-grey hover:border-white p-6 transition-colors min-h-touch focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] uppercase tracking-widest bg-white text-black px-2 py-0.5">
                      {rel.department}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest border border-mono-dark-grey text-mono-light-grey px-2 py-0.5">
                      {POSITION_TYPE_LABELS[rel.type]}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-lg uppercase text-white mb-2 group-hover:underline">
                    {rel.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-mono-light-grey mb-3">
                    <MapPin className="w-3 h-3" aria-hidden="true" /> {rel.location}
                  </div>
                  <p className="text-xs text-[#CCCCCC] line-clamp-2">{rel.description}</p>
                  <span className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-white mt-4 group-hover:gap-2 transition-all">
                    View Details <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

/* ---------- helpers ---------- */

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-mono-light-grey mb-1">
        <Icon className="w-3 h-3" aria-hidden="true" />
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm text-white font-bold">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-mono-dark-grey pb-2 last:border-b-0 last:pb-0">
      <dt className="text-[10px] uppercase tracking-widest text-mono-light-grey shrink-0">{label}</dt>
      <dd className="text-sm text-white text-right font-bold">{value}</dd>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  autoComplete,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs text-mono-light-grey uppercase tracking-widest mb-2"
      >
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          className="text-[10px] text-red-500 mt-1 uppercase flex items-center gap-1"
          role="alert"
        >
          <AlertCircle className="w-3 h-3" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return [
    'w-full bg-black border text-white px-4 py-3 text-base',
    'focus:outline-none focus-visible:outline-2 focus-visible:outline-white',
    'transition-colors placeholder-[#666] min-h-touch',
    hasError ? 'border-red-500' : 'border-white focus:border-white/50',
  ].join(' ');
}
