import React from 'react';

interface CollabFeatureBannerProps {
  onStartPlanning?: () => void;
}

export default function CollabFeatureBanner({ onStartPlanning }: CollabFeatureBannerProps) {
  return (
    <section className="w-full py-20 px-6 bg-[var(--bg-page)] relative overflow-hidden" id="collab-section">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-20">
        
        {/* Left Side: Mockup Graphic */}
        <div className="flex-1 w-full max-w-md relative">
          {/* Gradient Background blob */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF5E8E] to-[#6042E8] rounded-[40px] transform rotate-3 scale-105 opacity-90 blur-[2px]"></div>
          
          {/* Main phone/chat Mockup Container */}
          <div className="relative bg-[#1E1F22] rounded-[32px] p-4 shadow-2xl border border-white/10 aspect-[4/5] flex flex-col overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <div className="w-6.5 h-6.5 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </div>
              <div className="text-white font-bold text-sm"># group-planning</div>
            </div>
            
            {/* Mock Chat Area */}
            <div className="flex-1 py-4 flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E87C5A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">S</div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white font-medium text-sm">Sarah</span>
                    <span className="text-[#949BA4] text-[10px]">Today at 2:12 PM</span>
                  </div>
                  <div className="text-[#DBDEE1] text-[13px] mt-0.5 leading-tight">Let's do the sunset cruise on Day 2! 🌅</div>
                  
                  {/* Reaction badge */}
                  <div className="flex gap-1.5 mt-2">
                    <div className="bg-[#2B2D31] rounded-full px-2.5 py-0.5 flex items-center gap-1.5 border border-white/10 text-[11px] text-white/80">
                      <span>👍</span>
                      <span className="font-bold text-[10px]">4</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mock Input Area */}
            <div className="bg-[#383A40] rounded-xl p-3 flex items-center gap-3 mt-auto">
              <div className="w-6 h-6 rounded-full bg-[#2B2D31] flex items-center justify-center text-white/40 text-lg leading-none font-light select-none">
                +
              </div>
              <div className="text-[#949BA4] text-sm select-none">Message #group-planning</div>
            </div>
          </div>
        </div>

        {/* Right Side: Text Content */}
        <div className="flex-1 w-full text-center md:text-left z-10">
          <h2 className="text-4xl md:text-5xl lg:text-[56px] font-black text-[var(--text-primary)] leading-[1.1] tracking-tight uppercase mb-6 font-['Inter']">
            Make Your<br />Group Trips<br />More Fun
          </h2>
          <p className="text-[17px] md:text-[19px] text-[var(--text-secondary)] leading-relaxed max-w-lg mb-8 font-light">
            Use custom polls, shared itineraries, group chat and more to add your personality to the trip planning. Vote on activities, swap out days, and make sure everyone gets a say in the adventure.
          </p>
          <button 
            onClick={onStartPlanning}
            className="bg-[#E87C5A] hover:bg-[#d4693e] text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_4px_14px_0_rgba(232,124,90,0.39)] hover:shadow-[0_6px_20px_rgba(232,124,90,0.23)] hover:-translate-y-1 cursor-pointer border-none"
          >
            Start Co-Planning
          </button>
        </div>

      </div>
    </section>
  );
}
