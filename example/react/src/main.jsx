import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { nine, trace } from '@ninebone/util'


nine.setup({
    //cssPath: "/css/nine-table",
    debug: {
        enable: true,//import.meta.env.VITE_DEBUG_ENABLE === 'true',
        //filter: ["nine-ux", "nine-util", "nine-mu", "nine-template"],
        filter: ["nine-table"],
    },
    "nine-table": {
        cssFile: "./css/nine-table/nine-table.css",
    },
});

//trace.init("nine-table", "#333");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
