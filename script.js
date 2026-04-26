const ALLDL = (u) => `https://api-library-kohi.onrender.com/api/alldl?url=${encodeURIComponent(u)}`;
const SMFAHIM = (u) => `https://www.smfahim.xyz/download/instagram/v1?url=${encodeURIComponent(u)}`;

const urlInput = document.getElementById('urlInput');
const btn = document.getElementById('downloadBtn');
const status = document.getElementById('status');
const resultBox = document.getElementById('result');

function setStatus(msg, type) { status.className = 'status' + (type ? ' ' + type : ''); status.textContent = msg || ''; }
function setLoading(on) {
  btn.disabled = on;
  btn.innerHTML = on ? '<span class="spinner"></span>Processing…' : 'Download';
}
function clear() { resultBox.innerHTML = ''; setStatus(''); }

function pickMedia(data) {
  const items = [];
  const seen = new Set();
  const push = (m) => {
    if (!m || !m.url) return;
    if (seen.has(m.url)) return;
    seen.add(m.url); items.push(m);
  };
  const isVid = (u) => /\.mp4($|\?)/i.test(u) || /video/i.test(u);
  const tryCand = (cand, thumb) => {
    if (!cand) return;
    if (typeof cand === 'string') push({ url: cand, type: isVid(cand) ? 'video' : 'image', thumbnail: thumb });
    else if (Array.isArray(cand)) cand.forEach(c => tryCand(c, thumb));
    else if (typeof cand === 'object') {
      const u = cand.url || cand.download_url || cand.downloadUrl || cand.video || cand.videoUrl || cand.image || cand.media || cand.src;
      const th = cand.thumbnail || cand.thumb || cand.cover || thumb;
      if (u) push({ url: u, type: cand.type === 'image' ? 'image' : (cand.type === 'video' ? 'video' : (isVid(u) ? 'video' : 'image')), thumbnail: th });
    }
  };
  tryCand(data?.media);
  tryCand(data?.medias);
  tryCand(data?.data, data?.thumbnail);
  tryCand(data?.results);
  tryCand(data?.urls);
  tryCand(data?.videos);
  tryCand(data?.images);
  if (!items.length) {
    const u = data?.videoUrl || data?.url || data?.download_url || data?.downloadUrl;
    if (u) push({ url: u, type: isVid(u) ? 'video' : 'image', thumbnail: data?.thumbnail });
  }
  return items;
}

async function fetchMedia(url) {
  const [a, s] = await Promise.allSettled([
    fetch(ALLDL(url)).then(r => r.json()).catch(() => null),
    fetch(SMFAHIM(url), { headers: { Accept: 'application/json' } }).then(r => r.json()).catch(() => null),
  ]);
  const all = a.value;
  const sm = s.value;
  let items = sm ? pickMedia(sm) : [];
  if (!items.length && all?.status && all?.data?.videoUrl) {
    items = [{ url: all.data.videoUrl, type: 'video' }];
  } else if (all?.status && all?.data?.videoUrl && items.length === 1) {
    items[0].url = all.data.videoUrl;
  }
  if (!items.length) throw new Error('No media found');
  const title = sm?.title || sm?.caption || sm?.author?.username || (typeof sm?.author === 'string' ? sm.author : '') || '';
  const thumb = sm?.thumbnail || items[0]?.thumbnail;
  const platform = all?.data?.platform || 'Instagram';
  return { items, title, thumb, platform };
}

async function run() {
  const url = urlInput.value.trim();
  clear();
  if (!url) return setStatus('⚠️ Please enter an Instagram URL.', 'error');
  if (!/instagram\.com/i.test(url)) return setStatus('⚠️ Invalid Instagram URL.', 'error');

  setLoading(true); setStatus('⏳ Fetching content…');
  try {
    const { items, title, thumb, platform } = await fetchMedia(url);

    let html = '<div class="result">';
    if (platform) html += `<span class="platform-badge">📷 ${escape(platform)}</span>`;

    if (items.length === 1) {
      const m = items[0];
      if (m.type === 'video') {
        html += `<video class="preview" src="${m.url}" ${thumb ? `poster="${thumb}"` : ''} controls preload="metadata" playsinline></video>`;
      } else if (thumb) {
        html += `<img src="${thumb}" class="thumb" alt="" onerror="this.remove()">`;
      }
    }
    if (title) html += `<div class="meta">${escape(title)}</div>`;

    if (items.length > 1) {
      html += `<div class="grid-media multi">`;
      items.forEach((m, i) => {
        const t = m.thumbnail || (m.type === 'image' ? m.url : '');
        html += `<div class="media-item">${m.type === 'video'
          ? `<video src="${m.url}" poster="${t || ''}" controls preload="metadata" playsinline></video>`
          : `<img src="${m.url}" alt="" onerror="this.style.display='none'">`}
          <a class="dlmini" href="${m.url}" download target="_blank" rel="noopener">Download ${i + 1}</a></div>`;
      });
      html += `</div>`;
    } else {
      html += `<a class="dl" href="${items[0].url}" download target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        Download HD ${items[0].type === 'video' ? 'Video' : 'Photo'}
      </a>`;
    }

    html += '</div>';
    resultBox.innerHTML = html;
    setStatus('');
  } catch (e) {
    console.error(e);
    setStatus('❌ Failed to fetch content. The link may be private or the service is busy.', 'error');
  } finally { setLoading(false); }
}

function escape(s) { const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }

btn.addEventListener('click', run);
urlInput.addEventListener('keypress', e => { if (e.key === 'Enter') run(); });
