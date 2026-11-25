import { useEffect, useState } from "react";
import InputGroup from "../../components/inputGroup";
import useProduto from "../../hooks/useProduto";
import { imagemUrl } from "../../utils/api";

const TIPOS_IMAGEM = ['image/jpeg', 'image/png'];
const EXTENSOES_IMAGEM = ['.jpg', '.jpeg', '.png'];

const Produtos = () => {
    const [produto, setProduto] = useState({ nome: '', preco: '' });
    const [imagem, setImagem] = useState(null);
    const [editandoId, setEditandoId] = useState(null);
    const [inputKey, setInputKey] = useState(0);
    const [listaProdutos, setListaProdutos] = useState([]);
    const { getAll, create, update, remove } = useProduto();

    async function carregar() {
        try {
            setListaProdutos(await getAll());
        } catch (err) {
            alert(err.response?.data?.message || "Erro ao carregar os produtos");
        }
    }

    useEffect(() => {
        carregar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function validateProduto(produto) {
        if (!produto.nome || !produto.nome.trim()) {
            alert("O campo nome é obrigatório");
            return false;
        }
        if (produto.preco === '' || produto.preco === undefined) {
            alert("O campo preço é obrigatório");
            return false;
        }
        if (!Number.isFinite(Number(produto.preco)) || Number(produto.preco) < 0) {
            alert("O preço não pode ser negativo");
            return false;
        }
        return true;
    }

    function validateImagem(arquivo) {
        if (!arquivo) return true;
        const nome = arquivo.name.toLowerCase();
        const extensaoOk = EXTENSOES_IMAGEM.some((ext) => nome.endsWith(ext));
        if (!TIPOS_IMAGEM.includes(arquivo.type) || !extensaoOk) {
            alert("A imagem deve ser .jpeg ou .png");
            return false;
        }
        return true;
    }

    function handleChange (e) {
        setProduto({...produto, [e.target.name]: e.target.value})
    }

    function handleImagem (e) {
        const arquivo = e.target.files[0] || null;
        if (!validateImagem(arquivo)) {
            e.target.value = '';
            setImagem(null);
            return;
        }
        setImagem(arquivo);
    }

    function limparForm() {
        setProduto({ nome: '', preco: '' });
        setImagem(null);
        setEditandoId(null);
        setInputKey((k) => k + 1);
    }

    function handleEditar(item) {
        setEditandoId(item.id);
        setProduto({ nome: item.nome, preco: String(item.preco) });
        setImagem(null);
        setInputKey((k) => k + 1);
    }

    async function handleExcluir(item) {
        if (!window.confirm(`Deseja excluir "${item.nome}"?`)) return;
        try {
            await remove(item.id);
            if (editandoId === item.id) limparForm();
            await carregar();
        } catch (err) {
            alert(err.response?.data?.message || "Erro ao excluir o produto");
        }
    }

    async function handleSubmit (e) {
        e.preventDefault();
        if (!validateProduto(produto) || !validateImagem(imagem)) {
            return;
        }
        const dados = new FormData();
        dados.append('nome', produto.nome.trim());
        dados.append('preco', produto.preco);
        if (imagem) dados.append('imagem', imagem);

        try {
            if (editandoId) {
                await update(editandoId, dados);
            } else {
                await create(dados);
            }
            limparForm();
            await carregar();
        } catch (err) {
            alert(err.response?.data?.message || "Erro ao salvar o produto");
        }
    }

    return (
        <div className="container">
            <h1 className="text-center fs-4">Produtos</h1>
            <div>
                <form onSubmit={handleSubmit}>
                    <InputGroup
                        label="Nome"
                        onChange={handleChange}
                        type="text"
                        placeholder="Nome do Produto"
                        name="nome"
                        value={produto.nome}/>
                    <InputGroup
                        label="Preço"
                        onChange={handleChange}
                        type="number"
                        placeholder="Preço do Produto"
                        name="preco"
                        min="0"
                        step="0.01"
                        value={produto.preco}/>
                    <div className="input-group mb-3">
                        <span className="input-group-text">Imagem</span>
                        <input
                            key={inputKey}
                            className="form-control"
                            type="file"
                            name="imagem"
                            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                            onChange={handleImagem}/>
                    </div>

                    <button className="btn btn-primary" type="submit">Salvar</button>
                    {editandoId && (
                        <button className="btn btn-secondary ms-2" type="button" onClick={limparForm}>Cancelar</button>
                    )}
                </form>
            </div>
            <table className=" table table-striped mt-3">
                <thead>
                    <tr>
                        <th>Imagem</th>
                        <th>Nome</th>
                        <th>Preço</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {listaProdutos.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="text-center">Nenhum produto encontrado</td>
                        </tr>)
                        : (
                            listaProdutos.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        {item.imagem && (
                                            <img src={imagemUrl(item.imagem)} alt={item.nome} width="48" height="48" style={{ objectFit: 'cover' }}/>
                                        )}
                                    </td>
                                    <td>{item.nome}</td>
                                    <td>R$ {Number(item.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="text-end">
                                        <button className="btn btn-sm btn-outline-primary me-2" type="button" onClick={() => handleEditar(item)}>Editar</button>
                                        <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => handleExcluir(item)}>Excluir</button>
                                    </td>
                                </tr>
                            ))
                        )
                    }
                </tbody>
            </table>
        </div>
    )
}

export default Produtos;
