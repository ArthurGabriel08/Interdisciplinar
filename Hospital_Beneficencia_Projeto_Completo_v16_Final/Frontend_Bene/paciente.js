// ==========================================
// PACIENTE.JS — Módulo do Paciente (HBSaúde v2)
// Funções de agendamento, dashboard, perfil e histórico
// Depende de: utils.js (funções globais)
// ==========================================

// Horários padrão de atendimento
const standardWorkHours = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
];

// ==========================================
// INICIALIZAÇÃO DO MÓDULO PACIENTE
// ==========================================

/**
 * initPaciente()
 * Anexa todos os event listeners relacionados ao paciente.
 * Chamada pelo app.js na inicialização.
 */
function initPaciente() {
  // Formulário de agendamento
  const formBooking = document.getElementById('form-booking');
  if (formBooking) {
    formBooking.addEventListener('submit', bookAppointment);
  }

  // Mudança de especialidade → resetar slots e recarregar
  const bookingSpecialty = document.getElementById('booking-specialty');
  if (bookingSpecialty) {
    bookingSpecialty.addEventListener('change', function () {
      resetTimeSlotsSelection();
      checkAndRenderTimeSlots();
    });
  }

  // Mudança de data → recarregar horários
  const bookingDate = document.getElementById('booking-date');
  if (bookingDate) {
    bookingDate.addEventListener('change', checkAndRenderTimeSlots);
  }

  // Formulário de perfil do paciente
  const formPerfil = document.getElementById('form-paciente-perfil');
  if (formPerfil) {
    formPerfil.addEventListener('submit', updateProfile);
  }

  // Filtros do histórico do paciente
  const filterStatus = document.getElementById('hist-filter-status');
  if (filterStatus) {
    filterStatus.addEventListener('change', renderPacienteHistorico);
  }

  const filterSpecialty = document.getElementById('hist-filter-specialty');
  if (filterSpecialty) {
    filterSpecialty.addEventListener('change', renderPacienteHistorico);
  }

  const filterDateStart = document.getElementById('hist-filter-date-start');
  if (filterDateStart) {
    filterDateStart.addEventListener('change', renderPacienteHistorico);
  }

  const filterDateEnd = document.getElementById('hist-filter-date-end');
  if (filterDateEnd) {
    filterDateEnd.addEventListener('change', renderPacienteHistorico);
  }
}

// ==========================================
// FUNÇÕES AUXILIARES DE AGENDAMENTO
// ==========================================

/**
 * getShiftByHour(hourStr)
 * Retorna 'morning' se a hora for antes das 12h, senão 'afternoon'.
 */
function getShiftByHour(hourStr) {
  const hourVal = parseInt(hourStr.split(':')[0], 10);
  return hourVal < 12 ? 'morning' : 'afternoon';
}

/**
 * getAssignedProfessional(specialty, hourStr)
 * Busca o médico escalado para uma especialidade e turno.
 * Utiliza hbsaude_users (role='medico') e hbsaude_specialties para
 * fazer o match entre nome da especialidade e id no array do médico.
 */
function getAssignedProfessional(specialty, hourStr) {
  const shift = getShiftByHour(hourStr);
  const users = getDB('hbsaude_users');
  const specialties = getDB('hbsaude_specialties');

  // Encontrar o ID da especialidade pelo nome
  const specObj = specialties.find(function (s) {
    return s.name === specialty;
  });
  if (!specObj) return null;

  const specId = specObj.id;

  // Encontrar o médico cujo array de especialidades contém esse ID e cujo turno bate
  const doctor = users.find(function (u) {
    return u.role === 'medico' &&
      Array.isArray(u.specialties) &&
      u.specialties.includes(specId) &&
      u.shift === shift;
  });

  return doctor || null;
}

/**
 * setupMinBookingDate()
 * Define a data mínima do campo de data como amanhã.
 */
function setupMinBookingDate() {
  const bookingDate = document.getElementById('booking-date');
  if (!bookingDate) return;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');

  bookingDate.min = yyyy + '-' + mm + '-' + dd;
}

/**
 * resetTimeSlotsSelection()
 * Limpa a seleção de horário, esconde o card do médico e exibe placeholder.
 */
