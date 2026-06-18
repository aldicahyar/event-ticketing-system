'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/ui/Footer';
import { Search, ChevronRight, Mail, Calendar, Ticket, Shield, CreditCard, Rocket, ArrowLeft, ExternalLink } from 'lucide-react';
import { HELP_CATEGORIES, HELP_ARTICLES, FAQ_DATA, type Article, type FAQItem } from '@/lib/help-data';
import { FAQAccordion } from '@/components/help/FAQAccordion';
import ReactMarkdown from 'react-markdown';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  Ticket,
  Shield,
  Calendar,
  CreditCard,
};

// Page transition variants — consistent with other pages
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' as const } },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function HelpPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = useMemo(() => {
    let articles = HELP_ARTICLES;
    if (activeCategory) {
      articles = articles.filter(a => a.categoryId === activeCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.excerpt.toLowerCase().includes(query) ||
        a.content.toLowerCase().includes(query) ||
        a.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    return articles;
  }, [activeCategory, searchQuery]);

  const relatedArticles = useMemo(() => {
    if (!activeArticle?.relatedArticles) return [];
    return HELP_ARTICLES.filter(a => activeArticle.relatedArticles?.includes(a.id));
  }, [activeArticle]);

  const activeCategoryInfo = useMemo(() => {
    return HELP_CATEGORIES.find(c => c.id === activeCategory);
  }, [activeCategory]);

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    setActiveArticle(null);
    setSearchQuery('');
  };

  const handleArticleClick = (article: Article) => {
    setActiveArticle(article);
  };

  const handleBackToList = () => {
    setActiveArticle(null);
  };

  const handleBackToCategories = () => {
    setActiveCategory(null);
    setActiveArticle(null);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar links={[{ href: '/events', label: 'Events' }, { href: '/lineup', label: 'Lineup' }, { href: '/help', label: 'Help', active: true }]} />

      {/* Hero Header */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="border-b border-mono-dark-grey py-12 md:py-16"
        aria-labelledby="help-heading"
      >
        <div className="container mx-auto px-4 md:px-6">
          <h1 id="help-heading" className="font-display font-bold text-3xl sm:text-4xl md:text-5xl uppercase text-white mb-2">
            Help <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }} aria-hidden="true">Center</span>
          </h1>
          <p className="text-mono-light-grey uppercase tracking-widest text-xs sm:text-sm mb-8">
            // FIND_ANSWERS_FAST
          </p>

          <div className="relative max-w-2xl">
            <label htmlFor="help-search" className="sr-only">Search help articles</label>
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
            <input
              id="help-search"
              type="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles, topics, or keywords..."
              className="w-full bg-black border border-white text-white pl-12 pr-4 py-4 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white focus:border-white/50 placeholder-[#666] min-h-touch"
            />
          </div>
        </div>
      </motion.section>

      {/* Category Tabs (Mobile Only) */}
      <div className="lg:hidden border-b border-mono-dark-grey overflow-x-auto scrollbar-none">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex gap-2 py-4">
            <button
              onClick={handleBackToCategories}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wide border whitespace-nowrap min-h-touch focus-visible:outline-2 focus-visible:outline-white transition-all ${
                !activeCategory
                  ? 'bg-white text-black border-white'
                  : 'bg-black text-[#CCCCCC] border-mono-dark-grey hover:border-white hover:text-white'
              }`}
            >
              All Topics
            </button>
            {HELP_CATEGORIES.map((category) => {
              const IconComponent = ICON_MAP[category.icon] || Ticket;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wide border whitespace-nowrap min-h-touch flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-white transition-all ${
                    activeCategory === category.id
                      ? 'bg-white text-black border-white'
                      : 'bg-black text-[#CCCCCC] border-mono-dark-grey hover:border-white hover:text-white'
                  }`}
                  aria-pressed={activeCategory === category.id}
                >
                  <IconComponent className="w-4 h-4" aria-hidden="true" />
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Sidebar (Desktop Only) */}
          <aside className="hidden lg:block lg:col-span-1" aria-label="Help categories">
            <div className="sticky top-24 bg-black border border-mono-dark-grey p-4">
              <h2 className="font-bold uppercase text-white mb-4 text-sm">Categories</h2>
              <nav className="space-y-1">
                <button
                  onClick={handleBackToCategories}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left min-h-touch focus-visible:outline-2 focus-visible:outline-white ${
                    !activeCategory
                      ? 'bg-white text-black'
                      : 'text-[#CCCCCC] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="font-bold uppercase text-sm">All Topics</span>
                </button>
                {HELP_CATEGORIES.map((category) => {
                  const IconComponent = ICON_MAP[category.icon] || Ticket;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left min-h-touch focus-visible:outline-2 focus-visible:outline-white ${
                        activeCategory === category.id
                          ? 'bg-white text-black'
                          : 'text-[#CCCCCC] hover:bg-white/10 hover:text-white'
                      }`}
                      aria-current={activeCategory === category.id ? 'page' : undefined}
                    >
                      <IconComponent className="w-5 h-5" aria-hidden="true" />
                      <span className="font-bold uppercase text-sm">{category.name}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-6 pt-6 border-t border-mono-dark-grey">
                <h3 className="font-bold uppercase text-white mb-2 text-xs">Need More Help?</h3>
                <Link
                  href="/help/contact"
                  className="flex items-center gap-2 text-xs text-[#CCCCCC] hover:text-white transition-colors py-2 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  Submit a Support Ticket
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 text-xs text-[#CCCCCC] hover:text-white transition-colors py-2 mt-2 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  General Contact
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-3">

            {/* Breadcrumb */}
            <AnimatePresence>
              {(activeCategory || activeArticle) && (
                <motion.nav
                  key="breadcrumb"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  aria-label="Breadcrumb"
                  className="mb-6 overflow-hidden"
                >
                  <ol className="flex items-center gap-2 text-xs text-mono-light-grey">
                    <li>
                      <button
                        onClick={handleBackToCategories}
                        className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white"
                      >
                        Help
                      </button>
                    </li>
                    {activeCategory && (
                      <>
                        <ChevronRight className="w-3 h-3" aria-hidden="true" />
                        <li>
                          <button
                            onClick={handleBackToList}
                            className="hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white"
                          >
                            {activeCategoryInfo?.name}
                          </button>
                        </li>
                      </>
                    )}
                    {activeArticle && (
                      <>
                        <ChevronRight className="w-3 h-3" aria-hidden="true" />
                        <li className="text-white" aria-current="page">{activeArticle.title}</li>
                      </>
                    )}
                  </ol>
                </motion.nav>
              )}
            </AnimatePresence>

            {/* View Switcher with AnimatePresence */}
            <AnimatePresence mode="wait">
              {activeArticle ? (
                <motion.div
                  key={`article-${activeArticle.id}`}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <article className="bg-black border border-mono-dark-grey p-6 md:p-8">
                    <motion.button
                      onClick={handleBackToList}
                      className="flex items-center gap-2 text-sm text-mono-light-grey hover:text-white transition-colors mb-6 focus-visible:outline-2 focus-visible:outline-white"
                      whileHover={{ x: -3 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                      Back to articles
                    </motion.button>

                    <motion.h1
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                      className="font-display font-bold text-2xl sm:text-3xl md:text-4xl uppercase text-white mb-4"
                    >
                      {activeArticle.title}
                    </motion.h1>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="flex flex-wrap gap-2 mb-6"
                    >
                      {activeArticle.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-white/10 border border-mono-dark-grey text-[#CCCCCC] text-xs uppercase"
                        >
                          {tag}
                        </span>
                      ))}
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.35 }}
                      className="prose prose-invert prose-sm md:prose-base max-w-none"
                    >
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h2 className="font-display font-bold text-2xl uppercase text-white mt-8 mb-4 first:mt-0">{children}</h2>,
                          h2: ({ children }) => <h3 className="font-display font-bold text-xl uppercase text-white mt-6 mb-3">{children}</h3>,
                          h3: ({ children }) => <h4 className="font-bold text-lg uppercase text-white mt-4 mb-2">{children}</h4>,
                          p: ({ children }) => <p className="text-[#CCCCCC] leading-relaxed mb-4">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside text-[#CCCCCC] mb-4 space-y-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside text-[#CCCCCC] mb-4 space-y-2">{children}</ol>,
                          li: ({ children }) => <li className="ml-4">{children}</li>,
                          strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              className="text-white underline hover:text-mono-light-grey transition-colors inline-flex items-center gap-1"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                              <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            </a>
                          ),
                        }}
                      >
                        {activeArticle.content}
                      </ReactMarkdown>
                    </motion.div>

                    {/* Related Articles */}
                    {relatedArticles.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="mt-12 pt-8 border-t border-mono-dark-grey"
                      >
                        <h2 className="font-display font-bold text-xl uppercase text-white mb-4">Related Articles</h2>
                        <motion.div
                          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                          variants={staggerContainer}
                          initial="initial"
                          animate="animate"
                        >
                          {relatedArticles.map((article) => (
                            <motion.button
                              key={article.id}
                              variants={staggerItem}
                              onClick={() => handleArticleClick(article)}
                              className="text-left p-4 border border-mono-dark-grey hover:border-white transition-all group focus-visible:outline-2 focus-visible:outline-white"
                              whileHover={{ y: -2, borderColor: '#FFFFFF' }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <h3 className="font-bold uppercase text-white mb-2 text-sm">
                                {article.title}
                              </h3>
                              <p className="text-xs text-mono-light-grey line-clamp-2">{article.excerpt}</p>
                            </motion.button>
                          ))}
                        </motion.div>
                      </motion.div>
                    )}
                  </article>
                </motion.div>
              ) : (
                <motion.div
                  key={`grid-${activeCategory || 'all'}-${searchQuery}`}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {/* Category Header */}
                  {activeCategory && activeCategoryInfo && !searchQuery && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className="mb-6 p-4 md:p-6 bg-black border border-mono-dark-grey"
                    >
                      <h2 className="font-display font-bold text-xl uppercase text-white mb-2">
                        {activeCategoryInfo.name}
                      </h2>
                      <p className="text-sm text-mono-light-grey">{activeCategoryInfo.description}</p>
                    </motion.div>
                  )}

                  {/* Search Results Count */}
                  {searchQuery && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mb-6 text-sm text-mono-light-grey"
                    >
                      Found <span className="text-white font-bold">{filteredArticles.length}</span> article{filteredArticles.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
                    </motion.p>
                  )}

                  {/* FAQ Section - only on main page */}
                  {!activeCategory && !searchQuery && (
                    <FAQAccordion items={FAQ_DATA} />
                  )}

                  {/* Article Grid */}
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    {filteredArticles.map((article) => {
                      const category = HELP_CATEGORIES.find(c => c.id === article.categoryId);
                      const IconComponent = category ? (ICON_MAP[category.icon] || Ticket) : Ticket;

                      return (
                        <motion.article
                          key={article.id}
                          variants={staggerItem}
                          className="group bg-black border border-mono-dark-grey hover:border-white transition-colors duration-300 flex flex-col h-full"
                        >
                          <div
                            className="p-4 md:p-6 flex flex-col h-full cursor-pointer"
                            onClick={() => handleArticleClick(article)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleArticleClick(article); }}
                            aria-label={`Read article: ${article.title}`}
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <IconComponent className="w-6 h-6 text-white shrink-0" aria-hidden="true" />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-display font-bold text-base md:text-lg uppercase text-white leading-tight mb-2">
                                  {article.title}
                                </h3>
                                <p className="text-xs text-mono-light-grey line-clamp-2">{article.excerpt}</p>
                              </div>
                            </div>

                            <div className="mt-auto flex items-center gap-1 pt-4 border-t border-mono-dark-grey">
                              <span className="text-xs text-white hover:underline uppercase flex items-center gap-1">
                                Read Article <ChevronRight className="w-3 h-3" aria-hidden="true" />
                              </span>
                            </div>
                          </div>
                        </motion.article>
                      );
                    })}
                  </motion.div>

                  {/* Empty State */}
                  {filteredArticles.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-16 border border-mono-dark-grey"
                      role="alert"
                    >
                      <Search className="w-16 h-16 text-mono-dark-grey mx-auto mb-4" aria-hidden="true" />
                      <h3 className="font-display font-bold text-2xl uppercase text-white mb-2">
                        No Articles Found
                      </h3>
                      <p className="text-mono-light-grey uppercase tracking-widest text-sm mb-4">
                        Try different keywords or browse categories
                      </p>
                      <button
                        onClick={handleBackToCategories}
                        className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wide hover:bg-transparent hover:text-white hover:border-white border-2 border-white transition-all focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                      >
                        View All Topics
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
