import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import App from './App';
import Summary from './pages/Summary';
import Details from './pages/Details';
import AddEntry from './pages/AddEntry';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<Summary />} />
          <Route path="/details" element={<Details />} />
          <Route path="/add" element={<AddEntry />} />
          <Route path="/edit/:id" element={<AddEntry />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