function resetTimeSlotsSelection() {
  var bookingTime = document.getElementById('booking-time');
  var assignedDoctorContainer = document.getElementById('assigned-doctor-container');
  var timeSlotsContainer = document.getElementById('time-slots-container');

  if (bookingTime) bookingTime.value = '';
  if (assignedDoctorContainer) {
    assignedDoctorContainer.innerHTML = '';
    assignedDoctorContainer.style.display = 'none';
  }
  if (timeSlotsContainer) {
    timeSlotsContainer.innerHTML =
      '<div style="grid-column: span 3; text-align: center; font-size: 0.85rem; color: var(--text-muted); padding: 0.5rem 0;">' +
      'Selecione especialidade e data primeiro' +
      '</div>';
  }
}

/**
 * checkAndRenderTimeSlots()
 * Renderiza os botões de horários disponíveis conforme especialidade e data selecionadas.
 */
function checkAndRenderTimeSlots() {
  var bookingSpecialty = document.getElementById('booking-specialty');
  var bookingDate = document.getElementById('booking-date');
  var bookingTime = document.getElementById('booking-time');
  var timeSlotsContainer = document.getElementById('time-slots-container');
  var assignedDoctorContainer = document.getElementById('assigned-doctor-container');
  var feedbackDate = document.getElementById('feedback-booking-date');

  var specialty = bookingSpecialty ? bookingSpecialty.value : '';
  var dateStr = bookingDate ? bookingDate.value : '';

  // Se especialidade ou data não preenchidas, resetar
  if (!specialty || !dateStr) {
    resetTimeSlotsSelection();
    return;
  }

  // Validação de final de semana
  var selectedDate = new Date(dateStr + 'T00:00:00');
  var dayOfWeek = selectedDate.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    if (feedbackDate) {
      feedbackDate.textContent = 'O HBSaúde atende consultas eletivas apenas de Segunda a Sexta-feira';
      feedbackDate.classList.add('error');
    }
    if (bookingDate) bookingDate.style.borderColor = 'var(--secondary-color)';
    resetTimeSlotsSelection();
    return;
  } else {
    if (feedbackDate) feedbackDate.classList.remove('error');
    if (bookingDate) bookingDate.style.borderColor = 'var(--border-color)';
  }

  // Limpar seleção anterior
  if (bookingTime) bookingTime.value = '';
  if (assignedDoctorContainer) {
    assignedDoctorContainer.innerHTML = '';
    assignedDoctorContainer.style.display = 'none';
  }

  // Carregar agendamentos existentes
  var appointments = getDB('hbsaude_appointments');

  // Renderizar botões de horário
  if (timeSlotsContainer) timeSlotsContainer.innerHTML = '';

  standardWorkHours.forEach(function (hour) {
    var assignedProf = getAssignedProfessional(specialty, hour);

    var slotBtn = document.createElement('button');
    slotBtn.type = 'button';
    slotBtn.className = 'time-slot-btn';
    slotBtn.textContent = hour;

    if (!assignedProf) {
      // Sem profissional neste turno → desabilitado
      slotBtn.classList.add('disabled');
      slotBtn.title = 'Sem profissional disponível';
      if (timeSlotsContainer) timeSlotsContainer.appendChild(slotBtn);
      return;
    }

    // Verificar se já existe agendamento para este médico/data/hora
    // Considerar apenas agendamentos que não estejam cancelados
    var isBooked = appointments.some(function (app) {
      return app.doctorName === assignedProf.name &&
        app.date === dateStr &&
        app.time === hour &&
        app.status !== 'cancelado';
    });

    if (isBooked) {
      slotBtn.classList.add('disabled');
      slotBtn.title = 'Horário Ocupado';
    } else {
      slotBtn.addEventListener('click', function () {
        // Remover seleção anterior
        document.querySelectorAll('.time-slot-btn').forEach(function (btn) {
          btn.classList.remove('selected');
        });

        // Selecionar este botão
        slotBtn.classList.add('selected');
        if (bookingTime) bookingTime.value = hour;

        // Esconder erro de horário
        var feedbackTime = document.getElementById('feedback-booking-time');
        if (feedbackTime) feedbackTime.style.display = 'none';

        // Exibir informações do médico designado
        displayAssignedDoctor(assignedProf);
      });
    }

    if (timeSlotsContainer) timeSlotsContainer.appendChild(slotBtn);
  });
}

