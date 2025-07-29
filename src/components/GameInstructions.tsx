import React from 'react';

interface GameInstructionsProps {
  isVisible: boolean;
  onClose: () => void;
}

const GameInstructions: React.FC<GameInstructionsProps> = ({ isVisible, onClose }) => {
  const [currentStep, setCurrentStep] = React.useState(0);

  const instructions = [
    {
      title: "Welcome to Tug of War! 🏆",
      content: "A fun blockchain-based tug-of-war game where players compete by pulling a rope. The player who pulls the rope to their side wins!",
      icon: "🎮"
    },
    {
      title: "How to Play",
      content: "1. Connect your wallet to join the game\n2. Stake MON tokens to confirm you're ready\n3. Press SPACEBAR to pull the rope\n4. First player to pull the rope to their side wins!",
      icon: "🎯"
    },
    {
      title: "Game Controls",
      content: "• SPACEBAR: Pull the rope (one-time pull)\n• The rope moves 10 units per pull\n• Game ends when rope reaches 85% of max distance\n• Timer: 60 seconds - closest player wins if time runs out",
      icon: "⌨️"
    },
    {
      title: "Blockchain Features",
      content: "• Stake MON tokens to participate\n• Automatic reward distribution to winner\n• Player1 (room creator) must sign transaction after game ends\n• This confirms game completion and triggers automatic reward distribution\n• Built on Monad Testnet",
      icon: "⛓️"
    },
    {
      title: "Tips & Strategy",
      content: "• Time your pulls strategically\n• Watch the timer - don't let it run out!\n• Coordinate with your opponent\n• Have fun and enjoy the game!",
      icon: "💡"
    }
  ];

  if (!isVisible) return null;

  const handleNext = () => {
    if (currentStep < instructions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              {instructions[currentStep].icon} {instructions[currentStep].title}
            </h2>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-gray-700 leading-relaxed whitespace-pre-line">
            {instructions[currentStep].content}
          </div>
        </div>

        {/* Progress */}
        <div className="px-6 pb-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {instructions.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {currentStep + 1} of {instructions.length}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentStep === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Previous
          </button>
          
          {currentStep === instructions.length - 1 ? (
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Got it!
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameInstructions; 