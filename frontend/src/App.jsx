import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Cloud, Compass, Info, Navigation, Send, Sparkles, Sun, CloudRain } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://api-arahloka.duskoide.org/api';
const API_ORIGIN = API_BASE.replace(/\/api$/, '');

const resolveMediaUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (/^(https?:\/\/|data:)/i.test(imageUrl)) return imageUrl;
  if (imageUrl.startsWith('/uploads/')) return `${API_ORIGIN}${imageUrl}`;
  if (imageUrl.startsWith('/images/')) return imageUrl;
  return imageUrl;
};

const mapRoleLabel = (role) => {
  if (role === 'producer') return 'Penyedia Jasa Travel';
  if (role === 'consumer') return 'Turis';
  return 'Superadmin';
};

const statusLabel = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  active: 'Aktif',
  hidden: 'Nonaktif',
  accepted: 'Terkonfirmasi',
  confirmed: 'Terkonfirmasi',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa'
};

const FALLBACK_DESTINATIONS = [
  { id: 101, name: 'Desa Penglipuran', region: 'Bali', mood_tags: 'healing,cultural', duration_tags: 'half day,one day', interest_tags: 'local culture,traditional village', travel_style_tags: 'relaxed,balanced', cultural_highlight: 'Salah satu desa terbersih di dunia dengan arsitektur tradisional Bali.', recommended_activity: 'Jalan santai di hutan bambu dan kunjungi rumah tradisional.', local_etiquette: 'Berpakaian sopan dan minta izin sebelum memasuki halaman rumah warga.', latitude: -8.4312, longitude: 115.3571, image_url: null },
  { id: 102, name: 'Candi Borobudur', region: 'Jawa Tengah', mood_tags: 'cultural,educational', duration_tags: 'one day', interest_tags: 'history,local culture', travel_style_tags: 'balanced,exploration', cultural_highlight: 'Candi Buddha terbesar di dunia dan situs warisan dunia UNESCO.', recommended_activity: 'Tur matahari terbit dan melihat relief batu candi.', local_etiquette: 'Gunakan sarung dan jaga area stupa serta relief.', latitude: -7.6079, longitude: 110.2038, image_url: null },
  { id: 103, name: 'Kampung Adat Wae Rebo', region: 'Nusa Tenggara Timur', mood_tags: 'adventure,cultural', duration_tags: 'two days,three days', interest_tags: 'traditional village,nature', travel_style_tags: 'exploration', cultural_highlight: 'Desa adat pegunungan dengan rumah Mbaru Niang yang ikonik.', recommended_activity: 'Trekking menuju desa dan menginap semalam.', local_etiquette: 'Ikuti upacara penyambutan sebelum menjelajah desa.', latitude: -8.7667, longitude: 120.2833, image_url: null },
  { id: 104, name: 'Pasar Terapung Lok Baintan', region: 'Kalimantan Selatan', mood_tags: 'cultural,culinary', duration_tags: 'half day', interest_tags: 'local culture,culinary', travel_style_tags: 'exploration,relaxed', cultural_highlight: 'Pasar tradisional terapung dengan aktivitas dagang di atas perahu.', recommended_activity: 'Naik klotok saat pagi dan cicipi kuliner Banjar.', local_etiquette: 'Sapa pedagang dengan ramah dan siap berangkat pagi.', latitude: -3.3444, longitude: 114.6556, image_url: null },
  { id: 105, name: 'Keraton Yogyakarta', region: 'DI Yogyakarta', mood_tags: 'cultural,educational', duration_tags: 'half day,one day', interest_tags: 'history,local culture', travel_style_tags: 'relaxed,balanced', cultural_highlight: 'Pusat kebudayaan Jawa sekaligus istana Kesultanan Yogyakarta.', recommended_activity: 'Menonton pertunjukan budaya dan tur museum keraton.', local_etiquette: 'Jaga ketenangan dan hindari penggunaan topi di area tertentu.', latitude: -7.8053, longitude: 110.3642, image_url: null },
  { id: 106, name: 'Tana Toraja', region: 'Sulawesi Selatan', mood_tags: 'cultural,adventure', duration_tags: 'two days,three days', interest_tags: 'history,local culture,traditional village', travel_style_tags: 'exploration', cultural_highlight: 'Kawasan budaya dengan rumah tongkonan dan tradisi upacara adat.', recommended_activity: 'Kunjungi situs budaya dan rumah adat Toraja.', local_etiquette: 'Hormati aturan adat setempat ketika menghadiri kegiatan budaya.', latitude: -2.9833, longitude: 119.9, image_url: null }
];

const Badge = ({ value }) => (
  <span className={`status-pill status-${value}`}>{statusLabel[value] || value}</span>
);

const OfferImage = ({ imageUrl, title }) => {
  const [failed, setFailed] = useState(false);
  const resolved = resolveMediaUrl(imageUrl);
  if (resolved && !failed) {
    return <img src={resolved} alt={title} className="dest-img" onError={() => setFailed(true)} />;
  }
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', padding: 20, textAlign: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
      {title}
    </div>
  );
};

const AuthForm = ({ mode, onSubmit, loading, switchMode, message, error }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'consumer' });
  const isRegister = mode === 'register';
  return (
    <section className="container" id="login-section" style={{ padding: '100px 0' }}>
      <div className="record-card animate-fade-up" style={{ maxWidth: 500, margin: '0 auto', padding: 50 }}>
        <div className="section-title-wrap">
          <h2>{isRegister ? 'Gabung ArahLoka' : 'Masuk ke Platform'}</h2>
          <p>{isRegister ? 'Mulai petualangan budayamu sekarang.' : 'Selamat datang kembali.'}</p>
        </div>
        <form className="record-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
          {isRegister && <div className="form-group form-full"><label>Nama Lengkap</label><input placeholder="Nama Anda" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>}
          <div className="form-group form-full"><label>Email</label><input type="email" placeholder="email@contoh.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="form-group form-full"><label>Password</label><input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
          {isRegister && (
            <div className="form-group form-full">
              <label>Mendaftar Sebagai</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="consumer">Turis (Cari & Pesan Pengalaman)</option>
                <option value="producer">Penyedia Jasa (Tawarkan Layanan Budaya)</option>
              </select>
            </div>
          )}
          {message && <div className="form-full" style={{ marginBottom: 20, color: 'var(--color-success)', fontWeight: 700, textAlign: 'center' }}>{message}</div>}
          {error && <div className="form-full" style={{ marginBottom: 20, color: 'var(--color-danger)', fontWeight: 700, textAlign: 'center' }}>{error}</div>}
          <div className="form-full"><button className="btn-primary" style={{ width: '100%', padding: 18 }} type="submit" disabled={loading}>{loading ? 'Memproses...' : isRegister ? 'Daftar Sekarang' : 'Masuk Sekarang'}</button></div>
          <div className="form-full" style={{ textAlign: 'center', marginTop: 24 }}>
            <button type="button" style={{ border: 'none', background: 'none', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }} onClick={switchMode}>{isRegister ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Daftar gratis'}</button>
          </div>
        </form>
      </div>
    </section>
  );
};

