// Variables for Calendar
let currentDate = new Date();
// Ensure we don't start in the past if current month is earlier than today, but for a simple calendar we'll just use current system date
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedDate = null;
let selectedTime = null;

// Gerar horários das 09:00 às 21:00 com intervalo de 40 minutos
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
    // Only run calendar logic if we are on the agendamento page
    if (document.getElementById('calendar-days')) {
        renderCalendar(currentMonth, currentYear);

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

        // Form Submission
        const form = document.getElementById('agendamento-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                if (!selectedDate || !selectedTime) {
                    alert('Por favor, selecione uma data e um horário no calendário.');
                    return;
                }
                
                const nome = document.getElementById('nome').value;
                const servico = document.getElementById('servico-select').value;
                
                alert(`Agendamento Confirmado!\n\nNome: ${nome}\nServiço: ${servico}\nData: ${formatDate(selectedDate)}\nHorário: ${selectedTime}`);
                
                // Reset form and selections
                this.reset();
                selectedDate = null;
                selectedTime = null;
                updateSelectionDisplay();
                renderCalendar(currentMonth, currentYear);
                document.getElementById('time-slots-container').classList.add('d-none');
                document.getElementById('no-date-selected').classList.remove('d-none');
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
    
    // Fill empty spaces before first day
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        calendarDays.appendChild(emptyDiv);
    }
    
    // Fill days
    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.textContent = i;
        dayDiv.classList.add('calendar-day');
        
        const dateOfThisDiv = new Date(year, month, i);
        dateOfThisDiv.setHours(0,0,0,0);
        
        // Disable past dates
        if (dateOfThisDiv < today) {
            dayDiv.classList.add('disabled');
        } else {
            dayDiv.addEventListener('click', () => selectDate(year, month, i));
            
            // Highlight if it's the currently selected date
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

function selectDate(year, month, day) {
    selectedDate = new Date(year, month, day);
    selectedTime = null; // reset time when changing date
    
    // Re-render calendar to update selected visual state
    renderCalendar(currentMonth, currentYear);
    
    // Show time slots
    document.getElementById('no-date-selected').classList.add('d-none');
    document.getElementById('time-slots-container').classList.remove('d-none');
    
    renderTimeSlots();
    updateSelectionDisplay();
}

function renderTimeSlots() {
    const container = document.getElementById('time-slots');
    container.innerHTML = '';
    
    // Exibe todos os horários gerados
    const timesToShow = availableTimes;
    
    if (timesToShow.length === 0) {
        container.innerHTML = '<div class="col-12 text-muted small">Nenhum horário disponível nesta data.</div>';
        return;
    }
    
    timesToShow.forEach(time => {
        const slot = document.createElement('div');
        slot.classList.add('time-slot');
        slot.textContent = time;
        
        if (selectedTime === time) {
            slot.classList.add('selected');
        }
        
        slot.addEventListener('click', () => {
            // Remove selected class from all
            document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
            // Add to clicked
            slot.classList.add('selected');
            selectedTime = time;
            updateSelectionDisplay();
        });
        
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
