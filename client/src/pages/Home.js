import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function Home({ token }){
  const [products, setProducts] = useState([]);
  const [ads, setAds] = useState([]);
  const [qrcode, setQrcode] = useState(null);

  useEffect(()=>{ fetchProducts(); },[]);

  async function fetchProducts(){
    const res = await axios.get(API + '/api/products');
    setProducts(res.data.products || []);
    setAds(res.data.ads || []);
  }

  async function showQR(id){
    const res = await axios.get(API + '/api/products/' + id + '/qrcode');
    setQrcode(res.data.qrcode);
  }

  return (
    <div>
      <div className="row mb-3">
        <div className="col">
          <h2>Products</h2>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="row">
            {products.map(p => (
              <div className="col-md-6" key={p.id}>
                <div className="card mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{p.title}</h5>
                    <p className="card-text">{p.description}</p>
                    <a className="btn btn-sm btn-primary me-2" href={`${API}/api/products/${p.id}/download`}>Download</a>
                    <button className="btn btn-sm btn-outline-secondary" onClick={()=>showQR(p.id)}>Show QR</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-md-4">
          <h5>Ads</h5>
          {ads.map(a=> (
            <div key={a.id} className="card mb-2">
              {a.imageUrl && <img src={a.imageUrl} className="card-img-top" alt={a.title} />}
              <div className="card-body">
                <h6>{a.title}</h6>
                {a.link && <a href={a.link} className="btn btn-sm btn-outline-primary">Open</a>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR modal simple */}
      {qrcode && (
        <div className="modal show d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Scan QR to download</h5>
                <button type="button" className="btn-close" onClick={()=>setQrcode(null)}></button>
              </div>
              <div className="modal-body text-center">
                <img src={qrcode} alt="qrcode" style={{ maxWidth: '100%' }} />
                <p className="small mt-2">Open this on your phone and scan the QR code with your camera.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
