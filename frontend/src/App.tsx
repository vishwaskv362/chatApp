import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'

function App() {
  const { token } = useAuthStore()

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={token ? <Navigate to="/chat" /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={token ? <Navigate to="/chat" /> : <Register />} 
        />
        <Route 
          path="/chat" 
          element={token ? <Chat /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={<Navigate to={token ? "/chat" : "/login"} />} 
        />
      </Routes>
    </Router>
  )
}

export default App
