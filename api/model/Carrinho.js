const { DataTypes } = require('sequelize');
const db = require('../db/conn.js');
const Produto = require('./Produto.js');

const Carrinho = db.define('Carrinho', {});

const ItemCarrinho = db.define('ItemCarrinho', {
    quantidade: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    }
});

Carrinho.hasMany(ItemCarrinho, { as: 'itens', foreignKey: { name: 'CarrinhoId', allowNull: false }, onDelete: 'CASCADE' });
ItemCarrinho.belongsTo(Carrinho, { foreignKey: { name: 'CarrinhoId', allowNull: false } });
ItemCarrinho.belongsTo(Produto, { as: 'produto', foreignKey: { name: 'ProdutoId', allowNull: false }, onDelete: 'CASCADE' });
Produto.hasMany(ItemCarrinho, { foreignKey: { name: 'ProdutoId', allowNull: false }, onDelete: 'CASCADE' });

module.exports = { Carrinho, ItemCarrinho };
