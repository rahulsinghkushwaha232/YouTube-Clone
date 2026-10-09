import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App.jsx'
import Layout from './components/Layout.jsx'
import WatchPage from './components/WatchPage.jsx'
import SearchFeed from './components/SearchFeed.jsx'
import Explore from './components/Explore.jsx'
import Subscriptions from './components/Subscriptions.jsx'
import Library from './components/Library.jsx'
import History from './components/History.jsx'
import Shorts from './components/Shorts.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<App />} />
          <Route path="watch/:id" element={<WatchPage />} />
          <Route path="search/:searchTerm" element={<SearchFeed />} />
          <Route path="explore" element={<Explore />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="library" element={<Library />} />
          <Route path="history" element={<History />} />
          <Route path="shorts" element={<Shorts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
