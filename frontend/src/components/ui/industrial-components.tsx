import React from 'react';
import { cn } from '@/lib/utils';

interface IndustrialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  children: React.ReactNode;
}

export const IndustrialButton = React.forwardRef<HTMLButtonElement, IndustrialButtonProps>(
  ({ className, variant = 'primary', children, ...props }, ref) => {
    const baseStyles = "font-display font-bold text-base md:text-lg tracking-wider uppercase rounded-none transition-all duration-300 relative overflow-hidden group min-h-touch min-w-touch";
    
    const variants = {
      primary: "bg-white text-black hover:bg-black hover:text-white border-2 border-white focus-visible:outline-white focus-visible:outline-2 focus-visible:outline-offset-2",
      outline: "bg-transparent border-2 border-white text-white hover:bg-white hover:text-black focus-visible:outline-white focus-visible:outline-2 focus-visible:outline-offset-2",
      ghost: "bg-transparent text-white hover:text-white/70 focus-visible:outline-white focus-visible:outline-2 focus-visible:outline-offset-2"
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
        {/* Hover Effect Background */}
        <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out -z-0 mix-blend-difference" />
      </button>
    );
  }
);
IndustrialButton.displayName = 'IndustrialButton';

export const IndustrialCard = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div 
      className={cn(
        "bg-black border-2 border-white/20 p-4 md:p-6 relative overflow-hidden group hover:border-white transition-colors duration-300",
        className
      )}
      {...props}
    >
      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
      
      {children}
    </div>
  );
};

export const IndustrialDivider = ({ className }: { className?: string }) => {
  return (
    <div className={cn("w-full h-[2px] bg-white my-8", className)} role="separator" />
  );
};

export const IndustrialBadge = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <span className={cn(
      "inline-flex items-center px-2 md:px-3 py-1 bg-white text-black border border-white text-[10px] md:text-xs font-mono font-bold uppercase tracking-widest",
      className
    )}>
      {children}
    </span>
  );
};

export const IndustrialGrid = () => (
  <div 
    className="absolute inset-0 pointer-events-none z-0 opacity-20"
    aria-hidden="true"
    style={{ 
      backgroundImage: `
        linear-gradient(to right, #333 1px, transparent 1px),
        linear-gradient(to bottom, #333 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px'
    }}
  />
);
