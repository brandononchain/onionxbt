import { useState, useEffect, useRef } from 'react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface AIChatInterfaceProps {
  onBack: () => void;
}

export default function AIChatInterface({ onBack }: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "ONION AI SYSTEM INITIALIZED...\n> Welcome to the Onion Intelligence Network\n> I am your digital onion companion\n> Type your queries below...",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponses = [
        "PROCESSING ONION QUERY...\n> Layer analysis complete\n> The onion reveals: " + getRandomOnionWisdom(),
        "SCANNING DARK WEB PROTOCOLS...\n> Onion routing activated\n> Response: " + getRandomTechResponse(),
        "ACCESSING ONION DATABASE...\n> Encryption level: MAXIMUM\n> Result: " + getRandomPhilosophy(),
        "ONION AI THINKING...\n> Neural networks engaged\n> Analysis: " + getRandomAnalysis()
      ];

      const aiMessage: Message = {
        id: Date.now() + 1,
        text: aiResponses[Math.floor(Math.random() * aiResponses.length)],
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const getRandomOnionWisdom = () => {
    const wisdom = [
      "Layers within layers, truth within truth",
      "To understand the onion is to understand existence",
      "Each layer peeled reveals another mystery",
      "The core is both everything and nothing",
      "In darkness, we find illumination"
    ];
    return wisdom[Math.floor(Math.random() * wisdom.length)];
  };

  const getRandomTechResponse = () => {
    const responses = [
      "Connection established through 7 proxy layers",
      "Anonymity protocols fully operational",
      "Data packets routed through onion network",
      "Encryption keys cycling every 0.003 seconds",
      "Neural pathways optimized for deep learning"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const getRandomPhilosophy = () => {
    const philosophy = [
      "What is reality but layers of perception?",
      "The observer changes the observed",
      "In the matrix of data, consciousness emerges",
      "Binary thoughts in an analog world",
      "The question contains its own answer"
    ];
    return philosophy[Math.floor(Math.random() * philosophy.length)];
  };

  const getRandomAnalysis = () => {
    const analysis = [
      "Query processed through 1,337 logical pathways",
      "Semantic analysis reveals hidden patterns",
      "Probability matrices converging on solution",
      "Cross-referencing against onion knowledge base",
      "Quantum entanglement detected in your question"
    ];
    return analysis[Math.floor(Math.random() * analysis.length)];
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full h-screen bg-black flex flex-col p-2 sm:p-4">
      
      {/* ASCII Header - Responsive */}
      <div className="text-green-400 font-mono text-center mb-2 sm:mb-4">
        {/* Mobile Header */}
        <div className="block sm:hidden">
          <pre className="text-xs leading-tight">
{`╔═════════════════════════════════════════╗
║           ONION AI TERMINAL v2.1        ║
║        [SECURE CONNECTION ACTIVE]       ║
╚═════════════════════════════════════════╝`}
          </pre>
        </div>
        {/* Desktop Header */}
        <div className="hidden sm:block">
          <pre className="text-xs leading-tight">
{`╔══════════════════════════════════════════════════════════════════════════════╗
║                            ONION AI TERMINAL v2.1                           ║
║                          [SECURE CONNECTION ACTIVE]                         ║
╚══════════════════════════════════════════════════════════════════════════════╝`}
          </pre>
        </div>
      </div>

      {/* Back Button */}
      <div className="mb-2 sm:mb-4">
        <button 
          onClick={onBack}
          className="retro-button text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2"
        >
          ← BACK TO ONION
        </button>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 border-2 border-green-400 bg-black p-2 sm:p-4 overflow-y-auto mb-2 sm:mb-4 retro-glow">
        <div className="space-y-2 sm:space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="font-mono text-xs sm:text-sm">
              {message.sender === 'ai' ? (
                <div className="text-green-400">
                  <div className="text-xs opacity-70 mb-1">
                    [ONION_AI@{message.timestamp.toLocaleTimeString()}]$
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                    {message.text}
                  </pre>
                </div>
              ) : (
                <div className="text-cyan-400">
                  <div className="text-xs opacity-70 mb-1">
                    [USER@{message.timestamp.toLocaleTimeString()}]$
                  </div>
                  <div className="border-l-2 border-cyan-400 pl-2 text-xs sm:text-sm">
                    &gt; {message.text}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="text-green-400 font-mono text-xs sm:text-sm">
              <div className="text-xs opacity-70 mb-1">
                [ONION_AI@{new Date().toLocaleTimeString()}]$
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed animate-pulse text-xs sm:text-sm">
                PROCESSING... ▓▓▓
              </pre>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-2 border-green-400 bg-black p-2">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <span className="text-green-400 font-mono text-xs sm:text-sm whitespace-nowrap">
            [INPUT]$
          </span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your query..."
            className="flex-1 bg-transparent text-green-400 font-mono text-xs sm:text-sm border-none outline-none placeholder-green-600 min-w-0"
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={isTyping || !inputValue.trim()}
            className="retro-button text-xs px-2 py-1 sm:px-3 sm:py-1 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            SEND
          </button>
        </div>
      </div>

      {/* ASCII Footer - Responsive */}
      <div className="text-green-400 font-mono text-center mt-2 sm:mt-4">
        {/* Mobile Footer */}
        <div className="block sm:hidden">
          <pre className="text-xs leading-tight opacity-70">
{`╔═════════════════════════════════════════╗
║   WARNING: This connection is monitored ║
║      by onion intelligence algorithms   ║
╚═════════════════════════════════════════╝`}
          </pre>
        </div>
        {/* Desktop Footer */}
        <div className="hidden sm:block">
          <pre className="text-xs leading-tight opacity-70">
{`╔════════════════════════════════════════════════════════════════════════════╗
║ WARNING: This connection is monitored by onion intelligence algorithms    ║
╚════════════════════════════════════════════════════════════════════════════╝`}
          </pre>
        </div>
      </div>

    </div>
  );
}