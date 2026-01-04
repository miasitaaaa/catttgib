const express = require('express');
const cors = require('cors');
const { Octokit } = require('@octokit/rest');
const multer = require('multer');
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Configuración
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'tu_token_aqui';
const REPO_OWNER = 'miasitasas';
const REPO_NAME = 'mis-imagenes-catgithub';

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// 1. Obtener archivos del repositorio
app.get('/api/files', async (req, res) => {
    try {
        const { data } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: req.query.path || ''
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Subir archivo
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const { album, filename } = req.body;
        
        const path = album ? `${album}/${filename || file.originalname}` : file.originalname;
        const content = file.buffer.toString('base64');
        
        const { data } = await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: path,
            message: `Upload ${file.originalname}`,
            content: content,
            branch: 'main'
        });
        
        res.json({ 
            success: true, 
            url: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${path}`,
            data: data 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Crear álbum (carpeta)
app.post('/api/album', async (req, res) => {
    try {
        const { name } = req.body;
        
        // Crear carpeta vacía con un .gitkeep
        const { data } = await octokit.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: `${name}/.gitkeep`,
            message: `Create album: ${name}`,
            content: Buffer.from('').toString('base64'),
            branch: 'main'
        });
        
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Obtener álbumes
app.get('/api/albums', async (req, res) => {
    try {
        const { data } = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: ''
        });
        
        const albums = data.filter(item => item.type === 'dir').map(dir => ({
            name: dir.name,
            url: dir.url,
            files: []
        }));
        
        res.json(albums);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
