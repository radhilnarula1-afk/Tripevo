import React, { useState } from 'react';

export interface ChatMessage {
  id: string;
  sender: string;
  avatarClass: string;
  text: string;
  timestamp: string;
  isSuggestion?: boolean;
  votes?: number;
  userVoted?: 'up' | 'down' | null;
  dayAssociation?: number;
}

interface CollabChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, isProposal: boolean, day: number) => void;
  onVote: (messageId: string, direction: 'up' | 'down') => void;
  roomCode?: string;
  activePlannersCount?: number;
  shareUrl?: string;
  collabLinkCopied?: boolean;
  onCopyLink?: () => void;
  onLeave?: () => void;
}

export default function CollabChat({ 
  messages, 
  onSendMessage, 
  onVote,
  roomCode,
  activePlannersCount,
  shareUrl,
  collabLinkCopied,
  onCopyLink,
  onLeave
}: CollabChatProps) {
  const [input, setInput] = useState('');
  const [activeChannel, setActiveChannel] = useState('general');
  const [isProposal, setIsProposal] = useState(false);
  const [proposalDay, setProposalDay] = useState(1);

  const channels = [
    { id: 'general', name: 'general' },
    { id: 'day1', name: 'day-1-bali' },
    { id: 'day2', name: 'day-2-ubud' }
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input, isProposal, proposalDay);
    setInput('');
    setIsProposal(false);
  };

  return (
    <div className="flex h-[600px] w-full max-w-6xl mx-auto bg-[#313338] text-[#DBDEE1] rounded-none overflow-hidden shadow-2xl font-['DM_Sans'] border border-[#1E1F22]">
      {/* Sidebar / Channel List */}
      <div className="w-[240px] bg-[#2B2D31] flex flex-col flex-shrink-0">
        <div className="h-12 border-b border-[#1E1F22] shadow-sm flex items-center px-4 font-bold text-white tracking-wide">
          TripEvo Crew 🌴
        </div>
        <div className="p-3 flex-1 overflow-y-auto">
          <div className="text-[11px] font-bold text-[#80848E] uppercase tracking-wider mb-2 px-2">
            Text Channels
          </div>
          {channels.map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[15px] transition-all ${
                activeChannel === ch.id 
                  ? 'bg-[#404249] text-white' 
                  : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'
              }`}
            >
              <span className="text-[#80848E] text-lg font-light">#</span>
              {ch.name}
            </button>
          ))}
        </div>
        {/* User profile snippet */}
        <div className="h-[52px] bg-[#232428] flex items-center px-3 gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
            R
          </div>
          <div className="flex flex-col">
            <span className="text-white text-sm font-semibold leading-tight">Rajiv (You)</span>
            <span className="text-[#949BA4] text-[11px] leading-tight">#4912</span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#313338]">
        {/* Chat Header */}
        <div className="h-12 border-b border-[#1E1F22] flex items-center justify-between px-4 shadow-sm flex-shrink-0">
          <div className="flex items-center">
            <span className="text-[#80848E] text-2xl font-light mr-2">#</span>
            <span className="font-bold text-white mr-4">{channels.find(c => c.id === activeChannel)?.name}</span>
            {roomCode && (
              <span className="text-[12px] bg-[#232428] px-2 py-0.5 rounded text-[#949BA4] font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Room: {roomCode} ({activePlannersCount || 1} online)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onCopyLink && (
              <button
                type="button"
                onClick={onCopyLink}
                className={`text-[12px] px-3 py-1.5 rounded font-semibold transition-all cursor-pointer ${
                  collabLinkCopied 
                    ? 'bg-[#23A559] text-white' 
                    : 'bg-[#5865F2] hover:bg-[#4752C4] text-white'
                }`}
              >
                {collabLinkCopied ? 'Link Copied!' : 'Copy Invite Link'}
              </button>
            )}
            {onLeave && (
              <button
                type="button"
                onClick={onLeave}
                className="text-[12px] px-3 py-1.5 rounded bg-[#DA373C] hover:bg-[#C92F34] text-white font-semibold transition-all cursor-pointer"
              >
                Leave Room
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-4 group">
              <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold ${msg.avatarClass || 'bg-gray-600'}`}>
                {msg.sender.charAt(0)}
              </div>
              <div className="flex flex-col w-full">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-white hover:underline cursor-pointer">{msg.sender}</span>
                  <span className="text-xs text-[#949BA4]">{msg.timestamp}</span>
                </div>
                
                {msg.isSuggestion ? (
                  /* Proposed Activity Pitch Card */
                  <div className="mt-1 bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-4 max-w-lg shadow-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[11px] font-bold text-[#E87C5A] uppercase tracking-wider mb-1">
                          Proposed Activity (Day {msg.dayAssociation})
                        </div>
                        <div className="text-white font-medium text-[15px] mb-2">
                          {msg.text}
                        </div>
                      </div>
                    </div>
                    {/* Voting Mechanics */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1E1F22]">
                      <button 
                        onClick={() => onVote(msg.id, 'up')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded bg-[#2B2D31] border transition-all ${
                          msg.userVoted === 'up' 
                            ? 'border-[#23A559] text-[#23A559] bg-[#23A559]/10' 
                            : 'border-[#1E1F22] text-[#949BA4] hover:bg-[#35373C]'
                        }`}
                      >
                        <span className="text-lg leading-none">▲</span>
                        <span className="text-sm font-semibold">{msg.votes || 0}</span>
                      </button>
                      <button 
                        onClick={() => onVote(msg.id, 'down')}
                        className={`flex items-center gap-1 px-2 py-1 rounded bg-[#2B2D31] border transition-all ${
                          msg.userVoted === 'down' 
                            ? 'border-[#DA373C] text-[#DA373C] bg-[#DA373C]/10' 
                            : 'border-[#1E1F22] text-[#949BA4] hover:bg-[#35373C]'
                        }`}
                      >
                        <span className="text-lg leading-none">▼</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Chat Message */
                  <div className="mt-0.5 text-[#DBDEE1] text-[15px] leading-relaxed">
                    {msg.text}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 pt-0">
          <form onSubmit={handleSend} className="relative flex flex-col gap-3">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message #${channels.find(c => c.id === activeChannel)?.name}`}
              className="w-full bg-[#383A40] text-[#DBDEE1] rounded-lg px-4 py-3 outline-none placeholder-[#949BA4] focus:ring-1 focus:ring-indigo-500 transition-shadow"
            />
            
            <div className="flex items-center gap-4 px-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={isProposal}
                  onChange={(e) => setIsProposal(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1E1F22] bg-[#2B2D31] text-indigo-500 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-sm font-medium text-[#949BA4] group-hover:text-[#DBDEE1] transition-colors">
                  Pitch as Itinerary Proposal
                </span>
              </label>

              {isProposal && (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                  <span className="text-xs text-[#80848E]">Target Day:</span>
                  <select 
                    value={proposalDay}
                    onChange={(e) => setProposalDay(Number(e.target.value))}
                    className="bg-[#2B2D31] border border-[#1E1F22] text-[#DBDEE1] text-xs rounded px-2 py-1 outline-none focus:border-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map(d => (
                      <option key={d} value={d}>Day {d}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
