import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
import imgJustanonion1 from "figma:asset/f1fcc38275b40a30340e2ca59c8dbabaff8209f5.png";
import WalletGate from '../components/WalletGate';
import AIChatInterface from '../components/AIChatInterface';
import { useAuth } from '../lib/AuthContext';

function Guard({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname, gated: true }} />;
  }
  return children;
}

function GatePage() {
  const location = useLocation() as any;
  const gated = location?.state?.gated;
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/home" replace />;
  return (
    <div className="w-full min-h-screen bg-black flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 mb-6 sm:mb-8 onion-breathe">
        <div 
          className="w-full h-full bg-center bg-contain bg-no-repeat onion-rotate" 
          style={{ backgroundImage: `url('${imgJustanonion1}')` }} 
        />
      </div>
      <div className="mt-4 sm:mt-8 mb-6 sm:mb-8 px-4">
        <p className="text-green-400 text-lg sm:text-xl font-mono text-center">
          I am just an onion
        </p>
      </div>
      {gated && (
        <div className="mb-4 text-sm text-neutral-300">
          Access is gated. Please connect and Verify Access to continue.
        </div>
      )}
      <div className="w-full max-w-xl">
        <WalletGate />
      </div>
    </div>
  );
}

function HomePage() {
  return (
    <div className="w-full min-h-screen bg-black text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Home</h1>
        <nav className="flex gap-3 text-sm">
          <Link to="/home" className="text-neutral-300 hover:text-white">Home</Link>
          <Link to="/chat" className="text-neutral-300 hover:text-white">Copilot</Link>
        </nav>
      </div>
      <p className="text-neutral-300">Welcome. You have verified access.</p>
    </div>
  );
}

function ChatPage({ onBack }: { onBack?: () => void }) {
  return (
    <div className="w-full min-h-screen bg-black text-white">
      <AIChatInterface onBack={onBack || (() => {})} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GatePage />} />
        <Route
          path="/home"
          element={
            <Guard>
              <HomePage />
            </Guard>
          }
        />
        <Route
          path="/chat"
          element={
            <Guard>
              <ChatPage />
            </Guard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

