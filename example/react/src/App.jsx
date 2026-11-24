import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthGuard } from '@/core/components/AuthGuard.jsx'; // 🎯 새로 만든 방패 가져오기
import './App.css'

function App() {

    return (
        <Router>
            <AuthGuard />
        </Router>
    )
}

export default App;
