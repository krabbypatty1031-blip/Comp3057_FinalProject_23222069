/**
 * Musify App
 * Main App Component, Route Configuration
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { LyricsPage } from './pages/LyricsPage';
import { MelodyPage } from './pages/MelodyPage';
import { ClassificationPage } from './pages/ClassificationPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lyrics" element={<LyricsPage />} />
          <Route path="/melody" element={<MelodyPage />} />
          <Route path="/classification" element={<ClassificationPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