/**
 * displayAssignedDoctor(prof)
 * Exibe o card com informações do médico designado ao horário selecionado.
 */
function displayAssignedDoctor(prof) {
  var container = document.getElementById('assigned-doctor-container');
  if (!container) return;

  var priceFormatted = formatCurrency(prof.consultPrice || 0);

  container.innerHTML =
    '<div class="assigned-doctor-header">Profissional Designado</div>' +
    '<div class="assigned-doctor-profile">' +
    '  <div class="assigned-doctor-avatar">' + prof.name.charAt(0) + '</div>' +
    '  <div class="assigned-doctor-meta">' +
    '    <div class="assigned-doctor-name">' + prof.name + '</div>' +
    '    <div class="assigned-doctor-crm">' + (prof.crm || '') + '</div>' +
    '  </div>' +
    '</div>' +
    '<div class="assigned-doctor-details">' +
    '  <span class="assigned-doctor-price-label">Valor da Consulta (Coparticipação):</span>' +
    '  <span class="assigned-doctor-price">' + priceFormatted + '</span>' +
    '</div>' +
    '<div class="assigned-doctor-desc">' + (prof.description || '') + '</div>';

  container.style.display = 'flex';
}

// ==========================================
// AGENDAMENTO DE CONSULTA
// ==========================================

/**
 * bookAppointment(e)
 * Processa o envio do formulário de agendamento.
 */
function bookAppointment(e) {
  e.preventDefault();

  var bookingSpecialty = document.getElementById('booking-specialty');
  var bookingDate = document.getElementById('booking-date');
  var bookingTime = document.getElementById('booking-time');
  var feedbackTime = document.getElementById('feedback-booking-time');
  var feedbackDate = document.getElementById('feedback-booking-date');

  var specialty = bookingSpecialty ? bookingSpecialty.value : '';
  var dateStr = bookingDate ? bookingDate.value : '';
  var timeStr = bookingTime ? bookingTime.value : '';

  var isValid = true;

  // Validar especialidade
  if (!specialty) {
    showToast('Por favor, selecione uma especialidade.', 'error');
    isValid = false;
  }

  // Validar data
  if (!dateStr) {
    if (feedbackDate) {
      feedbackDate.textContent = 'Por favor, escolha uma data';
      feedbackDate.classList.add('error');
    }
    if (bookingDate) bookingDate.style.borderColor = 'var(--secondary-color)';
    isValid = false;
  }

  // Validar horário
  if (!timeStr) {
    if (feedbackTime) feedbackTime.style.display = 'block';
    isValid = false;
  } else {
    if (feedbackTime) feedbackTime.style.display = 'none';
  }

  if (!isValid) return;

  // Obter profissional designado
  var assignedProf = getAssignedProfessional(specialty, timeStr);
  if (!assignedProf) {
    showToast('Erro ao designar o profissional. Tente selecionar outro horário.', 'error');
    return;
  }

  var currentUser = getCurrentUser();
  if (!currentUser) {
    showToast('Você precisa estar logado para agendar.', 'error');
    return;
  }

  // Criar novo agendamento seguindo a estrutura v2
  var newAppointment = {
    id: generateId('app'),
    patientEmail: currentUser.email,
    doctorName: assignedProf.name,
    doctorCrm: assignedProf.crm || '',
    specialty: specialty,
    date: dateStr,
    time: timeStr,
    status: 'pendente',
    observations: 'Agendamento Web',
    price: assignedProf.consultPrice || 250.00
  };

  // Enviar agendamento para o backend REST / SQL Server
  apiService.agendarConsultaProcedure(currentUser.id, assignedProf.id, dateStr + 'T' + timeStr + ':00').then(function () {
    // O banco é a fonte da verdade: recarrega as consultas do SQL Server
    return syncFromApi();
  }).then(function () {
    showToast('Consulta agendada pela procedure agendar_consulta no SQL Server!', 'success');

    // Resetar formulário
    var formBooking = document.getElementById('form-booking');
    if (formBooking) formBooking.reset();
    resetTimeSlotsSelection();

    // Re-renderizar agendamentos e horários
    renderAppointments();
    checkAndRenderTimeSlots();
  }).catch(function (err) {
    showToast(err.message || 'Erro ao comunicar com o servidor backend.', 'error');
  });
}

