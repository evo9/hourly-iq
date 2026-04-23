import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 flex items-center h-14">
            <a href="/" className="font-bold text-gray-900 text-lg hover:text-blue-600 transition-colors">
              HourlyIQ
            </a>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/clients" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <Toaster position="bottom-right" />
    </BrowserRouter>
  );
}
