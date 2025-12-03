import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import {
  Dashboard,
  Users,
  Products,
  Orders,
  Categories,
  Sellers,
  SupportTickets,
  Settings
} from './pages/AdvancedAdminComponents';
import { Header, Sidebar, ProtectedRoute, Analytics, Login } from './components/Header';
import './styles/index.css';

// Basic store setup
const store = {
  getState: () => ({}),
  subscribe: () => {},
  dispatch: () => {}
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="flex h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Sidebar />
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/categories" element={<Categories />} />
                        <Route path="/sellers" element={<Sellers />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/support-tickets" element={<SupportTickets />} />
                        <Route path="/settings" element={<Settings />} />
                      </Routes>
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </Provider>
  );
}

export default App;