// ==========================================
// DASHBOARD DO PACIENTE
// ==========================================

/**
 * renderDashboard()
 * Renderiza o dashboard do paciente: formulário de agendamento + consultas ativas.
 */
function renderDashboard() {
  // Configurar data mínima
  setupMinBookingDate();

  // Carregar opções de especialidades no select
  var bookingSpecialty = document.getElementById('booking-specialty');
  if (bookingSpecialty) {
    var specialties = getDB('hbsaude_specialties');

    // Manter apenas a option padrão
    bookingSpecialty.innerHTML = '<option value="" disabled selected>Selecione uma especialidade...</option>';

    specialties.forEach(function (spec) {
      var option = document.createElement('option');
      option.value = spec.name;
      option.textContent = spec.name;
      bookingSpecialty.appendChild(option);
    });
  }

  // Renderizar consultas ativas (não canceladas e não concluídas)
  renderAppointments();
}

/**
 * renderAppointments()
 * Renderiza a lista de consultas ativas do paciente logado.
 */
function renderAppointments() {
  var currentUser = getCurrentUser();
  if (!currentUser) return;

  var appointmentsList = document.getElementById('appointments-list');
  var appointmentsCount = document.getElementById('appointments-count');
  if (!appointmentsList) return;

  // Filtrar agendamentos do paciente logado (ativos: não cancelados e não concluídos)
  var allAppointments = getDB('hbsaude_appointments');
  var myAppointments = allAppointments.filter(function (app) {
    return app.patientEmail === currentUser.email &&
      app.status !== 'cancelado' &&
      app.status !== 'concluido';
  });

  // Ordenar por data e hora
  myAppointments.sort(function (a, b) {
    var dateA = new Date(a.date + 'T' + a.time);
    var dateB = new Date(b.date + 'T' + b.time);
    return dateA - dateB;
  });

  // Atualizar contador
  if (appointmentsCount) {
    appointmentsCount.textContent = myAppointments.length;
  }

  // Estado vazio
  if (myAppointments.length === 0) {
    appointmentsList.innerHTML =
      '<div class="empty-state">' +
      '  <svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"/></svg>' +
      '  <h3>Nenhuma consulta agendada</h3>' +
      '  <p>Utilize o formulário ao lado para agendar seu primeiro atendimento médico.</p>' +
      '</div>';
    return;
  }

  appointmentsList.innerHTML = '';

  myAppointments.forEach(function (app) {
    var formattedDate = formatDateBR(app.date);
    var formattedPrice = formatCurrency(app.price || 0);

    // Mapear label do status
    var statusLabels = {
      'pendente': 'Pendente',
      'confirmado': 'Confirmado',
      'pago': 'Pago',
      'cancelado': 'Cancelado',
      'concluido': 'Concluído'
    };

    var statusLabel = statusLabels[app.status] || app.status;

    // Montar botões de ação conforme status
    var actionsHTML = '';
    if (app.status === 'pendente') {
      actionsHTML =
        '<button class="btn-cancel-appointment" onclick="cancelAppointment(\'' + app.id + '\')">Cancelar</button>' +
        '<button class="btn-pay-appointment" onclick="payAppointment(\'' + app.id + '\')">Pagar</button>';
    } else if (app.status === 'confirmado') {
      actionsHTML =
        '<button class="btn-cancel-appointment" onclick="cancelAppointment(\'' + app.id + '\')">Cancelar</button>' +
        '<button class="btn-pay-appointment" onclick="payAppointment(\'' + app.id + '\')">Pagar</button>';
    } else if (app.status === 'pago') {
      actionsHTML =
        '<button class="btn-cancel-appointment" onclick="cancelAppointment(\'' + app.id + '\')">Cancelar</button>';
    }
    // cancelado e concluido: sem botões

    var card = document.createElement('div');
    card.className = 'appointment-card';
    card.setAttribute('data-id', app.id);

    card.innerHTML =
      '<div class="appointment-info">' +
      '  <span class="appointment-specialty">' + app.specialty + ' • ' + formattedPrice + '</span>' +
      '  <h3 class="appointment-doctor">' + app.doctorName + '</h3>' +
      '  <div class="appointment-datetime">' +
      '    <div class="datetime-item">' +
      '      <svg viewBox="0 0 24 24"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>' +
      '      <span>' + formattedDate + '</span>' +
      '    </div>' +
      '    <div class="datetime-item">' +
      '      <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>' +
      '      <span>' + app.time + '</span>' +
      '    </div>' +
      '  </div>' +
      '  <span class="status-badge status-' + app.status + '">' + statusLabel + '</span>' +
      '</div>' +
      '<div class="appointment-actions">' + actionsHTML + '</div>';

    appointmentsList.appendChild(card);
  });
}

