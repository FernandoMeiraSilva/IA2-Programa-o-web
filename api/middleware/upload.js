const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXTENSOES = { 'image/jpeg': '.jpg', 'image/png': '.png' };
const MAX_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + EXTENSOES[file.mimetype])
});

function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXTENSOES[file.mimetype] || !['.jpg', '.jpeg', '.png'].includes(ext)) {
        return cb(new Error('FORMATO_INVALIDO'));
    }
    cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_BYTES, files: 1 } }).single('imagem');

// Confere os primeiros bytes do arquivo (o mimetype enviado pelo cliente pode ser forjado)
function assinaturaValida(file) {
    const fd = fs.openSync(file.path, 'r');
    const buf = Buffer.alloc(8);
    fs.readSync(fd, buf, 0, 8, 0);
    fs.closeSync(fd);
    if (file.mimetype === 'image/png') {
        return buf.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

function removerArquivo(nomeArquivo) {
    if (!nomeArquivo) return;
    fs.unlink(path.join(UPLOAD_DIR, path.basename(nomeArquivo)), () => {});
}

// Middleware: processa o upload e responde 422 em caso de arquivo inválido
function uploadImagem(req, res, next) {
    upload(req, res, (err) => {
        if (err) {
            if (err.message === 'FORMATO_INVALIDO') {
                return res.status(422).json({ message: 'A imagem deve ser .jpeg ou .png' });
            }
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(422).json({ message: 'A imagem deve ter no máximo 5MB' });
            }
            if (err instanceof multer.MulterError) {
                return res.status(422).json({ message: 'Upload inválido' });
            }
            return next(err);
        }
        if (req.file && !assinaturaValida(req.file)) {
            removerArquivo(req.file.filename);
            return res.status(422).json({ message: 'A imagem deve ser .jpeg ou .png' });
        }
        next();
    });
}

module.exports = { uploadImagem, removerArquivo, UPLOAD_DIR };
