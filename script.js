// ==========================================
// SCRIPT DA V1
// Tem as regras de negócio para as datas e da interface de agendamento
// Já existia na versão 1 da APS entregada no bimestre passado
// ==========================================

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedDate = null;
let selectedTime = null;

const availableTimes = [];
let currentHour = 9;
let currentMinute = 0;

while (currentHour < 21 || (currentHour === 21 && currentMinute === 0)) {
    const hh = String(currentHour).padStart(2, '0');
    const mm = String(currentMinute).padStart(2, '0');
    availableTimes.push(`${hh}:${mm}`);
    
    currentMinute += 40;
    if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute -= 60;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('calendar-days')) {
        renderCalendar(currentMonth, currentYear);

        // Auto-preenchimento caso haja sessão ativa em storage.js
        if (typeof Auth !== 'undefined') {
            Auth.getUsuarioLogado().then(usuarioLogado => {
                if (usuarioLogado) {
                    const nomeInput = document.getElementById('nome');
                    const telInput = document.getElementById('telefone');
                    if (nomeInput && !nomeInput.value) nomeInput.value = usuarioLogado.nome;
                    if (telInput && !telInput.value && !usuarioLogado.isAdmin) telInput.value = usuarioLogado.telefone;

                    const formEl = document.getElementById('agendamento-form');
                    if (formEl && !document.getElementById('badge-user-logged')) {
                        const badge = document.createElement('div');
                        badge.id = 'badge-user-logged';
                        badge.className = 'alert alert-dark border-secondary py-2 px-3 mb-3 small d-flex justify-content-between align-items-center';
                        badge.innerHTML = `
                            <span><i class="fa-solid ${usuarioLogado.isAdmin ? 'fa-shield-halved' : 'fa-circle-check'} text-warning me-2"></i>Logado como <strong>${usuarioLogado.nome}${usuarioLogado.isAdmin ? ' (Admin)' : ''}</strong></span>
                            <a href="login.html" class="text-warning text-decoration-none fw-bold">${usuarioLogado.isAdmin ? 'Ver Todos os Agendamentos' : 'Ver Meus Agendamentos'}</a>
                        `;
                        formEl.prepend(badge);
                    }
                }
            });
        }

        document.getElementById('prev-month').addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar(currentMonth, currentYear);
        });

        document.getElementById('next-month').addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar(currentMonth, currentYear);
        });

        const form = document.getElementById('agendamento-form');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                if (!selectedDate || !selectedTime) {
                    alert('Por favor, selecione uma data e um horário no calendário.');
                    return;
                }
                
                const nome = document.getElementById('nome').value;
                const telefone = document.getElementById('telefone') ? document.getElementById('telefone').value : '';
                const dataFormatada = formatDate(selectedDate);
                
                // Validação de segurança: verifica se horário já foi assinado no localStorage
                if (typeof HorariosAssinados !== 'undefined') {
                    const ocupado = await HorariosAssinados.isOcupado(dataFormatada, selectedTime);
                    if (ocupado) {
                        alert('Este horário já está assinado/ocupado. Por favor, escolha outro.');
                        await renderTimeSlots();
                        return;
                    }
                }

                // Persistência via módulo de storage (se disponível)
                if (typeof Agendamentos !== 'undefined') {
                    await Agendamentos.salvar({
                        nome,
                        telefone,
                        servico,
                        data: dataFormatada,
                        horario: selectedTime
                    });

                    const feedbackContainer = document.getElementById('agendamento-feedback');
                    if (feedbackContainer) {
                        feedbackContainer.innerHTML = `
                            <div class="alert alert-success alert-dismissible fade show border-0 shadow-sm" role="alert">
                                <h5 class="alert-heading fw-bold"><i class="fa-solid fa-circle-check me-2"></i>Agendamento Confirmado e Criptografado!</h5>
                                <p class="mb-1"><strong>Cliente:</strong> ${nome}</p>
                                <p class="mb-1"><strong>Telefone:</strong> ${telefone}</p>
                                <p class="mb-1"><strong>Serviço:</strong> ${servico}</p>
                                <p class="mb-3"><strong>Data e Horário:</strong> ${dataFormatada} às ${selectedTime}</p>
                                <hr>
                                <div class="d-flex gap-2">
                                    <a href="login.html" class="btn btn-sm btn-dark fw-bold">Ver Meus Agendamentos</a>
                                    <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="alert">Fechar</button>
                                </div>
                            </div>
                        `;
                        feedbackContainer.scrollIntoView({ behavior: 'smooth' });
                    } else {
                        alert(`Agendamento Confirmado e Salvo com Sucesso!\n\nNome: ${nome}\nTelefone: ${telefone}\nServiço: ${servico}\nData: ${dataFormatada}\nHorário: ${selectedTime}`);
                    }
                } else {
                    alert(`Agendamento Confirmado!\n\nNome: ${nome}\nServiço: ${servico}\nData: ${dataFormatada}\nHorário: ${selectedTime}`);
                }
                
                // Reset form and selections
                this.reset();
                selectedDate = null;
                selectedTime = null;
                updateSelectionDisplay();
                renderCalendar(currentMonth, currentYear);
                document.getElementById('time-slots-container').classList.add('d-none');
                document.getElementById('no-date-selected').classList.remove('d-none');

                // Mantém dados do usuário logado no form após reset
                if (typeof Auth !== 'undefined') {
                    Auth.getUsuarioLogado().then(usuarioLogado => {
                        if (usuarioLogado) {
                            const nomeInput = document.getElementById('nome');
                            const telInput = document.getElementById('telefone');
                            if (nomeInput) nomeInput.value = usuarioLogado.nome;
                            if (telInput && !usuarioLogado.isAdmin) telInput.value = usuarioLogado.telefone;
                        }
                    });
                }
            });
        }
    }
});

