import React, { useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function Login({ onLogin }){
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function submit(e){
    e.preventDefault();
    const res = await axios.post(API + '/api/login', { username, password });
    onLogin(res.data.token);
  }

  return (
    <div className="col-md-6 offset-md-3">
      <h3>Login</h3>
      <form onSubmit={submit}>
        <div className="mb-3">
          <label className="form-label">Username</label>
          <input className="form-control" value={username} onChange={e=>setUsername(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Password</label>
          <input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary">Login</button>
      </form>
    </div>
  );
}

export default Login;
