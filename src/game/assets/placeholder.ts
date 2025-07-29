export function createPlaceholderAssets() {
  // Create player sprite
  const playerCanvas = document.createElement('canvas');
  playerCanvas.width = 50;
  playerCanvas.height = 100;
  const playerCtx = playerCanvas.getContext('2d');
  if (playerCtx) {
    // Draw body
    playerCtx.fillStyle = '#4CAF50';
    playerCtx.fillRect(10, 20, 30, 60);
    
    // Draw head
    playerCtx.fillStyle = '#2E7D32';
    playerCtx.beginPath();
    playerCtx.arc(25, 15, 12, 0, Math.PI * 2);
    playerCtx.fill();
    
    // Draw arms
    playerCtx.fillStyle = '#4CAF50';
    playerCtx.fillRect(0, 40, 10, 20); // Left arm
    playerCtx.fillRect(40, 40, 10, 20); // Right arm
    
    // Draw legs
    playerCtx.fillRect(15, 80, 8, 20); // Left leg
    playerCtx.fillRect(27, 80, 8, 20); // Right leg
  }
  const player1DataUrl = playerCanvas.toDataURL();
  const player2DataUrl = playerCanvas.toDataURL();

  // Create toilet paper sprite
  const toiletPaperCanvas = document.createElement('canvas');
  toiletPaperCanvas.width = 400;
  toiletPaperCanvas.height = 40;
  const toiletPaperCtx = toiletPaperCanvas.getContext('2d');
  if (toiletPaperCtx) {
    // Draw main paper
    toiletPaperCtx.fillStyle = '#FFFFFF';
    toiletPaperCtx.fillRect(0, 10, 400, 20);
    
    // Add some texture
    toiletPaperCtx.fillStyle = '#EEEEEE';
    for (let i = 0; i < 20; i++) {
      toiletPaperCtx.fillRect(i * 20, 15, 2, 10);
    }
    
    // Add roll ends
    toiletPaperCtx.fillStyle = '#DDDDDD';
    toiletPaperCtx.beginPath();
    toiletPaperCtx.arc(20, 20, 20, 0, Math.PI * 2);
    toiletPaperCtx.arc(380, 20, 20, 0, Math.PI * 2);
    toiletPaperCtx.fill();
  }
  const toiletPaperDataUrl = toiletPaperCanvas.toDataURL();

  return {
    player1: player1DataUrl,
    player2: player2DataUrl,
    toiletPaper: toiletPaperDataUrl,
  };
} 