const PlannerCard = ({ preferences, setPreferences, onSearch, loading }) => (
  <div className="planner-card-wrap glass-card animate-fade-up">
    <div className="planner-grid">
      <div className="planner-item">
        <label>🌿 Suasana</label>
        <select value={preferences.mood} onChange={(e) => setPreferences({ ...preferences, mood: e.target.value })}>
          <option value="healing">Ketenangan</option>
          <option value="cultural">Budaya</option>
          <option value="adventure">Petualangan</option>
          <option value="culinary">Kuliner</option>
          <option value="educational">Edukatif</option>
        </select>
      </div>
      <div className="planner-item">
        <label>🕒 Waktu</label>
        <select value={preferences.duration} onChange={(e) => setPreferences({ ...preferences, duration: e.target.value })}>
          <option value="half day">Setengah Hari</option>
          <option value="one day">Satu Hari</option>
          <option value="two days">Dua Hari</option>
          <option value="three days">Tiga Hari+</option>
        </select>
      </div>
      <div className="planner-item">
        <label>🍃 Minat</label>
        <select value={preferences.interest} onChange={(e) => setPreferences({ ...preferences, interest: e.target.value })}>
          <option value="nature">Alam</option>
          <option value="local culture">Budaya Lokal</option>
          <option value="history">Sejarah</option>
          <option value="culinary">Kuliner</option>
          <option value="traditional village">Desa Tradisional</option>
        </select>
      </div>
      <div className="planner-item">
        <label>🧘 Gaya</label>
        <select value={preferences.style} onChange={(e) => setPreferences({ ...preferences, style: e.target.value })}>
          <option value="relaxed">Santai</option>
          <option value="balanced">Seimbang</option>
          <option value="exploration">Eksploratif</option>
        </select>
      </div>
    </div>
    <button className="btn-primary" style={{ width: '100%' }} onClick={onSearch} disabled={loading}>
      <Sparkles size={20} /> {loading ? 'Mencari...' : 'Cari Rekomendasi'}
    </button>
  </div>
);

const GuestPage = ({ submitAuth, authMode, setAuthMode, authLoading, authMessage, authError, pendingMessage, loginRef }) => {
  return (
    <main>
      <section className="hero-section" id="beranda" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?q=80&w=2070')" }}>
        <div className="hero-overlay"></div>
        <div className="container hero-content-inner">
          <h1 className="animate-fade-up">Jelajahi Budaya Indonesia dengan Lebih Siap</h1>
          <p className="animate-fade-up" style={{ animationDelay: '0.2s' }}>ArahLoka membantu turis menemukan pengalaman wisata budaya, memesan penawaran lokal, dan menyiapkan itinerary perjalanan dalam satu platform premium.</p>
          <div className="hero-ctas animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <button className="btn-primary" onClick={() => loginRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Mulai Perjalanan</button>
            <button className="btn-secondary" onClick={() => document.getElementById('destinasi-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Lihat Destinasi</button>
          </div>
        </div>
      </section>

      <section className="container" id="destinasi-section">
        <div className="section-title-wrap">
          <h2>Destinasi Budaya Unggulan</h2>
          <p>Temukan keajaiban tradisi dan sejarah di berbagai sudut nusantara.</p>
        </div>
        <div className="dest-grid">
          {FALLBACK_DESTINATIONS.map((d) => <RecommendationCard key={d.id} dest={d} isRecommendation={false} />)}
        </div>
      </section>

      <section className="container" id="mengapa-section" style={{ background: '#F8FAFC', margin: '80px 0', padding: '80px 24px', borderRadius: 32 }}>
        <div className="section-title-wrap">
          <h2>Mengapa Memilih ArahLoka?</h2>
          <p>Platform terintegrasi untuk pengalaman budaya yang tak terlupakan.</p>
        </div>
        <div className="dest-grid">
          <div className="record-card" style={{ marginBottom: 0, padding: 30 }}>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: 15 }}>Akurasi Budaya</h3>
            <p style={{ fontSize: '0.9rem' }}>Kami bekerja sama dengan kurator lokal untuk memastikan informasi budaya yang Anda terima akurat dan bermakna.</p>
          </div>
          <div className="record-card" style={{ marginBottom: 0, padding: 30 }}>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: 15 }}>Persiapan Matang</h3>
            <p style={{ fontSize: '0.9rem' }}>Fitur checklist kesiapan kami membantu Anda menyiapkan perlengkapan dan pengetahuan sebelum berangkat.</p>
          </div>
          <div className="record-card" style={{ marginBottom: 0, padding: 30 }}>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: 15 }}>Dukung Komunitas</h3>
            <p style={{ fontSize: '0.9rem' }}>Setiap pesanan Anda mendukung ekonomi kreatif dan pelestarian budaya di desa adat Indonesia.</p>
          </div>
        </div>
      </section>

      <div ref={loginRef}>
        <AuthForm 
          mode={authMode} 
          onSubmit={submitAuth} 
          loading={authLoading} 
          switchMode={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} 
          message={authMessage} 
          error={authError} 
        />
      </div>
    </main>
  );
};

