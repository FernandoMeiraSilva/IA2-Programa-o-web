const db = require('../db/conn.js');
const Produto = require('../model/Produto.js');
const { Carrinho, ItemCarrinho } = require('../model/Carrinho.js');
const { Venda, ItemVenda } = require('../model/Venda.js');

function validarId(id) {
    const n = Number(id);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function formatar(venda) {
    return {
        id: venda.id,
        total: Number(venda.total),
        createdAt: venda.createdAt,
        itens: (venda.itens || []).map((i) => ({
            produtoId: i.ProdutoId,
            nome: i.nome,
            precoUnitario: Number(i.precoUnitario),
            quantidade: i.quantidade,
            subtotal: Math.round(Number(i.precoUnitario) * i.quantidade * 100) / 100
        }))
    };
}

module.exports = class VendaController {
    // Finaliza a venda a partir de um carrinho (usa o preço atual dos produtos)
    static async checkout(req, res) {
        const carrinhoId = validarId(req.body?.carrinhoId);
        if (!carrinhoId) return res.status(422).json({ message: 'Carrinho inválido' });

        try {
            const vendaId = await db.transaction(async (t) => {
                const carrinho = await Carrinho.findByPk(carrinhoId, { transaction: t, lock: t.LOCK.UPDATE });
                if (!carrinho) return { erro: [404, 'Carrinho não encontrado'] };

                const itens = await ItemCarrinho.findAll({
                    where: { CarrinhoId: carrinhoId },
                    include: [{ model: Produto, as: 'produto' }],
                    transaction: t
                });
                if (itens.length === 0) return { erro: [422, 'O carrinho está vazio'] };

                const linhas = itens.map((i) => ({
                    ProdutoId: i.ProdutoId,
                    nome: i.produto.nome,
                    precoUnitario: Number(i.produto.preco),
                    quantidade: i.quantidade
                }));
                const total = Math.round(linhas.reduce((acc, l) => acc + l.precoUnitario * l.quantidade * 100, 0)) / 100;

                const venda = await Venda.create({ total }, { transaction: t });
                await ItemVenda.bulkCreate(linhas.map((l) => ({ ...l, VendaId: venda.id })), { transaction: t });
                await ItemCarrinho.destroy({ where: { CarrinhoId: carrinhoId }, transaction: t });
                return { id: venda.id };
            });

            if (vendaId.erro) return res.status(vendaId.erro[0]).json({ message: vendaId.erro[1] });

            const venda = await Venda.findByPk(vendaId.id, { include: [{ model: ItemVenda, as: 'itens' }] });
            res.status(201).json({ message: 'Venda finalizada com sucesso', venda: formatar(venda) });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Erro ao finalizar a venda' });
        }
    }

    static async getAll(req, res) {
        try {
            const vendas = await Venda.findAll({
                include: [{ model: ItemVenda, as: 'itens' }],
                order: [['id', 'DESC']]
            });
            res.status(200).json(vendas.map(formatar));
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Erro ao buscar as vendas' });
        }
    }

    static async getById(req, res) {
        const id = validarId(req.params.id);
        if (!id) return res.status(422).json({ message: 'ID inválido' });

        try {
            const venda = await Venda.findByPk(id, { include: [{ model: ItemVenda, as: 'itens' }] });
            if (!venda) return res.status(404).json({ message: 'Venda não encontrada' });
            res.status(200).json(formatar(venda));
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Erro ao buscar a venda' });
        }
    }
};
