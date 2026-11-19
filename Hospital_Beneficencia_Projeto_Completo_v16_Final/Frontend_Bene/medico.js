// ==========================================
// medico.js — Módulo do Médico
// HBSaúde v2 — Sistema de Agendamento Médico
// ==========================================

let medicoViewMode = 'day'; // 'day' ou 'week'

/**
 * Inicializa todos os eventos do médico
 */
function initMedico() {
  const filterDate = document.getElementById('med-filter-date');
  const filterStatus = document.getElementById('med-filter-status');
  const btnNovoHorario = document.getElementById('btn-novo-horario');
  const formPerfil = document.getElementById('form-medico-perfil');

  if (filterDate) {
    // Inicializa com a data de hoje
    const today = getLocalDateISO(0);
    filterDate.value = today;
    filterDate.addEventListener('change', renderMedicoConsultas);
  }

  if (filterStatus) {
    filterStatus.addEventListener('change', renderMedicoConsultas);
  }

  // Toggle Dia / Semana
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      medicoViewMode = this.getAttribute('data-view');
      renderMedicoConsultas();
    });
  });

  if (btnNovoHorario) {
    btnNovoHorario.addEventListener('click', openNovoHorarioModal);
  }

  if (formPerfil) {
    formPerfil.addEventListener('submit', handleMedicoPerfilSubmit);
  }
}

/**
 * Renderiza as consultas do médico logado
 */
/**
 * renderMedicoProdutividade()
 * Resumo do médico calculado pela function multi-statement
 * fn_RelatorioProdutividadeMedica no SQL Server.
 */
async function renderMedicoProdutividade() {
  const user = getCurrentUser();
  const box = document.getElementById('medico-produtividade');
  if (!user || !box) return;
  try {
    const rows = await apiService.getProdutividadeMedico(user.id);
    const r = (rows && rows[0]) || null;
    if (!r) { box.innerHTML = ''; return; }
    box.innerHTML = '<strong>Seu resumo:</strong> ' +
      (r.total_agendamentos || 0) + ' agendamentos · ' +
      (r.total_concluidos || 0) + ' concluídos · ' +
      (r.total_cancelados || 0) + ' cancelados · receita ' + formatCurrency(Number(r.receita_gerada) || 0) +
      ' <span class="info-card-origem">calculado pela function fn_RelatorioProdutividadeMedica (SQL Server)</span>';
  } catch (err) {
    box.innerHTML = '';
  }
}

