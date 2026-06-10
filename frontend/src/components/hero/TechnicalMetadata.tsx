'use client';

import React, { useEffect, useState } from 'react';

const generateSerial = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateCoords = () => {
  return {
    x: Math.floor(Math.random() * 1920),
    y: Math.floor(Math.random() * 1080)
  };
};

export const TechnicalMetadata = () => {
  const [data, setData] = useState({
    sysId: 'SYS_RDY',
    unitId: '0000',
    coords: { x: 0, y: 0 }
  });

  useEffect(() => {
    setData({
      sysId: 'SYS_RDY',
      unitId: generateSerial(),
      coords: generateCoords()
    });

    const interval = setInterval(() => {
      setData(prev => ({
        ...prev,
        coords: generateCoords()
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-xs text-mono-light-grey flex flex-col gap-2 select-none pointer-events-none opacity-70">
      <div className="flex items-center gap-4">
        <span>[{data.sysId}]</span>
        <span>[ID:{data.unitId}]</span>
      </div>
      <div>
        X:{data.coords.x.toString().padStart(4, '0')} Y:{data.coords.y.toString().padStart(4, '0')}
      </div>
      <div className="mt-2">
        {/* Simple SVG Barcode */}
        <svg width="100" height="20" viewBox="0 0 100 20" fill="currentColor">
          <rect x="0" y="0" width="2" height="20" />
          <rect x="4" y="0" width="1" height="20" />
          <rect x="6" y="0" width="3" height="20" />
          <rect x="12" y="0" width="1" height="20" />
          <rect x="15" y="0" width="2" height="20" />
          <rect x="18" y="0" width="4" height="20" />
          <rect x="24" y="0" width="1" height="20" />
          <rect x="28" y="0" width="2" height="20" />
          <rect x="32" y="0" width="3" height="20" />
          <rect x="38" y="0" width="1" height="20" />
          <rect x="42" y="0" width="2" height="20" />
          <rect x="46" y="0" width="4" height="20" />
          <rect x="52" y="0" width="1" height="20" />
          <rect x="56" y="0" width="3" height="20" />
          <rect x="62" y="0" width="2" height="20" />
          <rect x="66" y="0" width="1" height="20" />
          <rect x="70" y="0" width="4" height="20" />
          <rect x="76" y="0" width="2" height="20" />
          <rect x="80" y="0" width="1" height="20" />
          <rect x="84" y="0" width="3" height="20" />
          <rect x="88" y="0" width="2" height="20" />
          <rect x="92" y="0" width="1" height="20" />
          <rect x="96" y="0" width="4" height="20" />
        </svg>
      </div>
    </div>
  );
};

export const Crosshair = ({ className }: { className?: string }) => (
  <svg 
    width="20" 
    height="20" 
    viewBox="0 0 20 20" 
    className={`absolute text-mono-white ${className}`}
    style={{ pointerEvents: 'none' }}
  >
    <line x1="10" y1="0" x2="10" y2="20" stroke="currentColor" strokeWidth="1" />
    <line x1="0" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="1" />
  </svg>
);
