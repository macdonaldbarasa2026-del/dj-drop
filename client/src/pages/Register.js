import React, { useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function Register(){
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);

  async function submit(e){
    e.preventDefault();
    try {
      await axios.post(API + '/api/register', { username, password });
      setMsg('Registered. Please login.');
    } catch (e) { setMsg('Error: ' + (e.response?.data?.error || e.message)); }
  }

  return (
    <div className="col-md-6 offset-md-3">
      <h3>Register</h3>
      {msg && <div className="alert alert-info">{msg}</div>}
      <form onSubmit={submit}>
        <div className="mb-3">
          <label className="form-label">Username</label>
          <input className="form-control" value={username} onChange={e=>setUsername(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Password</label>
          <input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary">Register</button>
      </form>
    </div>
  );
}

export default Register;
