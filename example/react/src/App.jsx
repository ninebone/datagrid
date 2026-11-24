import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthGuard } from '@/core/components/AuthGuard.jsx'; // 🎯 새로 만든 방패 가져오기
import './App.css'

//const basename = "/datagrid";//(import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
const basename = import.meta.env.BASE_URL;

function App() {

    console.log("basename", import.meta.env.BASE_URL, basename);
    return (
        <Router basename={basename}>
            <AuthGuard />
        </Router>
    )
}

export default App;
