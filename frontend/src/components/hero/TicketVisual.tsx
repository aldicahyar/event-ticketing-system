 'use client';
 
 import React, { useRef, useState } from 'react';
 import { cn } from '@/lib/utils';
 
 export const TicketVisual = () => {
   const cardRef = useRef<HTMLDivElement>(null);
   const [rotate, setRotate] = useState({ x: 0, y: 0 });
   const [opacity, setOpacity] = useState(0);
 
   const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
     const card = cardRef.current;
     if (!card) return;
 
     const rect = card.getBoundingClientRect();
     const centerX = rect.left + rect.width / 2;
     const centerY = rect.top + rect.height / 2;
 
     const mouseX = e.clientX - centerX;
     const mouseY = e.clientY - centerY;
 
     const rotateX = ((mouseY / rect.height) * -20).toFixed(2); // Max tilt 20deg
     const rotateY = ((mouseX / rect.width) * 20).toFixed(2);
 
     setRotate({ x: Number(rotateX), y: Number(rotateY) });
     setOpacity(1);
   };
 
   const handleMouseLeave = () => {
     setRotate({ x: 0, y: 0 });
     setOpacity(0);
   };
 
   return (
    <div className="animate-float">
     <div
       className="relative w-[300px] h-[480px] sm:w-[320px] sm:h-[500px] perspective-1000 group cursor-pointer"
       onMouseMove={handleMouseMove}
       onMouseLeave={handleMouseLeave}
       style={{ perspective: '1000px' }}
     >
       <div
         ref={cardRef}
         className="w-full h-full relative preserve-3d transition-transform duration-100 ease-linear rounded-[24px] shadow-2xl"
         style={{
           transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
           transformStyle: 'preserve-3d',
         }}
       >
         {/* Card Content - Front */}
         <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black rounded-[24px] border border-white/10 overflow-hidden flex flex-col backface-hidden">
           
           {/* Top Image Section */}
           <div className="h-3/5 relative overflow-hidden">
             {/* Abstract Background */}
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black opacity-80"></div>
             <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1459749411177-8c2914278f67?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-60 hover:scale-110 transition-transform duration-700"></div>
             
             {/* Event Details Overlay */}
             <div className="absolute top-6 left-6 right-6">
               <div className="flex justify-between items-start">
                 <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white border border-white/20 tracking-wider">
                   VIP ACCESS
                 </span>
                 <span className="text-white/80 text-xs font-mono">#TIX-8921</span>
               </div>
             </div>
 
             <div className="absolute bottom-6 left-6 right-6">
               <p className="text-blue-400 text-xs font-bold tracking-[0.2em] uppercase mb-1">Live Concert</p>
               <h2 className="text-4xl font-black text-white leading-none tracking-tight">NEON<br/>NIGHTS</h2>
               <p className="text-slate-300 text-sm mt-2 font-medium">Jakarta International Stadium</p>
             </div>
           </div>
 
           {/* Tear Line */}
           <div className="relative h-6 bg-transparent flex items-center">
             <div className="w-full border-t-2 border-dashed border-white/20"></div>
             <div className="absolute -left-3 w-6 h-6 bg-background rounded-full"></div>
             <div className="absolute -right-3 w-6 h-6 bg-background rounded-full"></div>
           </div>
 
           {/* Bottom Info Section */}
           <div className="flex-1 px-6 pb-6 pt-2 flex flex-col justify-between bg-white/[0.02]">
             <div className="grid grid-cols-2 gap-y-4 gap-x-2">
               <div>
                 <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Date</p>
                 <p className="text-white font-semibold">12 AUG 2026</p>
               </div>
               <div>
                 <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Time</p>
                 <p className="text-white font-semibold">19:00 WIB</p>
               </div>
               <div>
                 <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Gate</p>
                 <p className="text-white font-semibold">A - East</p>
               </div>
               <div>
                 <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Seat</p>
                 <p className="text-blue-400 font-bold">VIP-A-24</p>
               </div>
             </div>
 
             {/* Barcode Mock */}
             <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-end">
               <div className="flex flex-col gap-1 w-full">
                  <div className="h-8 w-full bg-white/90 mask-barcode" style={{
                      maskImage: "repeating-linear-gradient(90deg, black, black 2px, transparent 2px, transparent 4px)",
                      WebkitMaskImage: "repeating-linear-gradient(90deg, black, black 2px, transparent 2px, transparent 4px)"
                  }}></div>
                  <span className="text-[10px] text-center w-full text-slate-500 font-mono tracking-widest">8392 1029 3847</span>
               </div>
             </div>
           </div>
         </div>
 
         {/* Glare/Shine Effect */}
         <div
             className="absolute inset-0 rounded-[24px] pointer-events-none z-50"
             style={{
                 background: `radial-gradient(circle at ${50 + (rotate.y * 3)}% ${50 + (rotate.x * 3)}%, rgba(255,255,255,0.3) 0%, transparent 60%)`,
                 opacity: opacity * 0.6,
                 mixBlendMode: 'overlay',
                 transition: 'opacity 0.2s ease',
             }}
         />
       </div>
 
       {/* Shadow on Floor */}
       <div 
        className="absolute -bottom-10 left-10 right-10 h-4 bg-black/40 blur-xl rounded-[100%] transition-all duration-300"
        style={{
            transform: `scale(${1 - (Math.abs(rotate.x) + Math.abs(rotate.y)) * 0.01}) translateY(${Math.abs(rotate.x)}px)`,
            opacity: 0.4 + (opacity * 0.2)
        }}
       ></div>
     </div>
    </div>
   );
 };