const RecommendationCard = ({ dest, isRecommendation }) => {
  const [weather, setWeather] = useState(null);
  const [imageSrc, setImageSrc] = useState(dest.image_url || null);
  const [imageFailed, setImageFailed] = useState(false);
  const [externalInfo, setExternalInfo] = useState(null);
  const [imageSource, setImageSource] = useState(dest.image_source || null);
  const [infoSource, setInfoSource] = useState(dest.external_info_source || null);
  const [triedRefresh, setTriedRefresh] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await axios.get(`${API_BASE}/weather?lat=${dest.latitude}&lon=${dest.longitude}`, { timeout: 2000 });
        setWeather(res.data);
      } catch {
        setWeather({ temp: 28, condition: 0, insight: 'Cuaca tropis diperkirakan cerah.' });
      }
    };
    fetchWeather();
  }, [dest.latitude, dest.longitude]);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await axios.get(`${API_BASE}/destination-info?name=${encodeURIComponent(dest.name)}`, { timeout: 7000 });
        if (res.data?.summary) {
          setExternalInfo(res.data);
          setInfoSource(res.data.source || null);
        } else setExternalInfo(null);
      } catch {
        setExternalInfo(null);
      }
    };
    fetchInfo();
  }, [dest.name]);

  const refreshImage = async () => {
    try {
      const res = await axios.get(`${API_BASE}/destination-image?name=${encodeURIComponent(dest.name)}`, { timeout: 5000 });
      if (res.data?.image_url) {
        setImageSrc(res.data.image_url);
        setImageSource(res.data.source);
        setImageFailed(false);
      } else {
        setImageFailed(true);
      }
    } catch {
      setImageFailed(true);
    }
  };

  useEffect(() => {
    if (!imageSrc && !triedRefresh) {
      setTriedRefresh(true);
      refreshImage();
    }
  }, [dest.name, imageSrc, triedRefresh]);

  const resolvedImageSrc = resolveMediaUrl(imageSrc);

  const getSourceLabel = (src) => {
    if (src === 'google_cse') return 'Google Custom Search';
    if (src === 'wikimedia') return 'Wikimedia';
    if (src === 'wikipedia' || src === 'wikipedia_id') return 'Wikipedia';
    return 'Data internal ArahLoka';
  };

  return (
    <div className="dest-card animate-fade-up">
      <div className="dest-img-container">
        {resolvedImageSrc && !imageFailed ? (
          <img src={resolvedImageSrc} alt={dest.name} className="dest-img" onError={() => { if (!triedRefresh) { setTriedRefresh(true); refreshImage(); } else { setImageFailed(true); } }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', padding: 20, textAlign: 'center', fontWeight: 700 }}>
            {dest.name}
          </div>
        )}
        <div className="dest-overlay">
          <div className="dest-badge-group">
            <span className="badge badge-region">{dest.region}</span>
            {isRecommendation && <span className="badge badge-match">{dest.match_percentage}% Cocok</span>}
          </div>
        </div>
      </div>
      <div className="dest-body">
        <h3>{dest.name}</h3>
        {isRecommendation && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-accent)', marginBottom: 12, fontSize: '0.85rem', fontWeight: 700 }}><Sparkles size={14} /><span>{dest.reason}</span></div>}
        <p className="dest-info-text">{externalInfo?.summary || dest.external_summary || dest.cultural_highlight}</p>
        <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 16 }}>
          {(imageSource || imageSrc) && <div>Sumber gambar: {getSourceLabel(imageSource)}</div>}
          {(infoSource || externalInfo) && <div>Sumber informasi: {getSourceLabel(infoSource)}</div>}
        </div>
        <div className="dest-meta">
          <div className="meta-item"><h4>Aktivitas</h4><p>{dest.recommended_activity}</p></div>
          <div className="meta-item"><h4>Tips</h4><p>{dest.local_etiquette}</p></div>
        </div>
        {weather && <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, background: '#F8FAFC', padding: 12, borderRadius: 12 }}>
          {weather.condition > 50 ? <CloudRain size={20} color="#0E5AF2" /> : <Sun size={20} color="#F5A623" />}
          <div style={{ fontSize: '0.8rem' }}><strong>{weather.temp}°C</strong> • {weather.insight}</div>
        </div>}
      </div>
    </div>
  );
};

