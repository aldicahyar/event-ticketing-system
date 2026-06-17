'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { type FAQItem } from '@/lib/help-data';

export const FAQAccordion = ({ items }: { items: FAQItem[] }) => {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3 mb-12">
      <h2 className="font-display font-bold text-xl uppercase text-white mb-6">Frequently Asked Questions</h2>
      {items.map((item) => (
        <div key={item.id} className="border border-mono-dark-grey bg-black">
          <button
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors min-h-touch focus-visible:outline-2 focus-visible:outline-white"
            aria-expanded={openId === item.id}
          >
            <span className="font-bold uppercase text-sm">{item.question}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${openId === item.id ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          <AnimatePresence>
            {openId === item.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 text-sm text-[#CCCCCC] border-t border-mono-dark-grey">
                  {item.answer}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};
