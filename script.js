// Mock Data
const servicos = [
    { id: 1, nome: "Corte Clássico", preco: "R$ 40,00", descricao: "Corte tradicional com tesoura e máquina." },
    { id: 2, nome: "Barba", preco: "R$ 30,00", descricao: "Aparar e alinhar a barba com toalha quente." },
    { id: 3, nome: "Corte + Barba", preco: "R$ 60,00", descricao: "Pacote completo de corte e barba." },
    { id: 4, nome: "Sobrancelha", preco: "R$ 15,00", descricao: "Limpeza e alinhamento das sobrancelhas." }
];

const profissionais = [
    { id: 1, nome: "João Silva", especialidade: "Cortes Clássicos e Modernos" },
    { id: 2, nome: "Marcos Santos", especialidade: "Barboterapia e Fade" },
    { id: 3, nome: "Carlos Oliveira", especialidade: "Visagismo Masculino" }
];

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('servicos-container')) carregarServicos();
    if (document.getElementById('profissionais-container')) carregarProfissionais();
    if (document.getElementById('servico-select')) popularSelectServicos();

    const form = document.getElementById('agendamento-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Agendamento realizado com sucesso!');
            this.reset();
        });
    }
});

function carregarServicos() {
    const container = document.getElementById('servicos-container');
    servicos.forEach(servico => {
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-3 mb-4';
        card.innerHTML = `
            <div class="card h-100">
                <div class="card-body text-center">
                    <h5 class="card-title">${servico.nome}</h5>
                    <p class="card-text text-muted">${servico.descricao}</p>
                    <h6 class="card-subtitle mb-2 text-primary fw-bold">${servico.preco}</h6>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function carregarProfissionais() {
    const container = document.getElementById('profissionais-container');
    profissionais.forEach(prof => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card h-100 bg-white">
                <div class="card-body text-center">
                    <h5 class="card-title">${prof.nome}</h5>
                    <p class="card-text">${prof.especialidade}</p>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function popularSelectServicos() {
    const select = document.getElementById('servico-select');
    servicos.forEach(servico => {
        const option = document.createElement('option');
        option.value = servico.id;
        option.textContent = `${servico.nome} - ${servico.preco}`;
        select.appendChild(option);
    });
}