function renderMedicoConsultas() {
  const user = getCurrentUser();
  if (!user || user.role !== 'medico') return;
  renderMedicoProdutividade();

  const container = document.getElementById('medico-consultas-list');
  if (!container) return;

  const filterDateVal = document.getElementById('med-filter-date')?.value || '';
  const filterStatusVal = document.getElementById('med-filter-status')?.value || '';

  const allAppointments = getDB('hbsaude_appointments');
  const allUsers = getDB('hbsaude_users');

  // Filtra as consultas atribuídas a este médico (pelo nome ou id)
  let consultas = allAppointments.filter(app => {
    return app.doctorName === user.name || (user.crm && app.doctorCrm === user.crm);
  });

  // Filtro de data / semana
  if (filterDateVal) {
    if (medicoViewMode === 'day') {
      consultas = consultas.filter(app => app.date === filterDateVal);
    } else {
      // Semana (segunda a domingo da data selecionada)
      const selDate = new Date(filterDateVal + 'T00:00:00');
      const day = selDate.getDay();
      const diffToMonday = selDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(selDate.setDate(diffToMonday));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const mondayStr = monday.toISOString().split('T')[0];
      const sundayStr = sunday.toISOString().split('T')[0];

      consultas = consultas.filter(app => app.date >= mondayStr && app.date <= sundayStr);
    }
  }

  // Filtro de status
  if (filterStatusVal) {
    consultas = consultas.filter(app => app.status === filterStatusVal);
  }

  // Ordenar por data e horário
  consultas.sort((a, b) => (a.date + ' ' + a.time).localeCompare(b.date + ' ' + b.time));

  if (consultas.length === 0) {
    renderEmptyState('medico-consultas-list', 'Nenhuma consulta encontrada', 'Não há atendimentos para os filtros selecionados.');
    return;
  }

  const statusMap = {
    pendente: { label: 'Pendente', class: 'status-pendente' },
    confirmado: { label: 'Confirmado', class: 'status-confirmado' },
    pago: { label: 'Pago', class: 'status-pago' },
    cancelado: { label: 'Cancelado', class: 'status-cancelado' },
    concluido: { label: 'Concluído', class: 'status-concluido' }
  };

  container.innerHTML = consultas.map(app => {
    const paciente = allUsers.find(u => u.email === app.patientEmail);
    const pacienteNome = paciente ? paciente.name : app.patientEmail;
    const pacienteTelefone = paciente?.phone || 'Não informado';
    const statusInfo = statusMap[app.status] || { label: app.status, class: 'status-pendente' };
    const valorFmt = formatCurrency(app.price || 0);
    const dataFmt = formatDateBR(app.date);

    let botoesAcao = '';
    if (app.status === 'pendente') {
      botoesAcao = `
        <button class="btn-sm btn-success" onclick="confirmarConsultaMedico('${app.id}')">Confirmar</button>
        <button class="btn-sm btn-danger" onclick="cancelarConsultaMedico('${app.id}')">Cancelar</button>
      `;
    } else if (app.status === 'confirmado' || app.status === 'pago') {
      botoesAcao = `
        <button class="btn-sm btn-primary" onclick="abrirConcluirConsultaModal('${app.id}')">Concluir Consulta</button>
        <button class="btn-sm btn-danger" onclick="cancelarConsultaMedico('${app.id}')">Cancelar</button>
      `;
    }

    return `
      <div class="appointment-card consulta-medico-card" data-id="${app.id}">
        <div class="appointment-info">
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
            <span class="appointment-specialty">${app.specialty}</span>
            <span class="status-badge ${statusInfo.class}">${statusInfo.label}</span>
          </div>
          <h3 class="appointment-doctor" style="color: var(--primary-color);">Paciente: ${pacienteNome}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">
            📞 ${pacienteTelefone} &nbsp;|&nbsp; 💰 Coparticipação: ${valorFmt}
          </p>
          <div class="appointment-datetime">
            <div class="datetime-item">
              <svg viewBox="0 0 24 24"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>
              <span>${dataFmt}</span>
            </div>
            <div class="datetime-item">
              <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              <span>${app.time}</span>
            </div>
          </div>

          <!-- Campo de Observações Clínicas -->
          <div class="obs-box" style="margin-top: 1rem;">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-dark); display: block; margin-bottom: 0.25rem;">
              Observações Médicas / Prontuário:
            </label>
            <div style="display: flex; gap: 0.5rem;">
              <textarea id="obs-${app.id}" class="form-input form-textarea" rows="2" style="font-size: 0.85rem;" placeholder="Anote observações, sintomas ou prescrições...">${app.observations || ''}</textarea>
              <button class="btn-sm btn-secondary" style="align-self: flex-end;" onclick="salvarObservacoesConsulta('${app.id}')">Salvar</button>
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
          ${botoesAcao}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Confirmar uma consulta agendada no backend
 */
async function confirmarConsultaMedico(appId) {
  try {
    const numericId = parseInt(String(appId).replace(/\D/g, '')) || 1;
    await apiService.updateConsulta(numericId, {
      id: numericId,
      status: 'confirmado'
    });
    await syncFromApi();

    const appointments = getDB('hbsaude_appointments');
    const app = appointments.find(a => a.id === appId);
    if (app) {
      app.status = 'confirmado';
      setDB('hbsaude_appointments', appointments);
    }

    showToast('Consulta confirmada com sucesso no SQL Server!', 'success');
    renderMedicoConsultas();
  } catch (err) {
    showToast(err.message || 'Erro ao confirmar consulta no servidor.', 'error');
  }
}

/**
 * Cancelar consulta com confirmação no servidor
 */
function cancelarConsultaMedico(appId) {
  openConfirmModal(
    'Cancelar Consulta',
    'Tem certeza de que deseja cancelar esta consulta? O paciente será notificado.',
    async () => {
      try {
        const numericId = parseInt(String(appId).replace(/\D/g, '')) || 1;
        await apiService.cancelarConsultaProcedure(numericId, 'Cancelado pelo médico');
        await syncFromApi();

        closeModal();
        showToast('Consulta cancelada no SQL Server.', 'info');
        renderMedicoConsultas();
      } catch (err) {
        closeModal();
        showToast(err.message || 'Erro ao cancelar consulta no servidor.', 'error');
      }
    }
  );
}

/**
 * Salvar observações digitadas no card
 */
async function salvarObservacoesConsulta(appId) {
  const textarea = document.getElementById(`obs-${appId}`);
  if (!textarea) return;

  const obs = textarea.value.trim();
  try {
    const numericId = parseInt(String(appId).replace(/\D/g, '')) || 1;
    await apiService.updateConsulta(numericId, {
      id: numericId,
      observacoes: obs
    });
    await syncFromApi();

    const appointments = getDB('hbsaude_appointments');
    const app = appointments.find(a => a.id === appId);
    if (app) {
      app.observations = obs;
      setDB('hbsaude_appointments', appointments);
    }
    showToast('Observações salvas com sucesso no banco de dados!', 'success');
  } catch (err) {
    showToast(err.message || 'Erro ao salvar observações no servidor.', 'error');
  }
}

/**
 * Modal para Concluir Atendimento
 */
function abrirConcluirConsultaModal(appId) {
  const appointments = getDB('hbsaude_appointments');
  const app = appointments.find(a => a.id === appId);
  if (!app) return;

  const bodyHTML = `
    <div class="form-group">
      <label>Observações Finais do Atendimento / Prescrição:</label>
      <textarea id="modal-concluir-obs" class="form-input form-textarea" rows="4" placeholder="Descreva os procedimentos realizados ou orientações para o paciente...">${app.observations || ''}</textarea>
    </div>
  `;

  openFormModal('Concluir Consulta Médica', bodyHTML, async () => {
    const obs = document.getElementById('modal-concluir-obs')?.value.trim() || '';
    try {
      const numericId = parseInt(String(appId).replace(/\D/g, '')) || 1;
      await apiService.updateConsulta(numericId, {
        id: numericId,
        status: 'concluido',
        observacoes: obs
      });
    await syncFromApi();

      const apps = getDB('hbsaude_appointments');
      const target = apps.find(a => a.id === appId);
      if (target) {
        target.status = 'concluido';
        target.observations = obs;
        setDB('hbsaude_appointments', apps);
      }

      closeModal();
      showToast('Consulta finalizada e concluída no SQL Server!', 'success');
      renderMedicoConsultas();
    } catch (err) {
      showToast(err.message || 'Erro ao concluir consulta no servidor.', 'error');
    }
  });
}

/**
 * ==========================================
 * GESTÃO DA AGENDA DO MÉDICO
 * ==========================================
 */
async function renderMedicoAgenda() {
  const user = getCurrentUser();
  if (!user || user.role !== 'medico') return;

  const tbody = document.querySelector('#medico-agenda-list tbody');
  if (!tbody) return;

  let mySchedules = [];
  try {
    const backendAgendas = await apiService.getAgendas();
    if (Array.isArray(backendAgendas)) {
      mySchedules = backendAgendas.filter(s => s.medico?.id === user.id || s.doctorId === user.id).map(s => ({
        id: s.id,
        doctorId: s.medico?.id || s.doctorId || user.id,
        date: s.data || s.date,
        startTime: (s.hora_inicio || s.startTime || '').substring(0, 5),
        endTime: (s.hora_fim || s.endTime || '').substring(0, 5),
        available: s.disponivel !== false && s.available !== false
      }));
    }
  } catch (err) {
    console.warn('API /agendas falhou, usando base local:', err);
    const schedules = getDB('hbsaude_schedules');
    mySchedules = schedules.filter(s => s.doctorId === user.id);
  }

  // Ordenar por data e horário de início
  mySchedules.sort((a, b) => (a.date + ' ' + a.startTime).localeCompare(b.date + ' ' + b.startTime));

  if (mySchedules.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">
          Nenhum horário cadastrado na sua agenda. Clique em "Novo Horário" para disponibilizar vagas.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = mySchedules.map(s => {
    const dataFmt = formatDateBR(s.date);
    const badgeDisp = s.available !== false
      ? '<span class="status-badge status-pago">Disponível</span>'
      : '<span class="status-badge status-cancelado">Indisponível</span>';

    return `
      <tr>
        <td><strong>${dataFmt}</strong></td>
        <td>${s.startTime}</td>
        <td>${s.endTime}</td>
        <td>${badgeDisp}</td>
        <td>
          <button class="btn-sm btn-secondary" onclick="abrirEditarHorarioModal('${s.id}')">Editar</button>
          <button class="btn-sm btn-danger" onclick="excluirHorarioMedico('${s.id}')">Excluir</button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Modal para adicionar novo horário na agenda
 */
function openNovoHorarioModal() {
  const user = getCurrentUser();
  if (!user) return;

  const bodyHTML = `
    <div class="form-group">
      <label for="agenda-modal-date">Data</label>
      <input type="date" id="agenda-modal-date" class="form-input" required min="${getLocalDateISO(0)}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="agenda-modal-start">Hora Início</label>
        <input type="time" id="agenda-modal-start" class="form-input" value="08:00" required>
      </div>
      <div class="form-group">
        <label for="agenda-modal-end">Hora Fim</label>
        <input type="time" id="agenda-modal-end" class="form-input" value="12:00" required>
      </div>
    </div>
    <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem;">
      <input type="checkbox" id="agenda-modal-available" checked style="width: auto;">
      <label for="agenda-modal-available" style="margin: 0;">Disponível para agendamento</label>
    </div>
  `;

  openFormModal('Novo Horário de Atendimento', bodyHTML, async () => {
    const date = document.getElementById('agenda-modal-date')?.value;
    const startTime = document.getElementById('agenda-modal-start')?.value;
    const endTime = document.getElementById('agenda-modal-end')?.value;
    const available = document.getElementById('agenda-modal-available')?.checked ?? true;

    if (!date || !startTime || !endTime) {
      showToast('Preencha todos os campos obrigatórios.', 'warning');
      return;
    }

    if (startTime >= endTime) {
      showToast('A hora de início deve ser anterior à hora de fim.', 'warning');
      return;
    }

    try {
      await apiService.createAgenda({
        medico: { id: user.id },
        data: date,
        hora_inicio: startTime.length === 5 ? `${startTime}:00` : startTime,
        hora_fim: endTime.length === 5 ? `${endTime}:00` : endTime,
        disponivel: available
      });

      const schedules = getDB('hbsaude_schedules');
      schedules.push({
        id: generateId('sch'),
        doctorId: user.id,
        date,
        startTime,
        endTime,
        available
      });
      setDB('hbsaude_schedules', schedules);

      closeModal();
      showToast('Horário adicionado à agenda no banco de dados!', 'success');
      renderMedicoAgenda();
    } catch (err) {
      showToast(err.message || 'Erro ao salvar horário na agenda.', 'error');
    }
  });
}

/**
 * Modal para editar horário
 */
async function abrirEditarHorarioModal(scheduleId) {
  const user = getCurrentUser();
  let sch = null;
  const numericId = parseInt(String(scheduleId).replace(/\D/g, '')) || 0;

  try {
    if (numericId > 0) {
      const resp = await apiService.request(`/agendas/${numericId}`);
      if (resp) {
        sch = {
          id: resp.id,
          date: resp.data,
          startTime: (resp.hora_inicio || '').substring(0, 5),
          endTime: (resp.hora_fim || '').substring(0, 5),
          available: resp.disponivel !== false
        };
      }
    }
  } catch (e) {
    // fallback se não encontrado
  }

  if (!sch) {
    const schedules = getDB('hbsaude_schedules');
    sch = schedules.find(s => s.id === scheduleId);
  }
  if (!sch) return;

  const bodyHTML = `
    <div class="form-group">
      <label for="agenda-modal-date">Data</label>
      <input type="date" id="agenda-modal-date" class="form-input" value="${sch.date}" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="agenda-modal-start">Hora Início</label>
        <input type="time" id="agenda-modal-start" class="form-input" value="${sch.startTime}" required>
      </div>
      <div class="form-group">
        <label for="agenda-modal-end">Hora Fim</label>
        <input type="time" id="agenda-modal-end" class="form-input" value="${sch.endTime}" required>
      </div>
    </div>
    <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem;">
      <input type="checkbox" id="agenda-modal-available" ${sch.available !== false ? 'checked' : ''} style="width: auto;">
      <label for="agenda-modal-available" style="margin: 0;">Disponível para agendamento</label>
    </div>
  `;

  openFormModal('Editar Horário', bodyHTML, async () => {
    const date = document.getElementById('agenda-modal-date')?.value;
    const startTime = document.getElementById('agenda-modal-start')?.value;
    const endTime = document.getElementById('agenda-modal-end')?.value;
    const available = document.getElementById('agenda-modal-available')?.checked ?? true;

    if (!date || !startTime || !endTime) {
      showToast('Preencha todos os campos.', 'warning');
      return;
    }

    try {
      if (numericId > 0) {
        await apiService.updateAgenda(numericId, {
          id: numericId,
          medico: { id: user?.id || 1 },
          data: date,
          hora_inicio: startTime.length === 5 ? `${startTime}:00` : startTime,
          hora_fim: endTime.length === 5 ? `${endTime}:00` : endTime,
          disponivel: available
        });
      }

      const schedules = getDB('hbsaude_schedules');
      const target = schedules.find(s => s.id === scheduleId);
      if (target) {
        target.date = date;
        target.startTime = startTime;
        target.endTime = endTime;
        target.available = available;
        setDB('hbsaude_schedules', schedules);
      }

      closeModal();
      showToast('Horário atualizado com sucesso no SQL Server!', 'success');
      renderMedicoAgenda();
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar horário.', 'error');
    }
  });
}

/**
 * Excluir horário da agenda
 */
function excluirHorarioMedico(scheduleId) {
  openConfirmModal(
    'Excluir Horário',
    'Tem certeza de que deseja remover este horário da sua agenda?',
    async () => {
      const numericId = parseInt(String(scheduleId).replace(/\D/g, '')) || 0;
      try {
        if (numericId > 0) {
          await apiService.deleteAgenda(numericId);
        }
        let schedules = getDB('hbsaude_schedules');
        schedules = schedules.filter(s => s.id !== scheduleId);
        setDB('hbsaude_schedules', schedules);
        closeModal();
        showToast('Horário removido do sistema.', 'info');
        renderMedicoAgenda();
      } catch (err) {
        showToast(err.message || 'Erro ao excluir horário.', 'error');
      }
    }
  );
}

/**
 * ==========================================
 * PERFIL DO MÉDICO
 * ==========================================
 */
function renderMedicoPerfil() {
  const sessionUser = getCurrentUser();
  if (!sessionUser || sessionUser.role !== 'medico') return;

  const cachedDoc = (getDB('hbsaude_users') || []).find(u => u.role === 'medico' && u.id === sessionUser.id);
  const user = Object.assign({}, cachedDoc || {}, sessionUser, {
    crm: sessionUser.crm || (cachedDoc && cachedDoc.crm) || '',
    consultPrice: sessionUser.consultPrice != null ? sessionUser.consultPrice : (cachedDoc ? cachedDoc.consultPrice : 0),
    description: sessionUser.description || (cachedDoc && cachedDoc.description) || '',
    specialties: (sessionUser.specialties && sessionUser.specialties.length) ? sessionUser.specialties : ((cachedDoc && cachedDoc.specialties) || [])
  });

  const nameInput = document.getElementById('medico-perfil-name');
  const emailInput = document.getElementById('medico-perfil-email');
  const crmInput = document.getElementById('medico-perfil-crm');
  const priceInput = document.getElementById('medico-perfil-price');
  const descInput = document.getElementById('medico-perfil-description');
  const specialtiesContainer = document.getElementById('medico-perfil-specialties');

  if (nameInput) nameInput.value = user.name || '';
  if (emailInput) emailInput.value = user.email || '';
  if (crmInput) crmInput.value = user.crm || '';
  if (priceInput) priceInput.value = user.consultPrice || 0;
  if (descInput) descInput.value = user.description || '';

  // Renderiza tags de especialidades vinculadas
  if (specialtiesContainer) {
    const allSpecialties = getDB('hbsaude_specialties');
    const mySpecIds = user.specialties || [];
    const mySpecs = allSpecialties.filter(s => mySpecIds.includes(s.id));

    if (mySpecs.length === 0) {
      specialtiesContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Nenhuma especialidade associada.</span>';
    } else {
      specialtiesContainer.innerHTML = mySpecs.map(s => `
        <span class="tag-item" style="display: inline-block; background: var(--primary-light); color: var(--primary-color); padding: 0.35rem 0.75rem; border-radius: 50px; font-size: 0.8rem; font-weight: 600; margin-right: 0.5rem; margin-bottom: 0.5rem;">
          ${s.name}
        </span>
      `).join('');
    }
  }
}

/**
 * Salvar alterações no perfil do médico
 */
async function handleMedicoPerfilSubmit(e) {
  e.preventDefault();

  const user = getCurrentUser();
  if (!user) return;

  const name = document.getElementById('medico-perfil-name')?.value.trim() || '';
  const email = document.getElementById('medico-perfil-email')?.value.trim().toLowerCase() || '';
  const crm = document.getElementById('medico-perfil-crm')?.value.trim() || '';
  const price = parseFloat(document.getElementById('medico-perfil-price')?.value) || 0;
  const description = document.getElementById('medico-perfil-description')?.value.trim() || '';

  if (!name || !email || !crm) {
    showToast('Nome, e-mail e CRM são obrigatórios.', 'warning');
    return;
  }

  try {
    await apiService.updateMedico(user.id, {
      nome: name,
      email: email,
      numeroRegistro: crm,
      valorConsulta: price,
      descricao: description
    });

    // Atualiza a sessão mantendo o token de login
    setCurrentUser(Object.assign({}, user, {
      name: name,
      email: email,
      crm: crm,
      consultPrice: price,
      description: description
    }));
    updateHeaderByRole();
    await syncFromApi();

    showToast('Perfil profissional atualizado com sucesso no SQL Server!', 'success');
  } catch (err) {
    showToast(err.message || 'Erro ao atualizar o perfil no servidor.', 'error');
  }
}
