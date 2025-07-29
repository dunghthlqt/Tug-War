import React from 'react';

interface LoadingScreenProps {
  isVisible: boolean;
  message?: string;
  type?: 'game' | 'wallet' | 'blockchain';
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  isVisible, 
  message = 'Loading...', 
  type = 'game' 
}) => {
  if (!isVisible) return null;

  const getLoadingContent = () => {
    switch (type) {
      case 'wallet':
        return {
          icon: '🔗',
          title: 'Connecting Wallet',
          tips: [
            'Make sure MetaMask is installed',
            'Approve the connection request',
            'Switch to Monad Testnet if needed'
          ]
        };
      case 'blockchain':
        return {
          icon: '⛓️',
          title: 'Processing Blockchain Transaction',
          tips: [
            'Please wait for transaction confirmation',
            'Do not close this window',
            'Transaction may take a few seconds'
          ]
        };
      default:
        return {
          icon: '🎮',
          title: 'Loading Game',
          tips: [
            'Initializing game components',
            'Connecting to blockchain network',
            'Setting up multiplayer synchronization'
          ]
        };
    }
  };

  const content = getLoadingContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-bounce">
            {content.icon}
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {content.title}
          </h2>
          <p className="text-gray-600">
            {message}
          </p>
        </div>

        {/* Loading Animation */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            💡 Tips:
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            {content.tips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen; 