// api/add-token.js
export default async function handler(req, res) {
  // Hanya menerima POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { action, password, token } = req.body;

  // === KONFIGURASI ===
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;        // Personal Access Token (repo write)
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'xxxgelow999'; // default jika tidak di env
  const REPO_OWNER = 'hamxyztmvn';
  const REPO_NAME = 'Database';
  const FILE_PATH = 'orang-kaya.json';
  const BRANCH = 'main'; // atau 'refs/heads/main'
  // ===================

  // Verifikasi password (untuk semua action)
  if (action === 'verify') {
    if (password === ADMIN_PASSWORD) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(401).json({ success: false, error: 'Wrong password' });
    }
  }

  if (action === 'add') {
    // Validasi password lagi
    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, error: 'Unauthorized: invalid password' });
    }
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Token tidak valid' });
    }

    if (!GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN environment variable missing');
      return res.status(500).json({ success: false, error: 'Server config error: missing GitHub token' });
    }

    try {
      // 1. Ambil file tokens.json dari GitHub
      const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
      const getRes = await fetch(getUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'SilentDeath-TokenManager'
        }
      });

      let currentTokens = [];
      let sha = null;
      if (getRes.status === 200) {
        const data = await getRes.json();
        sha = data.sha;
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const json = JSON.parse(content);
        currentTokens = json.tokens || [];
      } else if (getRes.status === 404) {
        // file belum ada, akan dibuat baru
        sha = null;
      } else {
        const errText = await getRes.text();
        throw new Error(`GitHub GET error ${getRes.status}: ${errText}`);
      }

      // 2. Cek duplikasi
      if (currentTokens.includes(token)) {
        return res.status(400).json({ success: false, error: 'Token sudah terdaftar di database' });
      }

      // 3. Tambahkan token baru
      currentTokens.push(token);
      const newContent = JSON.stringify({ tokens: currentTokens }, null, 2);

      // 4. PUT ke GitHub
      const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
      const putBody = {
        message: `Add new token via Silent Death Web (${new Date().toISOString()})`,
        content: Buffer.from(newContent).toString('base64'),
        branch: BRANCH
      };
      if (sha) putBody.sha = sha;

      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'SilentDeath-TokenManager',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(putBody)
      });

      if (putRes.status === 200 || putRes.status === 201) {
        return res.status(200).json({ success: true, message: 'Token berhasil disimpan ke GitHub' });
      } else {
        const errorData = await putRes.json();
        throw new Error(`GitHub PUT error: ${JSON.stringify(errorData)}`);
      }
    } catch (err) {
      console.error('Add token error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(400).json({ success: false, error: 'Aksi tidak dikenal' });
  }
