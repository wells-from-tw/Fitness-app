import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav        from './components/BottomNav';
import OnboardingModal  from './components/OnboardingModal';
import Home     from './pages/Home';
import Training from './pages/Training';
import History  from './pages/History';
import Settings from './pages/Settings';

export default function App() {
  const [onboarding, setOnboarding] = useState(
    () => !localStorage.getItem('wisefitness_onboarded')
  );

  return (
    <BrowserRouter>
      {onboarding ? (
        <OnboardingModal onDone={() => setOnboarding(false)} />
      ) : (
        <>
          <Routes>
            <Route path="/"         element={<Home />}     />
            <Route path="/training" element={<Training />} />
            <Route path="/history"  element={<History />}  />
            <Route path="/settings" element={<Settings />} />
          </Routes>
          <BottomNav />
        </>
      )}
    </BrowserRouter>
  );
}