function renderCalendar(month, year) {
    const calendarDays = document.getElementById('calendar-days');
    const monthYearDisplay = document.getElementById('month-year-display');
    
    calendarDays.innerHTML = '';
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    monthYearDisplay.textContent = `${monthNames[month]} ${year}`;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        calendarDays.appendChild(emptyDiv);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.textContent = i;
        dayDiv.classList.add('calendar-day');
        
        const dateOfThisDiv = new Date(year, month, i);
        dateOfThisDiv.setHours(0,0,0,0);
        
        if (dateOfThisDiv < today) {
            dayDiv.classList.add('disabled');
        } else {
            dayDiv.addEventListener('click', () => selectDate(year, month, i));
            
            if (selectedDate && 
                selectedDate.getDate() === i && 
                selectedDate.getMonth() === month && 
                selectedDate.getFullYear() === year) {
                dayDiv.classList.add('selected');
            }
        }
        
        calendarDays.appendChild(dayDiv);
    }
}

async function selectDate(year, month, day) {
    selectedDate = new Date(year, month, day);
    selectedTime = null;
    
    renderCalendar(currentMonth, currentYear);
    
    document.getElementById('no-date-selected').classList.add('d-none');
    document.getElementById('time-slots-container').classList.remove('d-none');
    
    await renderTimeSlots();
    updateSelectionDisplay();
}

async function renderTimeSlots() {
    const container = document.getElementById('time-slots');
    if (!container || !selectedDate) return;
    
    const targetDate = selectedDate;
    const dataFormatada = formatDate(targetDate);
    
    container.innerHTML = '<div class="col-12 text-center text-muted small py-2"><i class="fa-solid fa-spinner fa-spin me-2"></i>Carregando horários...</div>';

    const ocupadosList = (typeof HorariosAssinados !== 'undefined')
        ? await HorariosAssinados.listarPorData(dataFormatada)
        : [];
    const ocupadosSet = new Set(ocupadosList);

    // Evita renderizar caso a data tenha mudado durante a descriptografia
    if (selectedDate !== targetDate) return;

    container.innerHTML = '';
    
    const timesToShow = availableTimes;
    
    if (timesToShow.length === 0) {
        container.innerHTML = '<div class="col-12 text-muted small">Nenhum horário disponível nesta data.</div>';
        return;
    }
    
    timesToShow.forEach(time => {
        const slot = document.createElement('div');
        slot.classList.add('time-slot');
        slot.textContent = time;
        
        const isOcupado = ocupadosSet.has(time);

        if (isOcupado) {
            slot.classList.add('ocupado');
            slot.setAttribute('aria-disabled', 'true');
            slot.title = 'Horário indisponível (já assinado)';
        } else {
            if (selectedTime === time) {
                slot.classList.add('selected');
            }
            
            slot.addEventListener('click', () => {
                document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
                slot.classList.add('selected');
                selectedTime = time;
                updateSelectionDisplay();
            });
        }
        
        container.appendChild(slot);
    });
}

function updateSelectionDisplay() {
    const dateDisplay = document.getElementById('selected-date-display');
    const timeDisplay = document.getElementById('selected-time-display');
    const dateInput = document.getElementById('selected-date-input');
    const timeInput = document.getElementById('selected-time-input');
    
    if (selectedDate) {
        dateDisplay.textContent = formatDate(selectedDate);
        dateInput.value = formatDate(selectedDate);
    } else {
        dateDisplay.textContent = 'Nenhuma data selecionada';
        dateInput.value = '';
    }
    
    if (selectedTime) {
        timeDisplay.textContent = selectedTime;
        timeInput.value = selectedTime;
    } else {
        timeDisplay.textContent = 'Nenhum horário selecionado';
        timeInput.value = '';
    }
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}
