import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function App(){
  const [products, setProducts] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(()=>{
    fetchProducts();
  },[]);

  async function fetchProducts(){
    const res = await axios.get(API + '/api/products');
    setProducts(res.data.products || []);
  }

  async function login(){
    const username = prompt('username');
    const password = prompt('password');
    const res = await axios.post(API + '/api/login', { username, password });
    setToken(res.data.token);
    localStorage.setItem('token', res.data.token);
    alert('logged in');
  }

  async function upload(){
    if(!file) return alert('choose file');
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    form.append('description', desc);
    const res = await axios.post(API + '/api/products', form, { headers: { Authorization: 'Bearer ' + token } });
    alert('uploaded, pending approval');
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>dj-drop (demo)</h1>
      {!token && <button onClick={login}>Login</button>}
      <h2>Products</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {products.map(p => (
          <div key={p.id} style={{ border: '1px solid #ddd', padding: 10 }}>
            <strong>{p.title}</strong>
            <p>{p.description}</p>
            <a href={`http://localhost:4000/api/products/${p.id}/download`}>Download</a>
          </div>
        ))}
      </div>

      <h2>Upload (for logged in users)</h2>
      <div>
        <input type="text" placeholder="title" value={title} onChange={e=>setTitle(e.target.value)} />
        <br />
        <textarea placeholder="description" value={desc} onChange={e=>setDesc(e.target.value)} />
        <br />
        <input type="file" onChange={e=>setFile(e.target.files[0])} />
        <br />
        <button onClick={upload}>Upload</button>
      </div>
    </div>
  );
}

export default App;
