import React from 'react';
import { motion } from 'framer-motion';
import { PulseLoader } from 'react-spinners';

// Animation variants for the elements
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      when: "beforeChildren",
      staggerChildren: 0.3,
      duration: 0.8
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

// Loading screen component with animation
const LoadingScreen: React.FC = () => {
  return (
    <motion.div 
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 to-secondary-900 text-white p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Logo and title */}
      <motion.div 
        className="text-center mb-12"
        variants={itemVariants}
      >
        <h1 className="text-4xl md:text-6xl font-bold mb-2">IPO0</h1>
        <h2 className="text-xl md:text-2xl text-primary-300">VLSI Backend Analysis Platform</h2>
      </motion.div>
      
      {/* Loading animation */}
      <motion.div 
        className="mb-12"
        variants={itemVariants}
      >
        <PulseLoader color="#7dd3fc" size={15} margin={8} />
      </motion.div>
      
      {/* Features */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl"
        variants={itemVariants}
      >
        {[
          { title: "Timing Path Analysis", icon: "⏱️" },
          { title: "Congestion Analysis", icon: "🔍" },
          { title: "Log Analysis", icon: "📊" }
        ].map((feature, index) => (
          <motion.div 
            key={index}
            className="bg-white/10 backdrop-blur-sm p-6 rounded-lg text-center hover:bg-white/20 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="text-3xl mb-3">{feature.icon}</div>
            <h3 className="text-lg font-semibold">{feature.title}</h3>
            <p className="text-sm text-gray-300 mt-2">AI-powered analysis</p>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Status message */}
      <motion.div 
        className="mt-12 text-primary-200 text-sm animate-pulse-slow"
        variants={itemVariants}
      >
        Initializing AI analysis engine...
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen; 