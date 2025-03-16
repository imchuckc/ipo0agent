'use client';

import { useEffect, useState } from 'react';
import LoadingScreen from '@/components/LoadingScreen';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Simulate loading time
  useEffect(() => {
    // Set a timeout to simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 5000); // 5 seconds loading time

    // Clean up the timer
    return () => clearTimeout(timer);
  }, []);

  // Handle navigation to analysis pages
  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <main>
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-800 to-secondary-800 text-white p-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Welcome to IPO0</h1>
          <p className="text-xl mb-12">Your AI-powered VLSI backend analysis platform is ready.</p>
          
          {/* Placeholder for the main dashboard */}
          <div className="w-full max-w-6xl bg-white/10 backdrop-blur-sm p-8 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Analysis Dashboard</h2>
            <p className="mb-6">Select an analysis type to begin:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button 
                className="bg-primary-600 hover:bg-primary-500 p-4 rounded-lg transition-colors"
                onClick={() => handleNavigation('/timing-analysis')}
              >
                Timing Path Analysis
              </button>
              <button 
                className="bg-primary-600 hover:bg-primary-500 p-4 rounded-lg transition-colors"
                onClick={() => handleNavigation('/congestion-analysis')}
              >
                Congestion Analysis
              </button>
              <button 
                className="bg-primary-600 hover:bg-primary-500 p-4 rounded-lg transition-colors"
                onClick={() => handleNavigation('/log-analysis')}
              >
                Log Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
