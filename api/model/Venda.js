const { DataTypes } = require('sequelize');
const db = require('../db/conn.js');
const Produto = require('./Produto.js');

const Venda = db.define('Venda', {
    total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    }
});

// Guarda nome e preço do momento da compra (histórico não muda se o produto for editado/removido)
const ItemVenda = db.define('ItemVenda', {
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    precoUnitario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    quantidade: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

Venda.hasMany(ItemVenda, { as: 'itens', foreignKey: { name: 'VendaId', allowNull: false }, onDelete: 'CASCADE' });
ItemVenda.belongsTo(Venda, { foreignKey: { name: 'VendaId', allowNull: false } });
ItemVenda.belongsTo(Produto, { foreignKey: { name: 'ProdutoId', allowNull: true }, onDelete: 'SET NULL' });

module.exports = { Venda, ItemVenda };
