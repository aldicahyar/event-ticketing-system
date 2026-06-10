'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/ui/Footer';
import { Search, ChevronRight, Mail, Calendar, Ticket, Shield, CreditCard, Rocket, ArrowLeft, ExternalLink } from 'lucide-react';
import { HELP_CATEGORIES, HELP_ARTICLES, type Article, type Category } from '@/lib/help-data';
import ReactMarkdown from 'react-markdown';

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'Rocket': Rocket,
  'Ticket': Ticket,
  'Shield': Shield,
  'Calendar': Calendar,
  'CreditCard': CreditCard,
};

export default function HelpPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter articles based on search and category
  const filteredArticles = useMemo(() => {
    let articles = HELP_ARTICLES;

    // Filter by category
    if (activeCategory) {
      articles = articles.filter(a => a.categoryId === activeCategory);
    }

    // Filter by search query
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

  // Get related articles
  const relatedArticles = useMemo(() => {
    if (!activeArticle || !activeArticle.relatedArticles) return [];
    return HELP_ARTICLES.filter(a => activeArticle.relatedArticles?.includes(a.id));
  }, [activeArticle]);

  // Get category info
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
    <main className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navbar links={[{ href: '/events', label: 'Events' }, { href: '/lineup', label: 'Lineup' }]} />

      {/* Hero Header */}
      <section className="border-b border-mono-dark-grey py-12 md:py-16" aria-labelledby="help-heading">
        <div className="container mx-auto px-4 md:px-6">
          <h1 id="help-heading" className="font-display font-bold text-3xl sm:text-4xl md:text-5xl uppercase text-white mb-2">
            Help <span className="text-transparent stroke-text" style={{ WebkitTextStroke: "2px white" }} aria-hidden="true">Center</span>
          </h1>
          <p className="text-mono-light-grey uppercase tracking-widest text-xs sm:text-sm mb-8">
            // FIND_ANSWERS_FAST
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <label htmlFor="help-search" className="sr-only">Search help articles</label>
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-mono-light-grey" aria-hidden="true" />
            <input
              id="help-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles, topics, or keywords..."
              className="w-full bg-black border border-white text-white pl-12 pr-4 py-4 text-base focus:outline-none focus-visible:outline-2 focus-visible:outline-white focus:border-white/50 placeholder-[#666] min-h-touch"
            />
          </div>
        </div>
      </section>

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

              {/* Contact Support */}
              <div className="mt-6 pt-6 border-t border-mono-dark-grey">
                <h3 className="font-bold uppercase text-white mb-2 text-xs">Need More Help?</h3>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 text-xs text-[#CCCCCC] hover:text-white transition-colors py-2 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  Contact Support
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            
            {/* Breadcrumb */}
            {(activeCategory || activeArticle) && (
              <nav aria-label="Breadcrumb" className="mb-6">
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
              </nav>
            )}

            {/* Article View */}
            {activeArticle ? (
              <article className="bg-black border border-mono-dark-grey p-6 md:p-8">
                <button
                  onClick={handleBackToList}
                  className="flex items-center gap-2 text-sm text-mono-light-grey hover:text-white transition-colors mb-6 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Back to articles
                </button>

                <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl uppercase text-white mb-4">
                  {activeArticle.title}
                </h1>

                <div className="flex flex-wrap gap-2 mb-6">
                  {activeArticle.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-white/10 border border-mono-dark-grey text-[#CCCCCC] text-xs uppercase"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="prose prose-invert prose-sm md:prose-base max-w-none">
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
                </div>

                {/* Related Articles */}
                {relatedArticles.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-mono-dark-grey">
                    <h2 className="font-display font-bold text-xl uppercase text-white mb-4">Related Articles</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {relatedArticles.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => handleArticleClick(article)}
                          className="text-left p-4 border border-mono-dark-grey hover:border-white transition-all group focus-visible:outline-2 focus-visible:outline-white"
                        >
                          <h3 className="font-bold uppercase text-white mb-2 text-sm group-hover:text-white">
                            {article.title}
                          </h3>
                          <p className="text-xs text-mono-light-grey line-clamp-2">{article.excerpt}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ) : (
              /* Article Grid */
              <>
                {searchQuery && (
                  <div className="mb-6">
                    <p className="text-sm text-mono-light-grey">
                      Found <span className="text-white font-bold">{filteredArticles.length}</span> article{filteredArticles.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
                    </p>
                  </div>
                )}

                {activeCategory && activeCategoryInfo && !searchQuery && (
                  <div className="mb-6 p-4 md:p-6 bg-black border border-mono-dark-grey">
                    <h2 className="font-display font-bold text-xl uppercase text-white mb-2">
                      {activeCategoryInfo.name}
                    </h2>
                    <p className="text-sm text-mono-light-grey">{activeCategoryInfo.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  {filteredArticles.map((article) => {
                    const category = HELP_CATEGORIES.find(c => c.id === article.categoryId);
                    const IconComponent = category ? (ICON_MAP[category.icon] || Ticket) : Ticket;

                    return (
                      <article
                        key={article.id}
                        className="group bg-black border border-mono-dark-grey hover:border-white transition-all duration-300 flex flex-col h-full"
                      >
                        <div className="p-4 md:p-6 flex flex-col h-full">
                          <div className="flex items-start gap-3 mb-3">
                            <IconComponent className="w-6 h-6 text-white shrink-0" aria-hidden="true" />
                            <div className="flex-1">
                              <h3 className="font-display font-bold text-base md:text-lg uppercase text-white leading-tight mb-2 group-hover:text-white">
                                {article.title}
                              </h3>
                              <p className="text-xs text-mono-light-grey line-clamp-2">{article.excerpt}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleArticleClick(article)}
                            className="mt-auto text-xs text-white hover:underline uppercase flex items-center gap-1 pt-4 border-t border-mono-dark-grey focus-visible:outline-2 focus-visible:outline-white"
                            aria-label={`Read ${article.title}`}
                          >
                            Read Article <ChevronRight className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {filteredArticles.length === 0 && (
                  <div className="text-center py-16 border border-mono-dark-grey" role="alert">
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
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
