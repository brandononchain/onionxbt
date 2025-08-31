import { useState } from 'react';
import imgJustanonion1 from "figma:asset/f1fcc38275b40a30340e2ca59c8dbabaff8209f5.png";
import AIChatInterface from './components/AIChatInterface';

type Page = 'home' | 'chat';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const handleEatMe = () => {
    setCurrentPage('chat');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
  };

  if (currentPage === 'chat') {
    return <AIChatInterface onBack={handleBackToHome} />;
  }

  return (
    <div className="w-full h-screen bg-black flex flex-col items-center justify-center p-4 sm:p-8">
      
      {/* Figma Onion Image - Responsive */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 mb-6 sm:mb-8 onion-breathe">
        <div 
          className="w-full h-full bg-center bg-contain bg-no-repeat onion-rotate" 
          style={{ backgroundImage: `url('${imgJustanonion1}')` }} 
        />
      </div>
      
      {/* Text underneath - Responsive */}
      <div className="mt-4 sm:mt-8 mb-6 sm:mb-8 px-4">
        <p className="text-green-400 text-lg sm:text-xl font-mono text-center">
          I am just an onion
        </p>
      </div>
      
      {/* CTA Buttons - Responsive */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center w-full max-w-sm sm:max-w-none sm:w-auto">
        <button 
          onClick={handleEatMe}
          className="bg-transparent border border-green-400 text-green-400 px-6 py-3 sm:py-2 font-mono hover:bg-green-400 hover:text-black transition-colors text-sm sm:text-base"
        >
          Eat me
        </button>
        <button className="bg-transparent border border-green-400 text-green-400 px-6 py-3 sm:py-2 font-mono hover:bg-green-400 hover:text-black transition-colors text-sm sm:text-base">
          Trade me
        </button>
      </div>
      
    </div>
  );
}