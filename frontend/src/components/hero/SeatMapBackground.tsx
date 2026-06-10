 'use client';
 
 import React, { useEffect, useState } from 'react';
 
 export const SeatMapBackground = () => {
   // Generate grid of seats
   const rows = 12;
   const cols = 20;
   const seats = [];
 
   for (let i = 0; i < rows; i++) {
     for (let j = 0; j < cols; j++) {
       seats.push({ id: `${i}-${j}`, r: i, c: j });
     }
   }
 
   // Animation state for random "booking" effect
   const [activeSeats, setActiveSeats] = useState<string[]>([]);
 
   useEffect(() => {
     const interval = setInterval(() => {
       // Randomly pick a few seats to "light up"
       const randomSeats = Array.from({ length: 5 }, () => {
         const r = Math.floor(Math.random() * rows);
         const c = Math.floor(Math.random() * cols);
         return `${r}-${c}`;
       });
       setActiveSeats(randomSeats);
     }, 2000);
 
     return () => clearInterval(interval);
   }, [rows, cols]);
 
   return (
     <div className="absolute inset-0 z-0 overflow-hidden opacity-20 pointer-events-none select-none">
       {/* Gradient Overlay to fade out edges */}
       <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background z-10"></div>
       <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background z-10"></div>
 
       <div className="absolute right-[-10%] top-[10%] w-[120%] h-[120%] transform -rotate-12 scale-110">
         <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
           {seats.map((seat) => {
             const isActive = activeSeats.includes(seat.id);
             return (
               <div
                 key={seat.id}
                 className={`w-3 h-3 rounded-sm transition-all duration-1000 ${
                   isActive
                     ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] scale-110'
                     : 'bg-slate-800/50'
                 }`}
               />
             );
           })}
         </div>
       </div>
     </div>
   );
 };