const SuperadminDashboard = ({ token }) => {
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [u, p] = await Promise.all([axios.get(`${API_BASE}/admin/users`, { headers }), axios.get(`${API_BASE}/admin/users/pending`, { headers })]);
      setUsers(u.data); setPending(p.data); setError('');
    } catch (err) { setError(err.response?.data?.error || 'Gagal memuat data admin'); }
  };
  useEffect(() => { loadData(); }, [token]);
  const act = async (id, action) => { try { await axios.patch(`${API_BASE}/admin/users/${id}/${action}`, {}, { headers }); loadData(); } catch (e) { setError(e.response?.data?.error || 'Aksi gagal'); } };

  return (
    <main className="dashboard-main">
      <section className="hero-section dashboard-hero" style={{ background: 'linear-gradient(135deg, #1A1D23, #061C3D)', height: 'auto', minHeight: 'unset', padding: '100px 0 40px' }}>
        <div className="container hero-content-inner">
          <h1 className="animate-fade-up">Dashboard</h1>
          <p className="animate-fade-up" style={{ marginBottom: '0' }}>Kelola akses pengguna dan pantau pertumbuhan platform ArahLoka.</p>
        </div>
      </section>

      <div className="container">
        {error && <div className="record-card" style={{ padding: '20px', borderLeft: '5px solid var(--color-danger)', marginTop: 30 }}><p style={{ color: 'var(--color-danger)', fontWeight: 700 }}>{error}</p></div>}

        <section className="record-card animate-fade-up" style={{ marginTop: 40 }}>
          <div className="section-title-wrap" style={{ textAlign: 'left', marginBottom: 30 }}>
            <h2>Persetujuan Pengguna</h2>
            <p>Daftar akun baru yang memerlukan verifikasi akses.</p>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {pending.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>Tidak ada permintaan tertunda.</td></tr>}
                {pending.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td><span className="status-pill status-active">{mapRoleLabel(u.role)}</span></td>
                    <td><span className="status-pill status-pending">Menunggu</span></td>
                    <td style={{ display: 'flex', gap: 10 }}>
                      <button className="btn-primary btn-mini" onClick={() => act(u.id, 'approve')}>Setujui</button>
                      <button className="btn-primary btn-mini btn-danger" onClick={() => act(u.id, 'reject')}>Tolak</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="record-card animate-fade-up">
          <div className="section-title-wrap" style={{ textAlign: 'left', marginBottom: 30 }}>
            <h2>Semua Pengguna</h2>
            <p>Manajemen seluruh basis data pengguna ArahLoka.</p>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Dibuat</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>{mapRoleLabel(u.role)}</td>
                    <td><Badge value={u.status} /></td>
                    <td style={{ fontSize: '0.85rem', color: '#888' }}>{new Date(u.created_at).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

const ProducerDashboard = ({ token }) => {
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState('');
  const [createForm, setCreateForm] = useState({ title: '', location: '', description: '', category: '', duration: '', price: '', quota: 1, latitude: '', longitude: '' });
  const [createFile, setCreateFile] = useState(null);
  const [createItinerary, setCreateItinerary] = useState([
    { item_text: 'Datang sesuai jadwal reservasi' },
    { item_text: 'Menikmati suasana kuliner lokal' },
    { item_text: 'Mengenal budaya lokal dan interaksi sosial' },
    { item_text: 'Mendokumentasikan pengalaman perjalanan' }
  ]);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editFile, setEditFile] = useState(null);
  const [editItinerary, setEditItinerary] = useState([]);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');

  const loadData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/producer/offers`, { headers });
      setOffers(res.data); setError('');
    } catch (err) { setError(err.response?.data?.error || 'Gagal memuat penawaran'); }
  };
  useEffect(() => { loadData(); }, [token]);

  const createOffer = async (e) => {
    e.preventDefault();
    try {
      const body = new FormData();
      Object.entries(createForm).forEach(([k, v]) => body.append(k, v));
      if (createFile) body.append('image', createFile);
      const createRes = await axios.post(`${API_BASE}/offers`, body, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } });
      const items = createItinerary.map((x, i) => ({ item_text: x.item_text?.trim(), sort_order: i + 1 })).filter((x) => x.item_text);
      await axios.post(`${API_BASE}/offers/${createRes.data.id}/itinerary`, { items }, { headers });
      setCreateForm({ title: '', location: '', description: '', category: '', duration: '', price: '', quota: 1, latitude: '', longitude: '' });
      setCreateFile(null);
      setInfoMessage('Penawaran berhasil dibuat.');
      loadData();
    } catch (err) { setError(err.response?.data?.error || 'Gagal membuat penawaran'); }
  };

  const openEdit = async (offer) => {
    try {
      const itineraryRes = await axios.get(`${API_BASE}/offers/${offer.id}/itinerary`, { headers });
      setEditingOfferId(offer.id);
      setEditForm({
        title: offer.title || '',
        location: offer.location || '',
        description: offer.description || '',
        category: offer.category || '',
        duration: offer.duration || '',
        price: offer.price || '',
        quota: offer.quota || 1,
        latitude: offer.latitude || '',
        longitude: offer.longitude || '',
        status: offer.status || 'active'
      });
      setEditItinerary((itineraryRes.data.items || []).map((i) => ({ item_text: i.item_text })) || [{ item_text: '' }]);
      setCurrentImageUrl(offer.image_url || null);
      setEditFile(null);
      setInfoMessage('');
    } catch (err) { setError(err.response?.data?.error || 'Gagal membuka form edit'); }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingOfferId || !editForm) return;
    try {
      const body = new FormData();
      Object.entries(editForm).forEach(([k, v]) => body.append(k, v));
      if (editFile) body.append('image', editFile);
      await axios.patch(`${API_BASE}/offers/${editingOfferId}`, body, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } });
      const items = editItinerary.map((x, i) => ({ item_text: x.item_text?.trim(), sort_order: i + 1 })).filter((x) => x.item_text);
      await axios.post(`${API_BASE}/offers/${editingOfferId}/itinerary`, { items }, { headers });
      setEditingOfferId(null);
      setEditForm(null);
      setEditItinerary([]);
      setCurrentImageUrl(null);
      setEditFile(null);
      setInfoMessage('Penawaran berhasil diperbarui.');
      loadData();
    } catch (err) { setError(err.response?.data?.error || 'Gagal menyimpan perubahan'); }
  };

  return (
    <main className="dashboard-main">
      <section className="hero-section dashboard-hero" style={{ height: 'auto', minHeight: 'unset', padding: '120px 0 60px', backgroundImage: "url('https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070')" }}>
        <div className="hero-overlay" style={{ background: 'linear-gradient(135deg, rgba(10, 66, 193, 0.9), rgba(18, 179, 168, 0.7))' }}></div>
        <div className="container hero-content-inner">
          <h1 className="animate-fade-up">Dashboard</h1>
          <p className="animate-fade-up" style={{ marginBottom: '20px' }}>Kelola penawaran wisata budaya dan itinerary perjalanan Anda.</p>
        </div>
      </section>

      <div className="container">
        {infoMessage && <div className="record-card" style={{ padding: '20px', borderLeft: '5px solid var(--color-success)' }}><p style={{ color: 'var(--color-success)', fontWeight: 700 }}>{infoMessage}</p></div>}
        {error && <div className="record-card" style={{ padding: '20px', borderLeft: '5px solid var(--color-danger)' }}><p style={{ color: 'var(--color-danger)', fontWeight: 700 }}>{error}</p></div>}
        
        <section className="record-card animate-fade-up">
          <div className="section-title-wrap" style={{ textAlign: 'left', marginBottom: 30 }}>
            <h2>Buat Penawaran Baru</h2>
            <p>Lengkapi detail layanan budaya yang ingin Anda tawarkan.</p>
          </div>
          <form className="record-form" onSubmit={createOffer}>
            <div className="form-group"><label>Judul Penawaran</label><input placeholder="Contoh: Tur Budaya Keraton" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} required /></div>
            <div className="form-group"><label>Lokasi</label><input placeholder="Provinsi / Kota" value={createForm.location} onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })} required /></div>
            <div className="form-group form-full"><label>Deskripsi</label><textarea rows="4" placeholder="Ceritakan keunggulan penawaran Anda..." value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} required /></div>
            <div className="form-group"><label>Kategori</label><input placeholder="Sejarah / Kuliner / Adat" value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })} /></div>
            <div className="form-group"><label>Durasi</label><input placeholder="Contoh: 3 Jam / 1 Hari" value={createForm.duration} onChange={(e) => setCreateForm({ ...createForm, duration: e.target.value })} /></div>
            <div className="form-group"><label>Harga (Rp)</label><input type="number" min="0" value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })} /></div>
            <div className="form-group"><label>Kuota Peserta</label><input type="number" min="1" value={createForm.quota} onChange={(e) => setCreateForm({ ...createForm, quota: e.target.value })} /></div>
            <div className="form-group"><label>Latitude</label><input value={createForm.latitude} onChange={(e) => setCreateForm({ ...createForm, latitude: e.target.value })} /></div>
            <div className="form-group"><label>Longitude</label><input value={createForm.longitude} onChange={(e) => setCreateForm({ ...createForm, longitude: e.target.value })} /></div>
            <div className="form-group form-full"><label>Upload Media (Gambar)</label><input type="file" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => setCreateFile(e.target.files[0] || null)} /></div>
            
            <div className="form-group form-full">
              <label>Itinerary Perjalanan (Checklist Persiapan)</label>
              <div style={{ display: 'grid', gap: 12 }}>
                {createItinerary.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 10 }}>
                    <input style={{ flexGrow: 1 }} value={item.item_text} onChange={(e) => { const n = [...createItinerary]; n[idx].item_text = e.target.value; setCreateItinerary(n); }} />
                    <button type="button" className="btn-primary btn-mini btn-danger" onClick={() => setCreateItinerary(createItinerary.filter((_, i) => i !== idx))}>Hapus</button>
                  </div>
                ))}
                <button type="button" className="btn-secondary" style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)', width: 'fit-content' }} onClick={() => setCreateItinerary([...createItinerary, { item_text: '' }])}>+ Tambah Item Itinerary</button>
              </div>
            </div>
            
            <div className="form-full"><button className="btn-primary" style={{ width: '100%', padding: 18 }} type="submit">Terbitkan Penawaran</button></div>
          </form>
        </section>

        <section>
          <div className="section-title-wrap" style={{ textAlign: 'left' }}><h2>Penawaran Saya</h2></div>
          <div className="dest-grid">
            {offers.length === 0 && <p className="record-card" style={{ gridColumn: 'span 3', textAlign: 'center' }}>Anda belum memiliki penawaran.</p>}
            {offers.map((offer) => (
              <div key={offer.id} className="dest-card animate-fade-up">
                <div className="dest-img-container">
                  <OfferImage imageUrl={offer.image_url} title={offer.title} />
                  <div className="dest-badge-group">
                    <span className={`status-pill ${offer.status === 'active' ? 'status-active' : 'status-pending'}`}>{offer.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                    <span className="badge" style={{ background: 'var(--color-success)' }}>Rp {Number(offer.price).toLocaleString()}</span>
                  </div>
                </div>
                <div className="dest-body">
                  <h3>{offer.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#5A606E', marginBottom: 15 }}>{offer.location} • {offer.itinerary_count || 0} Itinerary</p>
                  <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 20 }}>{offer.rating_count > 0 ? `Rating: ${offer.average_rating} ★ (${offer.rating_count} ulasan)` : 'Belum ada ulasan'}</p>
                  <button className="btn-primary btn-mini" style={{ width: '100%' }} onClick={() => openEdit(offer)}>Edit Penawaran</button>
                  
                  {editingOfferId === offer.id && editForm && (
                    <div style={{ marginTop: 24, padding: 20, border: '1px solid #E2E8F0', borderRadius: 16, background: '#FDFBF8' }}>
                      <h4 style={{ marginBottom: 20, color: 'var(--color-primary)' }}>Edit: {offer.title}</h4>
                      <form className="record-form" onSubmit={saveEdit}>
                        <div className="form-group form-full"><label>Judul</label><input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required /></div>
                        <div className="form-group form-full"><label>Lokasi</label><input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} required /></div>
                        <div className="form-group form-full"><label>Deskripsi</label><textarea rows="3" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} required /></div>
                        <div className="form-group"><label>Harga</label><input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} /></div>
                        <div className="form-group"><label>Kuota</label><input type="number" value={editForm.quota} onChange={(e) => setEditForm({ ...editForm, quota: e.target.value })} /></div>
                        <div className="form-group"><label>Status</label>
                          <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                            <option value="active">Aktif</option>
                            <option value="hidden">Nonaktif</option>
                          </select>
                        </div>
                        <div className="form-group form-full"><label>Upload Media Baru</label><input type="file" onChange={(e) => setEditFile(e.target.files[0] || null)} /></div>
                        
                        <div className="form-group form-full">
                          <label>Itinerary</label>
                          {editItinerary.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                              <input style={{ flexGrow: 1 }} value={item.item_text} onChange={(e) => { const n = [...editItinerary]; n[idx].item_text = e.target.value; setEditItinerary(n); }} />
                              <button type="button" className="btn-primary btn-mini btn-danger" onClick={() => setEditItinerary(editItinerary.filter((_, i) => i !== idx))}>Hapus</button>
                            </div>
                          ))}
                          <button type="button" className="btn-secondary btn-mini" style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }} onClick={() => setEditItinerary([...editItinerary, { item_text: '' }])}>+ Item</button>
                        </div>
                        
                        <div className="form-full" style={{ display: 'flex', gap: 10 }}>
                          <button className="btn-primary btn-mini" type="submit">Simpan</button>
                          <button className="btn-secondary btn-mini" style={{ color: '#5A606E', borderColor: '#CBD5E0' }} type="button" onClick={() => setEditingOfferId(null)}>Batal</button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

const ConsumerDashboard = ({ token }) => {
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const [preferences, setPreferences] = useState({ mood: 'healing', duration: 'one day', interest: 'nature', style: 'relaxed' });
  const [recommendations, setRecommendations] = useState([]);
  const [allDestinations, setAllDestinations] = useState(FALLBACK_DESTINATIONS);
  const [savedTrips, setSavedTrips] = useState([]);
  const [offers, setOffers] = useState([]);

  // FIX: load public offers independently so tourist page still shows active offers
  // even if bookings/saved-trips request fails.
  useEffect(() => {
    let alive = true;

    const loadPublicOffers = async () => {
      try {
        const res = await axios.get(`${API_BASE}/offers`);
        if (!alive) return;
        const data = Array.isArray(res.data) ? res.data : [];
        setOffers(data.filter((offer) => !offer.status || offer.status === 'active'));
      } catch (e) {
        console.error('Gagal mengambil penawaran wisata:', e);
      }
    };

    loadPublicOffers();

    return () => {
      alive = false;
    };
  }, []);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [bookingForm, setBookingForm] = useState({ booking_date: '', number_of_people: 1, notes: '' });
  const [saveForm, setSaveForm] = useState({ visitor_name: '', destination_name: '', travel_mood: 'healing', rating: 5, travel_note: '' });
  const [checklistData, setChecklistData] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [error, setError] = useState('');
  const [tried, setTried] = useState(false);

  const recommendationsRef = React.useRef(null);

  const loadData = async () => {
    try {
      const [d, t, o, b] = await Promise.allSettled([
        axios.get(`${API_BASE}/destinations`),
        axios.get(`${API_BASE}/saved-trips`),
        axios.get(`${API_BASE}/offers`),
        axios.get(`${API_BASE}/my-bookings`, { headers })
      ]);

      if (d.status === 'fulfilled') setAllDestinations(d.value.data);
      if (t.status === 'fulfilled') setSavedTrips(t.value.data);

      if (o.status === 'fulfilled') {
        const offerData = Array.isArray(o.value.data) ? o.value.data : [];
        setOffers(offerData.filter((offer) => !offer.status || offer.status === 'active'));
      }

      if (b.status === 'fulfilled') {
        const bookingData = Array.isArray(b.value.data) ? b.value.data : [];
        setMyBookings(bookingData);
      }

      setError('');
    } catch (err) {
      setAllDestinations(FALLBACK_DESTINATIONS);
      setError(err.response?.data?.error || 'Sebagian data tidak dapat dimuat.');
    }
  };
  useEffect(() => { loadData(); }, [token]);

  const getRecommendations = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTried(true);
    try {
      const res = await axios.post(`${API_BASE}/recommendations`, preferences);
      setRecommendations(res.data);
      setTimeout(() => {
        recommendationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch {
      setRecommendations([]);
    } finally { setLoading(false); }
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!selectedOffer) return;
    try {
      const res = await axios.post(`${API_BASE}/bookings`, { ...bookingForm, offer_id: selectedOffer.id }, { headers });
      const newBookingId = res.data.id;
      setInfoMessage('Booking berhasil dikonfirmasi. Checklist persiapan Anda sudah siap.');
      const refreshedBookings = await axios.get(`${API_BASE}/my-bookings`, { headers });
      setMyBookings(Array.isArray(refreshedBookings.data) ? refreshedBookings.data : []);
      setSelectedOffer(null);
      setBookingForm({ booking_date: '', number_of_people: 1, notes: '' });
      loadData();
      
      const c = await axios.get(`${API_BASE}/bookings/${newBookingId}/checklist`, { headers });
      setChecklistData(c.data);
      setTimeout(() => document.getElementById('checklist-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } catch (err) { setError(err.response?.data?.error || 'Booking gagal'); }
  };

  const toggleChecklist = async (item) => {
    if (!checklistData) return;
    await axios.patch(`${API_BASE}/bookings/${checklistData.booking_id}/checklist/${item.id}`, { is_checked: !item.is_checked }, { headers });
    const next = await axios.get(`${API_BASE}/bookings/${checklistData.booking_id}/checklist`, { headers });
    setChecklistData(next.data);
  };

  const updateBookingStatus = async (id, payload) => {
    try {
      await axios.patch(`${API_BASE}/bookings/${id}`, payload, { headers });
      setInfoMessage(`Booking berhasil diperbarui.`);
      setEditingBooking(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memperbarui booking');
    }
  };

  const activeBookings = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return myBookings.filter(b => (b.status === 'accepted' || b.status === 'confirmed') && b.booking_date >= today);
  }, [myBookings]);

  const bookingOptions = useMemo(() => {
    return myBookings.filter(b => (b.status === 'accepted' || b.status === 'confirmed') || b.status === 'completed');
  }, [myBookings]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBooking = bookingOptions.find(b => b.booking_date === today);
    if (todayBooking && !saveForm.destination_name) {
      setSaveForm(prev => ({ ...prev, destination_name: todayBooking.title }));
    }
  }, [bookingOptions, saveForm.destination_name]);

  return (
    <main className="dashboard-main">
      <section className="hero-section dashboard-hero" style={{ height: 'auto', minHeight: 'unset', padding: '120px 0 60px', backgroundImage: "url('https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=2070')" }}>
        <div className="hero-overlay"></div>
        <div className="container hero-content-inner">
          <h1 className="animate-fade-up">Dashboard</h1>
          <p className="animate-fade-up" style={{ marginBottom: '20px' }}>Temukan penawaran terbaik dan siapkan perjalanan budaya Anda.</p>
        </div>
      </section>

      <div className="container">
        <PlannerCard preferences={preferences} setPreferences={setPreferences} onSearch={getRecommendations} loading={loading} />
      </div>

      <div className="container">
        {error && <div className="record-card" style={{ padding: '20px', borderLeft: '5px solid var(--color-danger)', marginTop: 20 }}><p style={{ color: 'var(--color-danger)', fontWeight: 700 }}>{error}</p></div>}
      </div>

      {recommendations.length > 0 && (
        <section className="container results-section" ref={recommendationsRef}>
          <div className="section-title-wrap"><h2>Hasil Rekomendasi Untukmu</h2></div>
          <div className="dest-grid">{recommendations.map((d) => <RecommendationCard key={d.id} dest={d} isRecommendation />)}</div>
        </section>
      )}

      <section className="container" id="destinasi-section">
        <div className="section-title-wrap"><h2>Destinasi Budaya Unggulan</h2></div>
        <div className="dest-grid">{allDestinations.map((d) => <RecommendationCard key={d.id} dest={d} isRecommendation={false} />)}</div>
      </section>

      <section className="container" id="penawaran">
        <div className="section-title-wrap">
          <h2>Penawaran Wisata Budaya</h2>
          <p>Penawaran eksklusif dari penyedia jasa travel lokal.</p>
        </div>
        <div className="dest-grid">
          {offers.length === 0 && <p className="record-card" style={{ gridColumn: 'span 3', textAlign: 'center' }}>Belum ada penawaran tersedia.</p>}
          {offers.map((o) => (
            <div key={o.id} className="dest-card animate-fade-up">
              <div className="dest-img-container">
                <OfferImage imageUrl={o.image_url} title={o.title} />
                <div className="dest-badge-group">
                  <span className="badge badge-region">{o.location}</span>
                  <span className="badge" style={{ background: 'var(--color-success)' }}>Rp {Number(o.price).toLocaleString()}</span>
                </div>
              </div>
              <div className="dest-body">
                <h3>{o.title}</h3>
                <p className="dest-info-text">{o.description}</p>
                <div className="dest-meta">
                  <div className="meta-item"><h4>Durasi</h4><p>{o.duration || '-'}</p></div>
                  <div className="meta-item"><h4>Kuota</h4><p>{o.quota} Orang</p></div>
                </div>
                <div style={{ marginTop: 20 }}>
                  <button className="btn-primary" style={{ width: '100%' }} onClick={() => { setSelectedOffer(o); setInfoMessage(''); setTimeout(() => document.getElementById('booking-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }}>Booking Pengalaman Ini</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedOffer && (
        <section className="container" id="booking-form-section">
          {infoMessage && <div className="record-card" style={{ padding: '20px', borderLeft: '5px solid var(--color-success)', marginBottom: 20 }}><p style={{ color: 'var(--color-success)', fontWeight: 700 }}>{infoMessage}</p></div>}
          <div className="record-card animate-fade-up">
            <div className="section-title-wrap" style={{ textAlign: 'left', marginBottom: 30 }}>
              <h2>Booking: {selectedOffer.title}</h2>
              <p>Silakan isi detail pemesanan Anda.</p>
            </div>
            <form className="record-form" onSubmit={submitBooking}>
              <div className="form-group"><label>Tanggal Booking</label><input type="date" value={bookingForm.booking_date} onChange={(e) => setBookingForm({ ...bookingForm, booking_date: e.target.value })} required /></div>
              <div className="form-group"><label>Jumlah Peserta</label><input type="number" min="1" max={selectedOffer.quota} value={bookingForm.number_of_people} onChange={(e) => setBookingForm({ ...bookingForm, number_of_people: e.target.value })} required /></div>
              <div className="form-group form-full"><label>Catatan Tambahan</label><textarea rows="3" placeholder="Sebutkan kebutuhan khusus jika ada..." value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })} /></div>
              <div className="form-full" style={{ display: 'flex', gap: 16 }}>
                <button className="btn-primary" type="submit">Konfirmasi Booking</button>
                <button className="btn-secondary" style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }} type="button" onClick={() => setSelectedOffer(null)}>Batal</button>
              </div>
            </form>
          </div>
        </section>
      )}

      {checklistData && (
        <section className="container" id="checklist-section">
          {infoMessage && <div className="record-card" style={{ padding: '20px', borderLeft: '5px solid var(--color-success)', marginBottom: 20 }}><p style={{ color: 'var(--color-success)', fontWeight: 700 }}>{infoMessage}</p></div>}
          <div className="record-card animate-fade-up">
            <div className="section-title-wrap" style={{ textAlign: 'left', marginBottom: 30 }}>
              <h2>Checklist Kesiapan Trip</h2>
              <p style={{ fontSize: '1.2rem', color: 'var(--color-primary)', fontWeight: 700 }}>{checklistData.offer_title}</p>
            </div>
            <div style={{ marginBottom: 30 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 600 }}>Kesiapan: {checklistData.summary.readiness_percentage}%</span>
                <span className="status-pill status-active">{checklistData.summary.readiness_label}</span>
              </div>
              <div style={{ width: '100%', height: 10, background: '#EDF2F7', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${checklistData.summary.readiness_percentage}%`, height: '100%', background: 'var(--color-success)', transition: 'width 0.5s ease' }}></div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12, marginBottom: 30 }}>
              {checklistData.items.map((it) => (
                <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 15, padding: 16, background: '#F8FAFC', borderRadius: 12, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 20, height: 20 }} checked={Boolean(it.is_checked)} onChange={() => toggleChecklist(it)} />
                  <span style={{ fontSize: '1rem', fontWeight: 500 }}>{it.item_text}</span>
                </label>
              ))}
            </div>
            <div style={{ background: 'rgba(14, 90, 242, 0.05)', padding: 20, borderRadius: 16 }}>
              <p style={{ marginBottom: 8 }}><strong>Sudah siap:</strong> {checklistData.summary.ready_items.join(', ') || '-'}</p>
              <p><strong>Masih perlu disiapkan:</strong> {checklistData.summary.missing_items_list.join(', ') || '-'}</p>
            </div>
            <div style={{ marginTop: 20 }}><button className="btn-secondary btn-mini" style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }} onClick={() => setChecklistData(null)}>Tutup Checklist</button></div>
          </div>
        </section>
      )}

      <section className="container" id="booking-saya">
        <div className="section-title-wrap"><h2>Booking Saya</h2></div>
        <div className="dest-grid">
          {activeBookings.length === 0 && <p className="record-card" style={{ gridColumn: 'span 3', textAlign: 'center' }}>Anda tidak memiliki pesanan aktif saat ini.</p>}
          {activeBookings.map((b) => (
            <div key={b.id} className="dest-card animate-fade-up">
              <div className="dest-img-container" style={{ height: 180 }}>
                <OfferImage imageUrl={b.image_url} title={b.title} />
              </div>
              <div className="dest-body">
                <h3 style={{ fontSize: '1.1rem' }}>{b.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#5A606E', marginBottom: 15 }}>{b.booking_date} • {b.number_of_people} Orang</p>
                <div style={{ marginBottom: 15 }}><span style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 800 }}>Status: {statusLabel[b.status] || b.status}</span></div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-primary btn-mini" style={{ flex: 1 }} onClick={() => { setEditingBooking(b); setInfoMessage(''); setTimeout(() => document.getElementById('edit-booking-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }}>Edit Booking</button>
                  <button className="btn-secondary btn-mini" style={{ flex: 1, color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }} onClick={async () => {
                    const res = await axios.get(`${API_BASE}/bookings/${b.id}/checklist`, { headers });
                    setChecklistData(res.data);
                    setTimeout(() => document.getElementById('checklist-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                  }}>Checklist</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {editingBooking && (
          <div className="record-card animate-fade-up" id="edit-booking-form-section" style={{ marginTop: 20, border: '3px solid var(--color-primary)', background: '#F8FAFC', padding: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Edit Booking: {editingBooking.title}</h3>
              <button className="btn-secondary btn-mini" style={{ color: '#555', borderColor: '#888' }} onClick={() => setEditingBooking(null)}>Tutup</button>
            </div>
            <div className="record-form">
              <div className="form-group form-full"><label>Ubah Tanggal</label><input type="date" value={editingBooking.booking_date} onChange={(e) => setEditingBooking({ ...editingBooking, booking_date: e.target.value })} /></div>
              <div className="form-full" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn-primary btn-mini" onClick={() => updateBookingStatus(editingBooking.id, { booking_date: editingBooking.booking_date })}>Simpan Tanggal</button>
                <button className="btn-primary btn-mini btn-success" onClick={() => updateBookingStatus(editingBooking.id, { status: 'completed' })}>Selesaikan Booking</button>
                <button className="btn-primary btn-mini btn-danger" onClick={() => updateBookingStatus(editingBooking.id, { status: 'cancelled' })}>Batalkan Pesanan</button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="container">
        <div className="record-card">
          <div className="section-title-wrap" style={{ textAlign: 'left' }}>
            <h2>Catat Perjalananmu</h2>
            <p>Bagikan pengalaman budayamu kepada komunitas.</p>
          </div>
          {bookingOptions.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#5A606E' }}>Belum ada booking yang dapat diulas.</p>
          ) : (
            <form className="record-form" onSubmit={async (e) => { e.preventDefault(); await axios.post(`${API_BASE}/saved-trips`, saveForm, { headers }); setSaveForm({ visitor_name: '', destination_name: '', travel_mood: 'healing', rating: 5, travel_note: '' }); loadData(); }}>
              <div className="form-group"><label>Nama Pengunjung</label><input value={saveForm.visitor_name} onChange={(e) => setSaveForm({ ...saveForm, visitor_name: e.target.value })} required /></div>
              <div className="form-group">
                <label>Nama Destinasi / Penawaran</label>
                <select value={saveForm.destination_name} onChange={(e) => setSaveForm({ ...saveForm, destination_name: e.target.value })} required>
                  <option value="">-- Pilih dari Booking Anda --</option>
                  {bookingOptions.map((b) => (
                    <option key={b.id} value={b.title}>{b.title} ({b.booking_date})</option>
                  ))}
                </select>
              </div>
              <div className="form-group"><label>Rating (1-5)</label><select value={saveForm.rating} onChange={(e) => setSaveForm({ ...saveForm, rating: parseInt(e.target.value, 10) })}><option value="5">⭐⭐⭐⭐⭐ (Sangat Puas)</option><option value="4">⭐⭐⭐⭐ (Puas)</option><option value="3">⭐⭐⭐ (Cukup)</option><option value="2">⭐⭐ (Kurang Puas)</option><option value="1">⭐ (Tidak Puas)</option></select></div>
              <div className="form-group"><label>Suasana</label>
                <select value={saveForm.travel_mood} onChange={(e) => setSaveForm({ ...saveForm, travel_mood: e.target.value })}>
                  <option value="healing">🌿 Ketenangan</option>
                  <option value="cultural">Budaya</option>
                  <option value="adventure">Petualangan</option>
                  <option value="culinary">Kuliner</option>
                  <option value="educational">Edukasi</option>
                </select>
              </div>
              <div className="form-group form-full"><label>Catatan Budaya</label><textarea rows="4" placeholder="Apa yang paling berkesan dari perjalananmu?" value={saveForm.travel_note} onChange={(e) => setSaveForm({ ...saveForm, travel_note: e.target.value })} /></div>
              <div className="form-full"><button type="submit" className="btn-primary" style={{ width: '100%' }}><Send size={18} /> Simpan Catatan</button></div>
            </form>
          )}
        </div>
      </section>

      <section className="container">
        <div className="section-title-wrap"><h2>Catatan Perjalanan Komunitas</h2></div>
        <div className="dest-grid">
          {savedTrips.length === 0 && <p className="record-card" style={{ gridColumn: 'span 3', textAlign: 'center' }}>Belum ada cerita perjalanan.</p>}
          {savedTrips.map((t) => (
            <div key={t.id} className="record-card" style={{ padding: 24, marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: '1.2rem' }}>{t.destination_name}</h3>
                <span className="badge badge-region">{t.travel_mood}</span>
              </div>
              <p style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9rem', marginBottom: 8 }}>Oleh: {t.visitor_name}</p>
              <div style={{ color: '#FFD700', marginBottom: 12 }}>{'⭐'.repeat(t.rating)}</div>
              <p className="dest-info-text" style={{ fontStyle: 'italic' }}>"{t.travel_note}"</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

const App = () => {
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');
  const [token, setToken] = useState(localStorage.getItem('arahloka_token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('arahloka_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [scrolled, setScrolled] = useState(false);

  const loginRef = React.useRef(null);
  const heroRef = React.useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const saveAuth = (nextToken, nextUser) => {
    setToken(nextToken); setUser(nextUser);
    localStorage.setItem('arahloka_token', nextToken);
    localStorage.setItem('arahloka_user', JSON.stringify(nextUser));
  };
  const logout = () => {
    setToken(''); setUser(null);
    localStorage.removeItem('arahloka_token');
    localStorage.removeItem('arahloka_user');
    setAuthMode('login');
    setTimeout(() => {
      loginRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  useEffect(() => {
    const me = async () => {
      if (!token) return;
      try { const res = await axios.get(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }); setUser(res.data.user); }
      catch { logout(); }
    };
    me();
  }, [token]);

  const submitAuth = async (form) => {
    setAuthLoading(true); setAuthError(''); setAuthMessage(''); setPendingMessage('');
    try {
      if (authMode === 'register') {
        const res = await axios.post(`${API_BASE}/auth/register`, form);
        setAuthMessage(res.data.message || 'Registrasi berhasil. Akun Anda menunggu persetujuan superadmin.');
        setAuthMode('login');
        setTimeout(() => loginRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
      } else {
        const res = await axios.post(`${API_BASE}/auth/login`, { email: form.email, password: form.password });
        saveAuth(res.data.token, res.data.user);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal autentikasi';
      if (msg.includes('pending')) setPendingMessage('Akun Anda masih menunggu persetujuan superadmin.');
      else if (msg.includes('rejected')) setPendingMessage('Akun Anda ditolak. Silakan hubungi pengelola platform.');
      else setAuthError(msg);
    } finally { setAuthLoading(false); }
  };

  const roleStatusText = user ? `${mapRoleLabel(user.role)}` : 'Tamu';

  return (
    <div className="app-wrapper">
      <header className={scrolled ? 'scrolled' : ''}>
        <div className="container nav-content">
          <a href="/" className="logo"><Compass size={32} /> Arah Loka</a>
          <nav className="nav-menu">
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <span className={scrolled ? 'status-badge online' : 'status-badge offline'}>{roleStatusText}</span>
                <button className="btn-primary btn-mini" onClick={logout}>Keluar</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-secondary btn-mini" style={{ color: scrolled ? 'var(--color-primary)' : 'var(--color-white)', borderColor: scrolled ? 'var(--color-primary)' : 'var(--color-white)' }} onClick={() => { setAuthMode('login'); setTimeout(() => loginRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }}>Masuk</button>
                <button className="btn-primary btn-mini" onClick={() => { setAuthMode('register'); setTimeout(() => loginRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }}>Daftar</button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {!user ? (
        <GuestPage 
          submitAuth={submitAuth} 
          authMode={authMode} 
          setAuthMode={setAuthMode} 
          authLoading={authLoading} 
          authMessage={authMessage} 
          authError={authError} 
          pendingMessage={pendingMessage}
          loginRef={loginRef}
        />
      ) : user.role === 'superadmin' ? <SuperadminDashboard token={token} /> : user.role === 'producer' ? <ProducerDashboard token={token} /> : <ConsumerDashboard token={token} />}

      <footer>
        <div className="container footer-inner">
          <div className="logo footer-logo" style={{ color: 'white' }}><Compass size={40} /> Arah Loka</div>
          <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>Jelajahi Budaya Indonesia</h2>
          <p style={{ opacity: 0.8, maxWidth: 600 }}>Platform Tourism & Culture Exchange untuk mempermudah turis dalam mengeksplorasi kekayaan budaya nusantara dengan persiapan yang matang.</p>
          <div className="footer-copy">© 2026 ArahLoka Platform • Interaksi Platform Modern</div>
        </div>
      </footer>
    </div>
  );
};

export default App;
