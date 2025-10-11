import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Router from './components/Router';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="App">
          <Router />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;