// ==========================================
// CANCELAMENTO DE CONSULTA
// ==========================================

/**
 * cancelAppointment(id)
 * Cancela uma consulta do paciente com confirmação no servidor.
 */
function cancelAppointment(id) {
  openConfirmModal(
    'Cancelar Consulta',
    'Deseja realmente cancelar esta consulta?',
    async function () {
      try {
        const numericId = parseInt(String(id).replace(/\D/g, '')) || 1;
        await apiService.cancelarConsultaProcedure(numericId, 'Cancelado pelo paciente');
        await syncFromApi();

        renderAppointments();
        checkAndRenderTimeSlots();
        closeModal();
        showToast('Consulta cancelada com sucesso no SQL Server.', 'success');
      } catch (err) {
        closeModal();
        showToast(err.message || 'Erro ao cancelar consulta no servidor.', 'error');
      }
    }
  );
}

// ==========================================
// PAGAMENTO DE CONSULTA
// ==========================================

/**
 * payAppointment(id)
 * Abre modal de pagamento para a consulta selecionada.
 */
function payAppointment(id) {
  var appointments = getDB('hbsaude_appointments');
  var appointment = appointments.find(function (app) { return app.id === id; });

  if (!appointment) {
    showToast('Consulta não encontrada.', 'error');
    return;
  }

  // Abrir modal de pagamento
  openPaymentModal(id, appointment.price || 0);

  // Configurar o botão de submit do pagamento
  var paymentSubmit = document.getElementById('payment-submit');
  if (paymentSubmit) {
    var newBtn = paymentSubmit.cloneNode(true);
    paymentSubmit.parentNode.replaceChild(newBtn, paymentSubmit);

    newBtn.addEventListener('click', async function () {
      var methodSelect = document.getElementById('payment-method-select');
      var method = methodSelect ? methodSelect.value : 'pix';

      try {
        const numericId = parseInt(String(id).replace(/\D/g, '')) || 1;
        await apiService.pagarConsultaProcedure(numericId, method);
        await syncFromApi();

        renderAppointments();
        closeModal();
        showToast('Pagamento confirmado e registrado no banco de dados!', 'success');
      } catch (err) {
        showToast(err.message || 'Erro ao registrar pagamento no servidor.', 'error');
      }
    });
  }
}

// ==========================================
// PERFIL DO PACIENTE
// ==========================================

/**
 * renderPacientePerfil()
 * Renderiza e preenche o formulário de perfil do paciente.
 */
function renderPacientePerfil() {
  var currentUser = getCurrentUser();
  if (!currentUser) return;

  // Preencher campos com dados atuais
  var nameInput = document.getElementById('perfil-name');
  var emailInput = document.getElementById('perfil-email');
  var cpfInput = document.getElementById('perfil-cpf');
  var phoneInput = document.getElementById('perfil-phone');
  var sexInput = document.getElementById('perfil-sex');
  var birthInput = document.getElementById('perfil-birthdate');

  if (nameInput) nameInput.value = currentUser.name || '';
  if (emailInput) emailInput.value = currentUser.email || '';
  if (cpfInput) {
    cpfInput.value = currentUser.cpf || '';
    cpfInput.readOnly = true; // CPF não pode ser alterado
  }
  if (phoneInput) phoneInput.value = currentUser.phone || '';
  if (sexInput) sexInput.value = currentUser.sex || '';
  if (birthInput) birthInput.value = currentUser.birthDate || '';

  // Aplicar máscara de telefone
  if (phoneInput) maskPhone(phoneInput);
}

/**
 * updateProfile(e)
 * Atualiza os dados do perfil do paciente.
 */
