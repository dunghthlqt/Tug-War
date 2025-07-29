import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ReactTogether } from '@multisynq/react-together';
import { useMemo } from 'react';
import Home from './pages/Home';
import GameLobby from './components/GameLobby';

const API_KEY = import.meta.env.VITE_MULTISYNQ_API_KEY || '2SmxmK3rOUzTkujfwOCrHbUoDD7DNxZ9S8k9K23FEy';
const APP_ID = 'com.example.tugofwar';

function AppRoutes() {
  const location = useLocation();
  
  // Generate session params based on URL
  const sessionParams = useMemo(() => {
    const pathParts = location.pathname.split('/');
    const roomId = pathParts[2]; // Get room ID from /game/:roomId

    return {
      apiKey: API_KEY,
      appId: APP_ID,
      name: roomId || 'lobby',
      password: roomId || 'default'
    };
  }, [location.pathname]);

  return (
    <ReactTogether
      sessionParams={sessionParams}
      sessionIgnoresUrl={true}
    >
      <Routes>
        <Route path="/" element={<GameLobby />} />
        <Route path="/game/:roomId" element={<Home />} />
      </Routes>
    </ReactTogether>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
