import api from "../utils/api";

function useVenda() {
    async function checkout(carrinhoId) {
        const response = await api.post('/venda/checkout', { carrinhoId });
        return response.data.venda;
    }
    async function getAll() {
        const response = await api.get('/venda/getAll');
        return response.data;
    }
    async function getById(id) {
        const response = await api.get(`/venda/getById/${id}`);
        return response.data;
    }

    return {checkout, getAll, getById};
}

export default useVenda;