async function updateProfile(e) {
  e.preventDefault();

  var currentUser = getCurrentUser();
  if (!currentUser) return;

  // Coletar dados do formulário
  var nameInput = document.getElementById('perfil-name');
  var emailInput = document.getElementById('perfil-email');
  var phoneInput = document.getElementById('perfil-phone');
  var sexInput = document.getElementById('perfil-sex');
  var birthInput = document.getElementById('perfil-birthdate');
  var currentPwdInput = document.getElementById('perfil-current-password');
  var newPwdInput = document.getElementById('perfil-new-password');

  var name = nameInput ? nameInput.value.trim() : '';
  var email = emailInput ? emailInput.value.trim() : '';
  var phone = phoneInput ? phoneInput.value.trim() : '';
  var sex = sexInput ? sexInput.value : '';
  var birthDate = birthInput ? birthInput.value : '';
  var currentPwd = currentPwdInput ? currentPwdInput.value : '';
  var newPwd = newPwdInput ? newPwdInput.value : '';

  // Validações
  if (!name) {
    showToast('Por favor, informe seu nome.', 'error');
    return;
  }

  if (!validateEmail(email)) {
    showToast('Por favor, informe um e-mail válido.', 'error');
    return;
  }

  // Se quer mudar a senha, valida a nova senha e exige a atual
  if (newPwd) {
    if (!currentPwd) {
      showToast('Informe a senha atual para definir uma nova senha.', 'error');
      return;
    }
    var pwdValidation = validatePassword(newPwd);
    if (!pwdValidation.valid) {
      showToast('Nova senha inválida: ' + pwdValidation.errors.join(', '), 'error');
      return;
    }
  }

  try {
    // Dados do cadastro no SQL Server
    await apiService.updatePaciente(currentUser.id, {
      nome: name,
      email: email,
      telefone: phone,
      sexo: sex || null,
      dataNascimento: birthDate || null
    });

    // Troca de senha (a senha atual é conferida no servidor, com BCrypt)
    if (newPwd) {
      await apiService.changePassword(currentPwd, newPwd);
    }

    // Atualiza a sessão mantendo o token de login
    setCurrentUser(Object.assign({}, currentUser, {
      name: name, email: email, phone: phone, sex: sex, birthDate: birthDate
    }));
    updateHeaderByRole();
    await syncFromApi();

    if (currentPwdInput) currentPwdInput.value = '';
    if (newPwdInput) newPwdInput.value = '';
    showToast('Perfil atualizado com sucesso no SQL Server!', 'success');
  } catch (err) {
    showToast(err.message || 'Erro ao atualizar o perfil no servidor.', 'error');
  }
}

// ==========================================
// HISTÓRICO DO PACIENTE
// ==========================================

/**
 * renderPacienteHistorico()
 * Renderiza o histórico de consultas do paciente com filtros e separação
 * entre consultas futuras e passadas.
 */
/**
 * renderTotalGasto()
 * Mostra o total gasto pelo paciente, calculado pela function escalar
 * fn_CalcularTotalGastoPaciente no SQL Server.
 */
async function renderTotalGasto() {
  var user = getCurrentUser();
  var box = document.getElementById('paciente-total-gasto');
  if (!user || !box) return;
  try {
    var resp = await apiService.getTotalGastoPaciente(user.id);
    var total = resp && resp.totalGasto !== undefined ? resp.totalGasto : (resp && resp.total) || 0;
    box.innerHTML = '<strong>Total gasto em consultas:</strong> ' + formatCurrency(Number(total) || 0) +
      ' <span class="info-card-origem">calculado pela function fn_CalcularTotalGastoPaciente (SQL Server)</span>';
  } catch (err) {
    box.innerHTML = '';
  }
}

