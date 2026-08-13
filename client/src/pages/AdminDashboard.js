import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function AdminDashboard({ token }){
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(()=>{ fetchPending(); fetchUsers(); },[]);

  async function fetchPending(){
    if(!token) return;
    const res = await axios.get(API + '/api/admin/products/pending', { headers: { Authorization: 'Bearer ' + token } });
    setPending(res.data.products || []);
  }

  async function fetchUsers(){
    if(!token) return;
    const res = await axios.get(API + '/api/admin/users', { headers: { Authorization: 'Bearer ' + token } });
    setUsers(res.data.users || []);
  }

  async function approve(id){
    await axios.post(API + '/api/admin/products/' + id + '/approve', {}, { headers: { Authorization: 'Bearer ' + token } });
    fetchPending();
  }

  async function reject(id){
    const reason = prompt('Reason for rejection (optional)');
    const del = window.confirm('Delete uploaded file from server?');
    await axios.post(API + '/api/admin/products/' + id + '/reject', { reason, deleteFile: del }, { headers: { Authorization: 'Bearer ' + token } });
    fetchPending();
  }

  return (
    <div>
      <h3>Pending uploads</h3>
      {pending.length === 0 && <p>No pending uploads.</p>}
      {pending.map(p => (
        <div key={p.id} className="card mb-2">
          <div className="card-body">
            <h5>{p.title}</h5>
            <p className="small">Uploaded by: {p.User?.username}</p>
            <a className="btn btn-sm btn-outline-primary me-2" href={`/uploads/${p.filename}`} target="_blank" rel="noreferrer">Preview</a>
            <button className="btn btn-sm btn-success me-2" onClick={()=>approve(p.id)}>Approve</button>
            <button className="btn btn-sm btn-danger" onClick={()=>reject(p.id)}>Reject</button>
          </div>
        </div>
      ))}

      <hr />
      <h3>Users</h3>
      <table className="table">
        <thead><tr><th>ID</th><th>Username</th><th>Admin</th><th>Created</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}><td>{u.id}</td><td>{u.username}</td><td>{u.isAdmin ? 'Yes' : 'No'}</td><td>{new Date(u.createdAt).toLocaleString()}</td></tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}

export default AdminDashboard;
