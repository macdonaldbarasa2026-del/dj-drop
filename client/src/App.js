import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Home from './pages/Home';
import Admin from './pages/AdminDashboard';
import Login from './pages/Login';
import Register from './pages/Register';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function App(){
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(()=>{
    if (token) {
      axios.get(API + '/api/me', { headers: { Authorization: 'Bearer ' + token } }).then(r=>setUser(r.data.user)).catch(()=>{ setToken(null); localStorage.removeItem('token'); });
    }
  },[token]);

  function onLogout(){
    setToken(null); setUser(null); localStorage.removeItem('token'); navigate('/');
  }

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <Link to="/" className="navbar-brand">dj-drop</Link>
          <div className="collapse navbar-collapse">
            <ul className="navbar-nav me-auto">
              <li className="nav-item"><Link to="/" className="nav-link">Home</Link></li>
              {user && user.isAdmin && <li className="nav-item"><Link to="/admin" className="nav-link">Admin</Link></li>}
            </ul>
            <ul className="navbar-nav ms-auto">
              {user ? (
                <>
                  <li className="nav-item nav-link">{user.username}</li>
                  <li className="nav-item"><button className="btn btn-sm btn-secondary" onClick={onLogout}>Logout</button></li>
                </>
              ) : (
                <>
                  <li className="nav-item"><Link to="/login" className="nav-link">Login</Link></li>
                  <li className="nav-item"><Link to="/register" className="nav-link">Register</Link></li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<Home token={token} />} />
          <Route path="/admin" element={<Admin token={token} />} />
          <Route path="/login" element={<Login onLogin={(t)=>{ setToken(t); localStorage.setItem('token', t); navigate('/'); }} />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
