import { useEffect, useState } from "react";
import useProduto from "../../hooks/useProduto";
import useCarrinho from "../../hooks/useCarrinho";
import useVenda from "../../hooks/useVenda";
import { imagemUrl } from "../../utils/api";

const CHAVE_CARRINHO = 'carrinhoId';

function formatarPreco(valor) {
    return 'R$ ' + Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const Home = () => {
    const [produtos, setProdutos] = useState([]);
    const [carrinho, setCarrinho] = useState({ id: null, itens: [], total: 0 });
    const [vendaFinalizada, setVendaFinalizada] = useState(null);
    const [carregando, setCarregando] = useState(false);
    const produtoApi = useProduto();
    const carrinhoApi = useCarrinho();
    const vendaApi = useVenda();

    // Recupera o carrinho salvo no navegador ou cria um novo
    async function obterCarrinho() {
        const salvo = localStorage.getItem(CHAVE_CARRINHO);
        if (salvo) {
            try {
                return await carrinhoApi.getById(salvo);
            } catch (err) {
                if (err.response?.status !== 404) throw err;
            }
        }
        const novo = await carrinhoApi.create();
        localStorage.setItem(CHAVE_CARRINHO, novo.id);
        return novo;
    }

    useEffect(() => {
        async function iniciar() {
            try {
                setProdutos(await produtoApi.getAll());
                setCarrinho(await obterCarrinho());
            } catch (err) {
                alert(err.response?.data?.message || "Erro ao carregar a loja");
            }
        }
        iniciar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Executa uma ação do carrinho e atualiza o estado com o carrinho retornado
    async function executar(acao) {
        setCarregando(true);
        try {
            setCarrinho(await acao());
        } catch (err) {
            alert(err.response?.data?.message || "Erro ao atualizar o carrinho");
        } finally {
            setCarregando(false);
        }
    }

    function handleAdicionar(produto) {
        setVendaFinalizada(null);
        executar(() => carrinhoApi.addItem(carrinho.id, produto.id, 1));
    }

    function handleQuantidade(item, quantidade) {
        if (quantidade < 1) return;
        executar(() => carrinhoApi.updateItem(carrinho.id, item.produtoId, quantidade));
    }

    function handleRemover(item) {
        executar(() => carrinhoApi.removeItem(carrinho.id, item.produtoId));
    }

    function handleLimpar() {
        executar(() => carrinhoApi.clear(carrinho.id));
    }

    async function handleFinalizar() {
        if (carrinho.itens.length === 0) {
            alert("O carrinho está vazio");
            return;
        }
        setCarregando(true);
        try {
            const venda = await vendaApi.checkout(carrinho.id);
            setVendaFinalizada(venda);
            setCarrinho(await carrinhoApi.getById(carrinho.id));
        } catch (err) {
            alert(err.response?.data?.message || "Erro ao finalizar a venda");
        } finally {
            setCarregando(false);
        }
    }

    return (
        <div className="container">
            <h1 className="text-center fs-4">Home</h1>

            {vendaFinalizada && (
                <div className="alert alert-success">
                    Venda #{vendaFinalizada.id} finalizada com sucesso! Total: {formatarPreco(vendaFinalizada.total)}
                </div>
            )}

            <div className="row">
                <div className="col-lg-8">
                    <div className="row">
                        {produtos.length === 0 ? (
                            <p className="text-center">Nenhum produto encontrado</p>
                        ) : (
                            produtos.map((produto) => (
                                <div className="col-6 col-md-4 mb-3" key={produto.id}>
                                    <div className="card h-100">
                                        {produto.imagem && (
                                            <img src={imagemUrl(produto.imagem)} className="card-img-top" alt={produto.nome} style={{ height: 160, objectFit: 'cover' }}/>
                                        )}
                                        <div className="card-body d-flex flex-column">
                                            <h5 className="card-title fs-6">{produto.nome}</h5>
                                            <p className="card-text">{formatarPreco(produto.preco)}</p>
                                            <button
                                                className="btn btn-primary mt-auto"
                                                type="button"
                                                disabled={carregando || !carrinho.id}
                                                onClick={() => handleAdicionar(produto)}>
                                                Adicionar ao carrinho
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="card">
                        <div className="card-body">
                            <h5 className="card-title fs-5">Carrinho</h5>
                            {carrinho.itens.length === 0 ? (
                                <p className="text-muted mb-0">Seu carrinho está vazio</p>
                            ) : (
                                <ul className="list-group list-group-flush mb-3">
                                    {carrinho.itens.map((item) => (
                                        <li className="list-group-item px-0" key={item.produtoId}>
                                            <div className="d-flex justify-content-between">
                                                <span>{item.nome}</span>
                                                <span>{formatarPreco(item.subtotal)}</span>
                                            </div>
                                            <div className="d-flex align-items-center mt-1">
                                                <button className="btn btn-sm btn-outline-secondary" type="button" disabled={carregando || item.quantidade <= 1} onClick={() => handleQuantidade(item, item.quantidade - 1)}>-</button>
                                                <span className="mx-2">{item.quantidade}</span>
                                                <button className="btn btn-sm btn-outline-secondary" type="button" disabled={carregando} onClick={() => handleQuantidade(item, item.quantidade + 1)}>+</button>
                                                <button className="btn btn-sm btn-outline-danger ms-auto" type="button" disabled={carregando} onClick={() => handleRemover(item)}>Remover</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="d-flex justify-content-between fw-bold mb-3">
                                <span>Total</span>
                                <span>{formatarPreco(carrinho.total)}</span>
                            </div>
                            <button className="btn btn-success w-100" type="button" disabled={carregando || carrinho.itens.length === 0} onClick={handleFinalizar}>
                                Finalizar venda
                            </button>
                            {carrinho.itens.length > 0 && (
                                <button className="btn btn-outline-secondary w-100 mt-2" type="button" disabled={carregando} onClick={handleLimpar}>
                                    Esvaziar carrinho
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home;