function renderPacienteHistorico() {
  var currentUser = getCurrentUser();
  if (!currentUser) return;
  renderTotalGasto();

  var allAppointments = getDB('hbsaude_appointments');

  // Filtrar apenas consultas do paciente logado
  var myAppointments = allAppointments.filter(function (app) {
    return app.patientEmail === currentUser.email;
  });

  // Aplicar filtros
  var filterStatus = document.getElementById('hist-filter-status');
  var filterSpecialty = document.getElementById('hist-filter-specialty');

  var statusFilter = filterStatus ? filterStatus.value : '';
  var specialtyFilter = filterSpecialty ? filterSpecialty.value : '';

  if (statusFilter) {
    myAppointments = myAppointments.filter(function (app) {
      return app.status === statusFilter;
    });
  }

  if (specialtyFilter) {
    myAppointments = myAppointments.filter(function (app) {
      return app.specialty === specialtyFilter;
    });
  }

  var dateStartEl = document.getElementById('hist-filter-date-start');
  var dateEndEl = document.getElementById('hist-filter-date-end');
  if (dateStartEl && dateStartEl.value) {
    myAppointments = myAppointments.filter(function (app) { return app.date >= dateStartEl.value; });
  }
  if (dateEndEl && dateEndEl.value) {
    myAppointments = myAppointments.filter(function (app) { return app.date <= dateEndEl.value; });
  }

  // Carregar especialidades no filtro de especialidade (se existir)
  if (filterSpecialty && filterSpecialty.options.length <= 1) {
    var specialties = getDB('hbsaude_specialties');
    specialties.forEach(function (spec) {
      var option = document.createElement('option');
      option.value = spec.name;
      option.textContent = spec.name;
      filterSpecialty.appendChild(option);
    });
  }

  // Separar consultas futuras e passadas
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var futuras = [];
  var passadas = [];

  myAppointments.forEach(function (app) {
    var appDate = new Date(app.date + 'T00:00:00');
    if (appDate >= today) {
      futuras.push(app);
    } else {
      passadas.push(app);
    }
  });

  // Ordenar futuras por data ascendente, passadas por data descendente
  futuras.sort(function (a, b) {
    return new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time);
  });

  passadas.sort(function (a, b) {
    return new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time);
  });

  // Status labels
  var statusLabels = {
    'pendente': 'Pendente',
    'confirmado': 'Confirmado',
    'pago': 'Pago',
    'cancelado': 'Cancelado',
    'concluido': 'Concluído'
  };

  // Renderizar consultas futuras
  var containerFuturas = document.getElementById('historico-futuras-list');
  if (containerFuturas) {
    if (futuras.length === 0) {
      containerFuturas.innerHTML =
        '<div class="empty-state">' +
        '  <h3>Nenhuma consulta futura</h3>' +
        '  <p>Você não possui consultas agendadas para os próximos dias.</p>' +
        '</div>';
    } else {
      containerFuturas.innerHTML = '';
      futuras.forEach(function (app) {
        containerFuturas.innerHTML += buildHistoricoCard(app, statusLabels);
      });
    }
  }

  // Renderizar consultas passadas
  var containerPassadas = document.getElementById('historico-passadas-list');
  if (containerPassadas) {
    if (passadas.length === 0) {
      containerPassadas.innerHTML =
        '<div class="empty-state">' +
        '  <h3>Nenhuma consulta passada</h3>' +
        '  <p>Seu histórico de consultas aparecerá aqui.</p>' +
        '</div>';
    } else {
      containerPassadas.innerHTML = '';
      passadas.forEach(function (app) {
        containerPassadas.innerHTML += buildHistoricoCard(app, statusLabels);
      });
    }
  }
}

/**
 * buildHistoricoCard(app, statusLabels)
 * Gera o HTML de um card de histórico de consulta.
 */
function buildHistoricoCard(app, statusLabels) {
  var formattedDate = formatDateBR(app.date);
  var formattedPrice = formatCurrency(app.price || 0);
  var statusLabel = statusLabels[app.status] || app.status;

  return (
    '<div class="historico-card">' +
    '  <div class="historico-card-header">' +
    '    <span class="historico-specialty">' + app.specialty + '</span>' +
    '    <span class="status-badge status-' + app.status + '">' + statusLabel + '</span>' +
    '  </div>' +
    '  <div class="historico-card-body">' +
    '    <p class="historico-doctor"><strong>Médico:</strong> ' + app.doctorName + '</p>' +
    '    <p class="historico-datetime"><strong>Data:</strong> ' + formattedDate + ' às ' + app.time + '</p>' +
    '    <p class="historico-price"><strong>Valor:</strong> ' + formattedPrice + '</p>' +
    (app.observations ? '<p class="historico-obs"><strong>Observações:</strong> ' + app.observations + '</p>' : '') +
    '  </div>' +
    '</div>'
  );
}
