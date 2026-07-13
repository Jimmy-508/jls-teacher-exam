import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import KnowledgePage from './pages/KnowledgePage';
import PracticePage from './pages/PracticePage';
import QuestionBankPage from './pages/QuestionBankPage';
import ResultPage from './pages/ResultPage';
import SettingsPage from './pages/SettingsPage';
import TodayPage from './pages/TodayPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<TodayPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/question-bank" element={<QuestionBankPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
