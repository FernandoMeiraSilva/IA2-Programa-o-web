const Produto = require('../model/Produto.js');
const { Carrinho, ItemCarrinho } = require('../model/Carrinho.js');

const MAX_QUANTIDADE = 999;

function validarId(id) {
    const n = Number(id);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function validarQuantidade(q) {
    const n = Number(q);
    return Number.isInteger(n) && n > 0 && n <= MAX_QUANTIDADE ? n : null;
}

// Monta a resposta do carrinho com subtotais e total
async function montarCarrinho(id) {
    const carrinho = await Carrinho.findByPk(id, {
        include: [{ model: ItemCarrinho, as: 'itens', include: [{ model: Produto, as: 'produto' }] }],
        order: [[{ model: ItemCarrinho, as: 'itens' }, 'id', 'ASC']]
    });
    if (!carrinho) return null;

    const itens = carrinho.itens.map((i) => {
        const preco = Number(i.produto.preco);
        return {
            produtoId: i.ProdutoId,
            nome: i.produto.nome,
            preco,
            imagem: i.produto.imagem,
            quantidade: i.quantidade,
            subtotal: Math.round(preco * i.quantidade * 100) / 100
        };
    });
    const total = Math.round(itens.reduce((acc, i) => acc + i.subtotal, 0) * 100) / 100;
    return { id: carrinho.id, itens, total };
}

module.exports = class CarrinhoController {
    static async create(req, res) {
        try {
            const carrinho = await Carrinho.create({});
            res.status(201).json({ message: 'Carrinho criado com sucesso', carrinho: await montarCarrinho(carrinho.id) });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Erro ao criar o carrinho' });
        }
    }

    static async getById(req, res) {
        const id = validarId(req.params.id);
        if (!id) return res.status(422).json({ message: 'ID inválido' });

        try {
            const carrinho = await montarCarrinho(id);
            if (!carrinho) return res.status(404).json({ message: 'Carrinho não encontrado' });
            res.status(200).json(carrinho);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Erro ao buscar o carrinho' });
        }
    }

    // Adiciona um produto; se já estiver no carrinho, soma a quantidade
    static async addItem(req, res) {
        const id = validarId(req.params.id);
        if (!id) return res.status(422).json({ message: 'ID inválido' });

        const { produtoId, quantidade = 1 } = req.body ?? {};
        const pid = validarId(produtoId);
        const qtd = validarQuantidade(quantidade);
        if (!pid) return res.status(422).json({ message: 'Produto inválido' });
        if (!qtd) return res.status(422).json({ message: `A quantidade deve ser um inteiro entre 1 e ${MAX_QUANTIDADE}` });

        try {
            if (!(await Carrinho.findByPk(id))) {
                return res.status(404).json({ message: 'Carrinho não encontrado' });
            }
            if (!(await Produto.findByPk(pid))) {
                return res.status(404).json({ message: 'Produto não encontrado' });
            }

            const item = await ItemCarrinho.findOne({ where: { CarrinhoId: id, ProdutoId: pid } });
            if (item) {
                await item.update({ quantidade: Math.min(item.quantidade + qtd, MAX_QUANTIDADE) });
            } else {
                await ItemCarrinho.create({ CarrinhoId: id, ProdutoId: pid, quantidade: qtd });
            }
            res.status(200).json({ message: 'Item adicionado ao carrinho', carrinho: await montarCarrinho(id) });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Erro ao adicionar item ao carrinho' });
        }
    }

    static async updateItem(req, res) {
        const id = validarId(req.params.id);
        const pid = validarId(req.params.produtoId);
        if (!id || !pid) return res.status(422).json({ message: 'ID inválido' });

        const qtd = validarQuantidade(req.body?.quantidade);
        if (!qtd) return res.status(422).json({ message: `A quantidade deve ser um inteiro entre 1 e ${MAX_QUANTIDADE}` });

        try {
            const item = await ItemCarrinho.findOne({ where: { CarrinhoId: id, ProdutoId: pid } });
            if (!item) return res.status(404).json({ message: 'Item não encontrado no carrinho' });
            await item.update({ quantidade: qtd });
            res.status(200).json({ message: 'Item atualizado', carrinho: await montarCarrinho(id) });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Erro ao atualizar o item' });
        }
    }

    static async removeItem(req, res) {
        const id = validarId(req.params.id);
        const pid = validarId(req.params.produtoId);
        if (!id || !pid) return res.status(422).json({ message: 'ID inválido' });

        try {
            const removidos = await ItemCarrinho.destroy({ where: { CarrinhoId: id, ProdutoId: pid } });
            if (!removidos) return res.status(404).json({ message: 'Item não encontrado no carrinho' });
            res.status(200).json({ message: 'Item removido', carrinho: await montarCarrinho(id) });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Erro ao remover o item' });
        }
    }

    static async clear(req, res) {
        const id = validarId(req.params.id);
        if (!id) return res.status(422).json({ message: 'ID inválido' });

        try {
            if (!(await Carrinho.findByPk(id))) {
                return res.status(404).json({ message: 'Carrinho não encontrado' });
            }
            await ItemCarrinho.destroy({ where: { CarrinhoId: id } });
            res.status(200).json({ message: 'Carrinho esvaziado', carrinho: await montarCarrinho(id) });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Erro ao esvaziar o carrinho' });
        }
    }
};
