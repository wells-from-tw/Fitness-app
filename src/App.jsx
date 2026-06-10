import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import BottomNav        from './components/BottomNav';
import OnboardingModal  from './components/OnboardingModal';
import ErrorBoundary    from './components/ErrorBoundary';
import Home     from './pages/Home';
import Training from './pages/Training';
import History  from './pages/History';
import Settings from './pages/Settings';

// key={pathname} resets the boundary on every navigation, so if one tab
// crashes the user can still tap another tab (BottomNav is outside the
// boundary) to recover without a full reload.
function AppRoutes() {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="/"         element={<Home />}     />
        <Route path="/training" element={<Training />} />
        <Route path="/history"  element={<History />}  />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </ErrorBoundary>
  );
}

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
          <AppRoutes />
          <BottomNav />
        </>
      )}
    </BrowserRouter>
  );
}
