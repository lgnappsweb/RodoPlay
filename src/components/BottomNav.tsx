/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Home, Trophy, Settings, Gamepad2, Bell } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
  unreadCount?: number;
}

export function BottomNav({ activeView, onViewChange, unreadCount = 0 }: BottomNavProps) {
  const items = [
    { id: 'home', icon: Home, label: 'Início', isSpecial: false },
    { id: 'leaderboard', icon: Trophy, label: 'Ranking', isSpecial: false },
    { id: 'multiplayer', icon: Gamepad2, label: 'Jogos', isSpecial: true },
    { id: 'notifications', icon: Bell, label: 'Alertas', isSpecial: false, hasBadge: true },
    { id: 'settings', icon: Settings, label: 'Ajustes', isSpecial: false },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-2xl border-t border-slate-800/80 px-4 py-3 pb-8 flex justify-around items-end z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      {items.map((item) => {
        const isActive = activeView === item.id;
        const Icon = item.icon;

        if (item.isSpecial) {
          return (
            <button
              key={item.id}
              id="bottom-nav-multiplayer-btn"
              onClick={() => onViewChange(item.id)}
              className="relative group flex flex-col items-center gap-1 -mt-6 z-50 transition-all"
            >
              {/* Spinning/pulsating glowing backdrop */}
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-yellow-400 to-amber-500 rounded-full blur-md opacity-40 group-hover:opacity-70 animate-pulse transition-opacity" />
              
              {/* Outer border/ring for physical feel */}
              <div className="relative p-0.5 rounded-full bg-slate-900 border-2 border-yellow-500/50 shadow-2xl">
                <div className={`p-3.5 rounded-full transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-tr from-yellow-400 to-orange-500 text-slate-950 scale-110 shadow-[0_4px_15px_rgba(234,179,8,0.4)]' 
                    : 'bg-gradient-to-tr from-yellow-500 to-amber-500 text-slate-950 hover:scale-105 hover:from-yellow-400 hover:to-amber-400'
                }`}>
                  <Icon size={22} className="font-extrabold stroke-[2.5]" />
                </div>
              </div>
              
              <span className={`text-[9px] font-black uppercase tracking-wider -mt-0.5 ${isActive ? 'text-yellow-400 font-extrabold' : 'text-yellow-500/80 group-hover:text-yellow-400'}`}>
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className="relative group flex flex-col items-center gap-1 min-w-[60px] pb-1"
          >
            {isActive && (
              <motion.div
                layoutId="nav-active"
                className="absolute -top-3 left-0 right-0 h-1 bg-yellow-400 rounded-full"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <div className={`relative p-2 rounded-2xl transition-all ${isActive ? 'bg-slate-800 text-yellow-400 scale-105 shadow-md border border-slate-700/50' : 'text-slate-500 hover:text-slate-300'}`}>
              <Icon size={20} />
              {item.hasBadge && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white font-mono border border-slate-900 shadow-md">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-yellow-400' : 'text-slate-600'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

