// ==========================================
// MÓDULO EXCLUSIVO: STORAGE & AUTENTICAÇÃO
// Gerencia persistência cifrada (AES-GCM) no localStorage e lógica de usuários
// ==========================================

const Storage = {
    async get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return defaultValue;

            // Se o módulo CriptoStorage estiver presente, decifra os dados
            if (typeof CriptoStorage !== 'undefined') {
                const decifrado = await CriptoStorage.decifrar(item);
                if (decifrado !== null) return decifrado;
            }

            // Fallback para dados em texto puro (legados)
            return JSON.parse(item);
        } catch (err) {
            console.error(`[Storage] Falha ao ler "${key}":`, err);
            return defaultValue;
        }
    },

    async set(key, value) {
        try {
            // Se o módulo CriptoStorage estiver presente, salva cifrado com AES-GCM
            if (typeof CriptoStorage !== 'undefined') {
                const cifrado = await CriptoStorage.cifrar(value);
                localStorage.setItem(key, cifrado);
                return true;
            }

            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (err) {
            console.error(`[Storage] Falha ao salvar "${key}":`, err);
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (err) {
            console.error(`[Storage] Falha ao remover "${key}":`, err);
        }
    }
};

// ==========================================
// UTILITÁRIOS DE FORMATAÇÃO E MÁSCARA
// ==========================================
function normalizarTelefone(tel) {
    return String(tel || '').replace(/\D/g, '');
}

function formatarTelefone(tel) {
    const raw = normalizarTelefone(tel);
    if (raw.length === 11) {
        return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    if (raw.length === 10) {
        return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    }
    return tel;
}

function aplicarMascaraTelefone(input) {
    if (!input) return;
    input.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 11);
        if (v.length > 6) {
            e.target.value = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
        } else if (v.length > 2) {
            e.target.value = `(${v.slice(0, 2)}) ${v.slice(2)}`;
        } else if (v.length > 0) {
            e.target.value = `(${v}`;
        }
    });
}

// ==========================================
// SERVIÇO DE AUTENTICAÇÃO
// ==========================================
const Auth = {
    STORAGE_USERS: 'barbearia_usuarios',
    STORAGE_SESSION: 'barbearia_sessao',

    async getUsuarioLogado() {
        return await Storage.get(this.STORAGE_SESSION, null);
    },

    async registrar(nome, telefone, senha) {
        const telLimpo = normalizarTelefone(telefone);

        if (!nome || !nome.trim()) {
            return { ok: false, mensagem: 'Por favor, informe seu nome completo.' };
        }
        if (!telLimpo || telLimpo.length < 10) {
            return { ok: false, mensagem: 'O telefone é obrigatório e deve conter DDD válido.' };
        }
        if (!senha || senha.length < 4) {
            return { ok: false, mensagem: 'A senha deve ter no mínimo 4 dígitos.' };
        }

        const usuarios = await Storage.get(this.STORAGE_USERS, []);
        const jaExiste = usuarios.some(u => normalizarTelefone(u.telefone) === telLimpo);

        if (jaExiste) {
            return { ok: false, mensagem: 'Este número de telefone já possui cadastro. Faça login.' };
        }

        const novoUsuario = {
            id: 'usr_' + Date.now(),
            nome: nome.trim(),
            telefone: formatarTelefone(telLimpo),
            telefoneRaw: telLimpo,
            senha: senha,
            criadoEm: new Date().toISOString()
        };

        usuarios.push(novoUsuario);
        await Storage.set(this.STORAGE_USERS, usuarios);

        const sessao = {
            id: novoUsuario.id,
            nome: novoUsuario.nome,
            telefone: novoUsuario.telefone,
            telefoneRaw: novoUsuario.telefoneRaw
        };
        await Storage.set(this.STORAGE_SESSION, sessao);

        return { ok: true, usuario: sessao };
    },

    async login(telefone, senha) {
        const telLimpo = normalizarTelefone(telefone);

        if (!telLimpo) {
            return { ok: false, mensagem: 'O telefone é obrigatório para realizar o login.' };
        }
        if (!senha) {
            return { ok: false, mensagem: 'Por favor, informe sua senha.' };
        }

        const usuarios = await Storage.get(this.STORAGE_USERS, []);
        const usuario = usuarios.find(u => normalizarTelefone(u.telefone) === telLimpo && u.senha === senha);

        if (!usuario) {
            return { ok: false, mensagem: 'Telefone ou senha inválidos. Verifique os dados.' };
        }

        const sessao = {
            id: usuario.id,
            nome: usuario.nome,
            telefone: usuario.telefone,
            telefoneRaw: usuario.telefoneRaw
        };
        await Storage.set(this.STORAGE_SESSION, sessao);

        return { ok: true, usuario: sessao };
    },

    logout() {
        Storage.remove(this.STORAGE_SESSION);
    }
};

// ==========================================
// SERVIÇO DE AGENDAMENTOS
// ==========================================
const Agendamentos = {
    STORAGE_KEY: 'barbearia_agendamentos',

    async listarTodos() {
        return await Storage.get(this.STORAGE_KEY, []);
    },

    async listarPorTelefone(telefone) {
        const telLimpo = normalizarTelefone(telefone);
        if (!telLimpo) return [];
        const lista = await this.listarTodos();
        return lista.filter(item => normalizarTelefone(item.telefone) === telLimpo);
    },

    async salvar(dados) {
        const todos = await this.listarTodos();
        const novo = {
            id: 'ag_' + Date.now() + Math.random().toString(36).substring(2, 6),
            nome: dados.nome.trim(),
            telefone: formatarTelefone(dados.telefone),
            telefoneRaw: normalizarTelefone(dados.telefone),
            servico: dados.servico,
            data: dados.data,
            horario: dados.horario,
            criadoEm: new Date().toISOString()
        };

        todos.push(novo);
        await Storage.set(this.STORAGE_KEY, todos);
        return novo;
    },

    async cancelar(id) {
        const todos = await this.listarTodos();
        const filtrados = todos.filter(item => item.id !== id);
        await Storage.set(this.STORAGE_KEY, filtrados);
        return true;
    }
};

