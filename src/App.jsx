import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { getTodayKey } from './utils/storage';
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

  // PWAs often stay open in the background across midnight. All pages load
  // "today's" data once at mount, so when the date flips we reload the page
  // to start a fresh session on the new day (all data is already persisted
  // to localStorage on every change, so nothing is lost).
  useEffect(() => {
    const startKey = getTodayKey();
    const check = () => { if (getTodayKey() !== startKey) window.location.reload(); };
    const timer = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);

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
