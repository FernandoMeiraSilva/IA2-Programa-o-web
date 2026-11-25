const express = require('express');
const cors = require('cors');
const { DataTypes } = require('sequelize');
const conn = require('./db/conn.js');
const produtoRoutes = require('./router/ProdutoRoutes.js');
const carrinhoRoutes = require('./router/CarrinhoRoutes.js');
const vendaRoutes = require('./router/VendaRoutes.js');
const { UPLOAD_DIR } = require('./middleware/upload.js');

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/produto', produtoRoutes);
app.use('/carrinho', carrinhoRoutes);
app.use('/venda', vendaRoutes);

// Rota inexistente
app.use((req, res) => {
    res.status(404).json({ message: 'Rota não encontrada' });
});

// JSON inválido no body e qualquer erro não tratado (sem expor detalhes internos)
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'JSON inválido no corpo da requisição' });
    }
    console.error(err);
    res.status(500).json({ message: 'Erro interno do servidor' });
});

async function start() {
    try {
        await conn.authenticate();
        console.log('Conexão com o banco realizada com sucesso');
        await conn.sync();
        // Tabela Produtos criada antes do upload de imagens: adiciona a coluna se faltar
        const colunas = await conn.getQueryInterface().describeTable('Produtos');
        if (!colunas.imagem) {
            await conn.getQueryInterface().addColumn('Produtos', 'imagem', { type: DataTypes.STRING, allowNull: true });
        }
        app.listen(port, () => console.log(`API rodando na porta ${port}`));
    } catch (err) {
        console.error('Erro ao conectar/sincronizar com o banco:', err.message);
        process.exit(1);
    }
}

start();