// ==========================================
// GERENCIADOR DE UI DA ÁREA DE LOGIN E NAVBAR
// ==========================================
async function atualizarNavbar() {
    const usuario = await Auth.getUsuarioLogado();
    const linkConta = document.querySelector('.nav-link-conta');
    if (linkConta && usuario) {
        const primeiroNome = usuario.nome.split(' ')[0];
        linkConta.innerHTML = `<i class="fa-solid fa-user-check me-1"></i> Olá, ${primeiroNome}`;
    }
}

function inicializarPaginaLogin() {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    aplicarMascaraTelefone(document.getElementById('login-telefone'));
    aplicarMascaraTelefone(document.getElementById('reg-telefone'));

    renderizarEstadoAuth();

    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tel = document.getElementById('login-telefone').value;
            const pass = document.getElementById('login-senha').value;
            const alertEl = document.getElementById('login-alert');

            const res = await Auth.login(tel, pass);
            if (!res.ok) {
                if (alertEl) {
                    alertEl.textContent = res.mensagem;
                    alertEl.classList.remove('d-none');
                } else {
                    alert(res.mensagem);
                }
                return;
            }

            if (alertEl) alertEl.classList.add('d-none');
            formLogin.reset();
            await renderizarEstadoAuth();
            await atualizarNavbar();
        });
    }

    const formRegistro = document.getElementById('form-registro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('reg-nome').value;
            const tel = document.getElementById('reg-telefone').value;
            const pass = document.getElementById('reg-senha').value;
            const alertEl = document.getElementById('reg-alert');

            const res = await Auth.registrar(nome, tel, pass);
            if (!res.ok) {
                if (alertEl) {
                    alertEl.textContent = res.mensagem;
                    alertEl.classList.remove('d-none');
                } else {
                    alert(res.mensagem);
                }
                return;
            }

            if (alertEl) alertEl.classList.add('d-none');
            formRegistro.reset();
            await renderizarEstadoAuth();
            await atualizarNavbar();
        });
    }
}

async function renderizarEstadoAuth() {
    const guestView = document.getElementById('auth-guest-view');
    const loggedView = document.getElementById('auth-logged-view');
    if (!guestView || !loggedView) return;

    const usuario = await Auth.getUsuarioLogado();

    if (usuario) {
        guestView.classList.add('d-none');
        loggedView.classList.remove('d-none');

        const perfilNome = document.getElementById('perfil-nome');
        const perfilTelefone = document.getElementById('perfil-telefone');
        if (perfilNome) perfilNome.textContent = usuario.nome;
        if (perfilTelefone) perfilTelefone.textContent = usuario.telefone;

        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.onclick = async () => {
                if (confirm('Deseja realmente sair da sua conta?')) {
                    Auth.logout();
                    await renderizarEstadoAuth();
                    await atualizarNavbar();
                }
            };
        }

        await renderizarAgendamentosUsuario(usuario.telefoneRaw);
    } else {
        loggedView.classList.add('d-none');
        guestView.classList.remove('d-none');
    }
}

async function renderizarAgendamentosUsuario(telefoneRaw) {
    const container = document.getElementById('lista-agendamentos');
    const countBadge = document.getElementById('agendamentos-count');
    if (!container) return;

    const lista = await Agendamentos.listarPorTelefone(telefoneRaw);

    if (countBadge) {
        countBadge.textContent = `${lista.length} ${lista.length === 1 ? 'agendamento' : 'agendamentos'}`;
    }

    if (lista.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fa-regular fa-calendar-xmark fa-3x mb-3" style="color: #666;"></i>
                <h6 class="text-white fw-bold mb-1">Nenhum agendamento encontrado</h6>
                <p class="small mb-4" style="color: #bbb;">Você ainda não tem nenhum horário agendado com este número de telefone.</p>
                <a href="agendamento.html" class="btn custom-btn-hero btn-sm">Agendar um Horário Agora</a>
            </div>
        `;
        return;
    }

    const cardsHtml = lista.map(item => `
        <div class="col-12 col-md-6 mb-3">
            <div class="appointment-item d-flex flex-column justify-content-between h-100">
                <div>
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge" style="background-color: #ff9800; color: #111;">${item.servico}</span>
                        <small style="color: #bbb;">${item.horario}</small>
                    </div>
                    <h5 class="text-white fw-bold mb-1">
                        <i class="fa-regular fa-calendar-check text-warning me-2"></i>${item.data}
                    </h5>
                    <p class="small mb-3" style="color: #ccc;">
                        <i class="fa-solid fa-phone me-1 text-warning"></i> ${item.telefone}
                    </p>
                </div>
                <div class="pt-2 border-top border-secondary d-flex justify-content-between align-items-center">
                    <span class="small text-success"><i class="fa-solid fa-circle-dot me-1"></i>Confirmado</span>
                    <button class="btn btn-outline-danger btn-sm py-1 px-2" onclick="cancelarAgendamento('${item.id}', '${telefoneRaw}')">
                        <i class="fa-regular fa-trash-can me-1"></i>Cancelar
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="row g-3">${cardsHtml}</div>`;
}

window.cancelarAgendamento = async function (id, telefoneRaw) {
    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
        await Agendamentos.cancelar(id);
        await renderizarAgendamentosUsuario(telefoneRaw);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    await atualizarNavbar();
    inicializarPaginaLogin();
});
