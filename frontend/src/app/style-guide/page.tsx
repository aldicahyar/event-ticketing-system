import React from 'react';
import { IndustrialButton, IndustrialCard, IndustrialDivider, IndustrialBadge, IndustrialGrid } from '@/components/ui/industrial-components';
import { TechnicalMetadata } from '@/components/hero/TechnicalMetadata';

export default function StyleGuidePage() {
  return (
    <div className="min-h-screen bg-black text-white font-mono p-12 relative selection:bg-white selection:text-black">
      <IndustrialGrid />
      
      <div className="max-w-4xl mx-auto relative z-10 space-y-20">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold text-6xl uppercase mb-4">Style Guide <span className="text-mono-light-grey">v2.0</span></h1>
          <p className="text-mono-light-grey">Strict Monochrome Industrial System</p>
          <IndustrialDivider />
        </div>

        {/* Colors */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold uppercase border-l-4 border-white pl-4">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-24 w-full bg-black border border-white/20"></div>
              <p className="text-sm">#000000 (Background)</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 w-full bg-white border border-white/20"></div>
              <p className="text-sm">#FFFFFF (Foreground)</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 w-full bg-[#333333] border border-white/20"></div>
              <p className="text-sm">#333333 (Secondary)</p>
            </div>
            <div className="space-y-2">
              <div className="h-24 w-full bg-[#CCCCCC] border border-white/20"></div>
              <p className="text-sm">#CCCCCC (Muted)</p>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold uppercase border-l-4 border-white pl-4">Typography</h2>
          <div className="space-y-8 border border-white/20 p-8 bg-black">
            <div>
              <p className="text-xs text-mono-light-grey mb-2">Display / Oswald</p>
              <h1 className="font-display font-bold text-6xl uppercase">The Quick Brown Fox</h1>
            </div>
            <div>
              <p className="text-xs text-mono-light-grey mb-2">Mono / Space Mono</p>
              <p className="font-mono text-base text-mono-light-grey">
                The quick brown fox jumps over the lazy dog. 1234567890
                <br />
                SYSTEM_READY // INITIALIZING_SEQUENCE
              </p>
            </div>
          </div>
        </section>

        {/* Components */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold uppercase border-l-4 border-white pl-4">Components</h2>
          
          <div className="grid gap-8">
            <div className="space-y-4">
              <h3 className="text-xl">Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <IndustrialButton>Primary Action</IndustrialButton>
                <IndustrialButton variant="outline">Secondary Action</IndustrialButton>
                <IndustrialButton variant="ghost">Ghost Action</IndustrialButton>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl">Cards</h3>
              <IndustrialCard>
                <h4 className="font-display text-2xl uppercase mb-2">System Status</h4>
                <p className="text-mono-light-grey mb-4">All systems operational. No anomalies detected in sector 7.</p>
                <IndustrialBadge>Active</IndustrialBadge>
              </IndustrialCard>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl">Metadata</h3>
              <div className="p-4 border border-white/20 bg-black">
                <TechnicalMetadata />
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}