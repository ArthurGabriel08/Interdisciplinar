// ==========================================
// admin.js — Módulo do Administrador
// HBSaúde v2 — Sistema de Agendamento Médico
// ==========================================

let currentAdminPanel = 'admin-panel-especialidades';

/**
 * Inicializa os eventos do painel administrativo
 */
function initAdmin() {
  // Navegação da sidebar
  document.querySelectorAll('.admin-sidebar-item').forEach(item => {
    item.addEventListener('click', function () {
      const panelId = this.getAttribute('data-panel');
      if (panelId) {
        switchAdminPanel(panelId);
      }
    });
  });

  // Botões "Novo"
  document.getElementById('btn-new-especialidade')?.addEventListener('click', openNovaEspecialidadeModal);
  document.getElementById('btn-new-medico')?.addEventListener('click', openNovoMedicoModal);
  document.getElementById('btn-new-paciente')?.addEventListener('click', openNovoPacienteModal);
  document.getElementById('btn-new-agenda')?.addEventListener('click', openNovaAgendaAdminModal);
  document.getElementById('btn-new-consulta')?.addEventListener('click', openNovaConsultaAdminModal);
  document.getElementById('btn-new-pagamento')?.addEventListener('click', openNovoPagamentoAdminModal);

  // Buscas em tempo real
  setupAdminSearch('search-especialidades', renderAdminEspecialidades);
  setupAdminSearch('search-medicos', renderAdminMedicos);
  setupAdminSearch('search-pacientes', renderAdminPacientes);
  setupAdminSearch('search-agenda', renderAdminAgenda);
  setupAdminSearch('search-consultas', renderAdminConsultas);
  setupAdminSearch('search-pagamentos', renderAdminPagamentos);
  setupAdminSearch('search-rel-consultas', renderRelConsultas);
  setupAdminSearch('search-rel-faturamento', renderRelFaturamento);
  setupAdminSearch('search-rel-agenda', renderRelAgenda);

  const btnPeriodo = document.getElementById('btn-rel-periodo');
  if (btnPeriodo) btnPeriodo.addEventListener('click', renderRelPeriodo);

  const btnDiario = document.getElementById('btn-rel-diario');
  if (btnDiario) btnDiario.addEventListener('click', renderRelDiario);
}

function setupAdminSearch(inputId, renderFn) {
  const el = document.getElementById(inputId);
  if (el) {
    el.addEventListener('input', () => renderFn());
  }
}

/**
 * Alterna entre sub-painéis administrativos
 */
function switchAdminPanel(panelId) {
  currentAdminPanel = panelId;

  // Atualiza sidebar
  document.querySelectorAll('.admin-sidebar-item').forEach(btn => {
    if (btn.getAttribute('data-panel') === panelId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Alterna visibilidade dos painéis
  document.querySelectorAll('.admin-panel').forEach(panel => {
    if (panel.id === panelId) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  renderAdminPanel(panelId);
}

/**
 * Renderiza o painel ativo
 */
function renderAdminPanel(panelId) {
  switch (panelId) {
    case 'admin-panel-especialidades': renderAdminEspecialidades(); break;
    case 'admin-panel-medicos': renderAdminMedicos(); break;
    case 'admin-panel-pacientes': renderAdminPacientes(); break;
    case 'admin-panel-agenda': renderAdminAgenda(); break;
    case 'admin-panel-consultas': renderAdminConsultas(); break;
    case 'admin-panel-pagamentos': renderAdminPagamentos(); break;
    case 'admin-panel-rel-consultas': renderRelConsultas(); break;
    case 'admin-panel-rel-faturamento': renderRelFaturamento(); break;
    case 'admin-panel-rel-agenda': renderRelAgenda(); break;
    case 'admin-panel-rel-periodo': renderRelPeriodo(); break;
    case 'admin-panel-rel-diario': renderRelDiario(); break;
  }
}

/**
 * ==========================================
 * 1. CRUD: ESPECIALIDADES
 * ==========================================
 */
async function renderAdminEspecialidades() {
  const container = document.getElementById('crud-especialidades-body');
  if (!container) return;

  renderLoading(container);
  try {
    const rawItems = await apiService.getEspecialidades();
    let items = (rawItems || []).map(e => ({
      id: e.id,
      name: e.descricao || e.nome || '',
      description: e.descricao || e.nome || ''
    }));

    // Sincroniza cache local
    setDB('hbsaude_specialties', items);

    const search = document.getElementById('search-especialidades')?.value.toLowerCase() || '';
    if (search) {
      items = items.filter(e => e.name.toLowerCase().includes(search) || (e.description || '').toLowerCase().includes(search));
    }

    const columns = [
      { key: 'name', label: 'Nome da Especialidade' },
      { key: 'description', label: 'Descrição' }
    ];

    const actions = [
      {
        label: 'Editar',
        className: 'btn-sm btn-secondary',
        onClick: (item) => openEditarEspecialidadeModal(item.id)
      },
      {
        label: 'Excluir',
        className: 'btn-sm btn-danger',
        onClick: (item) => excluirEspecialidadeAdmin(item.id)
      }
    ];

    renderCrudTable('crud-especialidades-body', columns, items, actions);
  } catch (err) {
    showToast(err.message, 'error');
    container.innerHTML = `<div class="empty-state"><p class="text-danger">${err.message}</p></div>`;
  }
}

function openNovaEspecialidadeModal() {
  const bodyHTML = `
    <div class="form-group">
      <label for="esp-name">Nome da Especialidade</label>
      <input type="text" id="esp-name" class="form-input" placeholder="Ex: Neurologia" required>
    </div>
    <div class="form-group">
      <label for="esp-desc">Descrição</label>
      <textarea id="esp-desc" class="form-input form-textarea" rows="3" placeholder="Breve resumo da área..."></textarea>
    </div>
  `;

  openFormModal('Nova Especialidade Médica', bodyHTML, async () => {
    const name = document.getElementById('esp-name')?.value.trim();
    const desc = document.getElementById('esp-desc')?.value.trim();

    if (!name) {
      showToast('O nome da especialidade é obrigatório.', 'warning');
      return;
    }

    try {
      await apiService.createEspecialidade({ descricao: name });
      closeModal();
      showToast('Especialidade cadastrada com sucesso no SQL Server!', 'success');
      renderAdminEspecialidades();
    } catch (err) {
      showToast(err.message || 'Erro ao salvar no servidor.', 'error');
    }
  });
}

function openEditarEspecialidadeModal(id) {
  const items = getDB('hbsaude_specialties');
  const esp = items.find(e => e.id == id);
  if (!esp) return;

  const bodyHTML = `
    <div class="form-group">
      <label for="esp-name">Nome da Especialidade</label>
      <input type="text" id="esp-name" class="form-input" value="${esp.name}" required>
    </div>
    <div class="form-group">
      <label for="esp-desc">Descrição</label>
      <textarea id="esp-desc" class="form-input form-textarea" rows="3">${esp.description || ''}</textarea>
    </div>
  `;

  openFormModal('Editar Especialidade', bodyHTML, async () => {
    const name = document.getElementById('esp-name')?.value.trim();
    const desc = document.getElementById('esp-desc')?.value.trim();

    if (!name) {
      showToast('O nome é obrigatório.', 'warning');
      return;
    }

    try {
      const numericId = parseInt(String(id).replace(/\D/g, '')) || id;
      await apiService.updateEspecialidade(numericId, { id: numericId, descricao: name });
      closeModal();
      showToast('Especialidade atualizada com sucesso no banco!', 'success');
      renderAdminEspecialidades();
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar no servidor.', 'error');
    }
  });
}

function excluirEspecialidadeAdmin(id) {
  // REGRA DE VALIDAÇÃO CRÍTICA DO RELATÓRIO:
  // Não pode excluir especialidade com médicos vinculados
  const users = getDB('hbsaude_users');
  const medicosVinculados = users.filter(u => u.role === 'medico' && Array.isArray(u.specialties) && u.specialties.includes(id));

  if (medicosVinculados.length > 0) {
    showToast(`Não é possível excluir: existem médicos vinculados a esta especialidade (${medicosVinculados.length} médico(s)).`, 'error');
    return;
  }

  openConfirmModal(
    'Excluir Especialidade',
    'Tem certeza de que deseja excluir esta especialidade do SQL Server?',
    async () => {
      try {
        const numericId = parseInt(String(id).replace(/\D/g, '')) || id;
        await apiService.deleteEspecialidade(numericId);
        closeModal();
        showToast('Especialidade excluída com sucesso do banco.', 'success');
        renderAdminEspecialidades();
      } catch (err) {
        closeModal();
        showToast(err.message || 'Erro ao excluir especialidade no servidor.', 'error');
      }
    }
  );
}

/**
 * ==========================================
 * 2. CRUD: MÉDICOS (N x N com Especialidades)
 * ==========================================
 */
async function renderAdminMedicos() {
  const container = document.getElementById('crud-medicos-body');
  if (!container) return;

  renderLoading(container);
  try {
    const [rawMedicos, rawSpecialties] = await Promise.all([
      apiService.getMedicos().catch(() => []),
      apiService.getEspecialidades().catch(() => [])
    ]);

    const specialties = (rawSpecialties || []).map(s => ({
      id: s.id,
      name: s.descricao || s.nome || ''
    }));

    let medicos = (rawMedicos || []).map(m => ({
      id: m.id,
      name: m.nome || m.name,
      crm: m.numeroRegistro || m.crm || '',
      email: m.email,
      phone: m.telefone || m.phone || '',
      consultPrice: m.valorConsulta || m.consultPrice || 250,
      shift: m.turno || m.shift || 'morning',
      description: m.descricao || m.description || '',
      specialties: Array.isArray(m.especialidades) ? m.especialidades.map(e => e.id || e) : (m.specialties || [])
    }));

    const search = document.getElementById('search-medicos')?.value.toLowerCase() || '';
    if (search) {
      medicos = medicos.filter(m =>
        m.name.toLowerCase().includes(search) ||
        (m.crm || '').toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search)
      );
    }

    const columns = [
      { key: 'name', label: 'Nome do Médico' },
      { key: 'crm', label: 'CRM' },
      { key: 'email', label: 'E-mail' },
      {
        key: 'specialties',
        label: 'Especialidades',
        format: (val) => {
          if (!Array.isArray(val) || val.length === 0) return '—';
          return val.map(id => specialties.find(s => s.id == id)?.name || id).join(', ');
        }
      },
      {
        key: 'consultPrice',
        label: 'Valor',
        format: (val) => formatCurrency(val || 0)
      },
      {
        key: 'shift',
        label: 'Turno',
        format: (val) => val === 'morning' ? 'Manhã' : 'Tarde'
      }
    ];

    const actions = [
      {
        label: 'Editar',
        className: 'btn-sm btn-secondary',
        onClick: (item) => openEditarMedicoModal(item.id)
      },
      {
        label: 'Excluir',
        className: 'btn-sm btn-danger',
        onClick: (item) => excluirMedicoAdmin(item.id)
      }
    ];

    renderCrudTable('crud-medicos-body', columns, medicos, actions);
  } catch (err) {
    showToast(err.message, 'error');
    container.innerHTML = `<div class="empty-state"><p class="text-danger">${err.message}</p></div>`;
  }
}

async function openNovoMedicoModal() {
  const rawSpecialties = await apiService.getEspecialidades().catch(() => []);
  const specialties = (rawSpecialties || []).map(s => ({
    id: s.id,
    name: s.descricao || s.nome || ''
  }));

  const checkboxesHTML = specialties.map(s => `
    <label style="display: inline-flex; align-items: center; gap: 0.35rem; margin-right: 1rem; margin-bottom: 0.35rem; font-weight: normal; font-size: 0.85rem;">
      <input type="checkbox" name="med-specs" value="${s.id}" style="width: auto;">
      ${s.name}
    </label>
  `).join('');

  const bodyHTML = `
    <div class="form-row">
      <div class="form-group">
        <label>Nome Completo</label>
        <input type="text" id="adm-med-name" class="form-input" placeholder="Ex: Dr. Carlos Abreu" required>
      </div>
      <div class="form-group">
        <label>CRM</label>
        <input type="text" id="adm-med-crm" class="form-input" placeholder="CRM 12345-SP" required>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>E-mail</label>
        <input type="email" id="adm-med-email" class="form-input" placeholder="medico@beneficencia.com.br" required>
      </div>
      <div class="form-group">
        <label>Telefone</label>
        <input type="text" id="adm-med-phone" class="form-input" placeholder="(17) 99999-0000">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>CPF</label>
        <input type="text" id="adm-med-cpf" class="form-input" placeholder="000.000.000-00">
      </div>
      <div class="form-group">
        <label>Senha de Acesso</label>
        <input type="password" id="adm-med-pass" class="form-input" placeholder="Mínimo 6 caracteres" required>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Valor da Consulta (R$)</label>
        <input type="number" id="adm-med-price" class="form-input" value="250.00" step="0.01">
      </div>
      <div class="form-group">
        <label>Turno Padrão</label>
        <select id="adm-med-shift" class="form-input">
          <option value="morning">Manhã (08h às 12h)</option>
          <option value="afternoon">Tarde (13h às 17h)</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Especialidades Atendidas (N x N)</label>
      <div style="background: #f8fafc; padding: 0.75rem; border-radius: var(--radius-sm); border: 1.5px solid var(--border-color); max-height: 120px; overflow-y: auto;">
        ${checkboxesHTML || '<p style="color:var(--text-muted);font-size:0.85rem;">Cadastre especialidades primeiro.</p>'}
      </div>
    </div>
    <div class="form-group">
      <label>Bio / Descrição</label>
      <textarea id="adm-med-desc" class="form-input form-textarea" rows="2" placeholder="Formação e experiência..."></textarea>
    </div>
  `;

  openFormModal('Cadastrar Novo Médico', bodyHTML, async () => {
    const name = document.getElementById('adm-med-name')?.value.trim();
    const crm = document.getElementById('adm-med-crm')?.value.trim();
    const email = document.getElementById('adm-med-email')?.value.trim().toLowerCase();
    const phone = document.getElementById('adm-med-phone')?.value.trim();
    const cpf = document.getElementById('adm-med-cpf')?.value.trim();
    const password = document.getElementById('adm-med-pass')?.value;
    const price = parseFloat(document.getElementById('adm-med-price')?.value) || 250;
    const shift = document.getElementById('adm-med-shift')?.value || 'morning';
    const desc = document.getElementById('adm-med-desc')?.value.trim() || '';

    const selectedSpecs = Array.from(document.querySelectorAll('input[name="med-specs"]:checked')).map(cb => ({ id: parseInt(cb.value) }));

    if (!name || !crm || !email || !password) {
      showToast('Nome, CRM, E-mail e Senha são obrigatórios.', 'warning');
      return;
    }

    try {
      await apiService.createMedico({
        nome: name,
        numeroRegistro: crm,
        email: email,
        telefone: phone,
        cpf: cpf.replace(/\D/g, ''),
        senha: password,
        perfil: 'MEDICO',
        valorConsulta: price,
        turno: shift,
        descricao: desc,
        especialidades: selectedSpecs
      });

      closeModal();
      showToast('Médico cadastrado com sucesso no SQL Server!', 'success');
      renderAdminMedicos();
    } catch (err) {
      showToast(err.message || 'Erro ao salvar médico no servidor.', 'error');
    }
  });

  const cpfEl = document.getElementById('adm-med-cpf');
  if (cpfEl) maskCPF(cpfEl);
  const phoneEl = document.getElementById('adm-med-phone');
  if (phoneEl) maskPhone(phoneEl);
}

async function openEditarMedicoModal(id) {
  const [rawMedicos, rawSpecialties] = await Promise.all([
    apiService.getMedicos().catch(() => []),
    apiService.getEspecialidades().catch(() => [])
  ]);
  const med = (rawMedicos || []).find(u => u.id == id);
  if (!med) return;

  const specialties = (rawSpecialties || []).map(s => ({
    id: s.id,
    name: s.descricao || s.nome || ''
  }));
  const mySpecs = Array.isArray(med.especialidades) ? med.especialidades.map(e => e.id) : [];

  const checkboxesHTML = specialties.map(s => `
    <label style="display: inline-flex; align-items: center; gap: 0.35rem; margin-right: 1rem; margin-bottom: 0.35rem; font-weight: normal; font-size: 0.85rem;">
      <input type="checkbox" name="med-specs" value="${s.id}" ${mySpecs.includes(s.id) ? 'checked' : ''} style="width: auto;">
      ${s.name}
    </label>
  `).join('');

  const bodyHTML = `
    <div class="form-row">
      <div class="form-group">
        <label>Nome Completo</label>
        <input type="text" id="adm-med-name" class="form-input" value="${med.nome || med.name}" required>
      </div>
      <div class="form-group">
        <label>CRM</label>
        <input type="text" id="adm-med-crm" class="form-input" value="${med.numeroRegistro || med.crm || ''}" required>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>E-mail</label>
        <input type="email" id="adm-med-email" class="form-input" value="${med.email}" required>
      </div>
      <div class="form-group">
        <label>Telefone</label>
        <input type="text" id="adm-med-phone" class="form-input" value="${med.telefone || med.phone || ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Valor da Consulta (R$)</label>
        <input type="number" id="adm-med-price" class="form-input" value="${med.valorConsulta || med.consultPrice || 0}" step="0.01">
      </div>
      <div class="form-group">
        <label>Turno Padrão</label>
        <select id="adm-med-shift" class="form-input">
          <option value="morning" ${(med.turno || med.shift) === 'morning' ? 'selected' : ''}>Manhã</option>
          <option value="afternoon" ${(med.turno || med.shift) === 'afternoon' ? 'selected' : ''}>Tarde</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Especialidades Atendidas (N x N)</label>
      <div style="background: #f8fafc; padding: 0.75rem; border-radius: var(--radius-sm); border: 1.5px solid var(--border-color); max-height: 120px; overflow-y: auto;">
        ${checkboxesHTML}
      </div>
    </div>
    <div class="form-group">
      <label>Bio / Descrição</label>
      <textarea id="adm-med-desc" class="form-input form-textarea" rows="2">${med.descricao || med.description || ''}</textarea>
    </div>
  `;

  setTimeout(() => { const p = document.getElementById('adm-med-phone'); if (p) maskPhone(p); }, 0);
  openFormModal('Editar Médico', bodyHTML, async () => {
    const name = document.getElementById('adm-med-name')?.value.trim();
    const crm = document.getElementById('adm-med-crm')?.value.trim();
    const email = document.getElementById('adm-med-email')?.value.trim().toLowerCase();
    const phone = document.getElementById('adm-med-phone')?.value.trim();
    const price = parseFloat(document.getElementById('adm-med-price')?.value) || 0;
    const shift = document.getElementById('adm-med-shift')?.value || 'morning';
    const desc = document.getElementById('adm-med-desc')?.value.trim() || '';

    const selectedSpecs = Array.from(document.querySelectorAll('input[name="med-specs"]:checked')).map(cb => ({ id: parseInt(cb.value) }));

    if (!name || !crm || !email) {
      showToast('Nome, CRM e E-mail são obrigatórios.', 'warning');
      return;
    }

    try {
      const numericId = parseInt(String(id).replace(/\D/g, '')) || id;
      await apiService.updateMedico(numericId, {
        id: numericId,
        nome: name,
        numeroRegistro: crm,
        email: email,
        telefone: phone,
        valorConsulta: price,
        turno: shift,
        descricao: desc,
        especialidades: selectedSpecs
      });

      closeModal();
      showToast('Dados do médico atualizados no SQL Server!', 'success');
      renderAdminMedicos();
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar no servidor.', 'error');
    }
  });
}

function excluirMedicoAdmin(id) {
  openConfirmModal(
    'Excluir Médico',
    'Tem certeza de que deseja remover este médico do sistema? Seus agendamentos históricos serão mantidos.',
    async () => {
      try {
        const numericId = parseInt(String(id).replace(/\D/g, '')) || id;
        await apiService.deleteMedico(numericId);
        closeModal();
        showToast('Médico removido com sucesso.', 'info');
        renderAdminMedicos();
      } catch (err) {
        closeModal();
        showToast(err.message || 'Erro ao excluir médico no servidor.', 'error');
      }
    }
  );
}

/**
 * ==========================================
 * 3. CRUD: PACIENTES
 * ==========================================
 */
async function renderAdminPacientes() {
  const container = document.getElementById('crud-pacientes-body');
  if (!container) return;

  renderLoading(container);
  try {
    const rawPacientes = await apiService.getPacientes();
    let pacientes = (rawPacientes || []).map(p => ({
      id: p.id,
      name: p.nome || p.name,
      cpf: p.cpf || '',
      email: p.email,
      phone: p.telefone || p.phone || '',
      sex: p.sexo || p.sex || '—',
      birthDate: p.dataNascimento || p.birthDate || ''
    }));

    const search = document.getElementById('search-pacientes')?.value.toLowerCase() || '';
    if (search) {
      pacientes = pacientes.filter(p =>
        p.name.toLowerCase().includes(search) ||
        (p.cpf || '').includes(search) ||
        p.email.toLowerCase().includes(search)
      );
    }

    const columns = [
      { key: 'name', label: 'Nome Completo' },
      {
        key: 'cpf',
        label: 'CPF',
        format: (val) => {
          if (!val) return '—';
          const c = val.replace(/\D/g, '');
          return c.length === 11 ? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : val;
        }
      },
      { key: 'email', label: 'E-mail' },
      { key: 'phone', label: 'Telefone' },
      { key: 'sex', label: 'Sexo' }
    ];

    const actions = [
      {
        label: 'Editar',
        className: 'btn-sm btn-secondary',
        onClick: (item) => openEditarPacienteModal(item.id)
      },
      {
        label: 'Excluir',
        className: 'btn-sm btn-danger',
        onClick: (item) => excluirPacienteAdmin(item.id)
      }
    ];

    renderCrudTable('crud-pacientes-body', columns, pacientes, actions);
  } catch (err) {
    showToast(err.message, 'error');
    container.innerHTML = `<div class="empty-state"><p class="text-danger">${err.message}</p></div>`;
  }
}

function openNovoPacienteModal() {
  const bodyHTML = `
    <div class="form-group">
      <label>Nome Completo</label>
      <input type="text" id="adm-pac-name" class="form-input" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>E-mail</label>
        <input type="email" id="adm-pac-email" class="form-input" required>
      </div>
      <div class="form-group">
        <label>Telefone</label>
        <input type="text" id="adm-pac-phone" class="form-input" placeholder="(00) 00000-0000">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>CPF</label>
        <input type="text" id="adm-pac-cpf" class="form-input" placeholder="000.000.000-00" required>
      </div>
      <div class="form-group">
        <label>Sexo</label>
        <select id="adm-pac-sex" class="form-input">
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
          <option value="O">Outro</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Data de Nascimento</label>
        <input type="date" id="adm-pac-birth" class="form-input" required>
      </div>
      <div class="form-group">
        <label>Senha Provisória</label>
        <input type="password" id="adm-pac-pass" class="form-input" value="123456" required>
      </div>
    </div>
  `;

  openFormModal('Cadastrar Paciente', bodyHTML, async () => {
    const name = document.getElementById('adm-pac-name')?.value.trim();
    const email = document.getElementById('adm-pac-email')?.value.trim().toLowerCase();
    const phone = document.getElementById('adm-pac-phone')?.value.trim();
    const cpf = document.getElementById('adm-pac-cpf')?.value.trim();
    const sex = document.getElementById('adm-pac-sex')?.value;
    const birthDate = document.getElementById('adm-pac-birth')?.value;
    const password = document.getElementById('adm-pac-pass')?.value;

    if (!name || !email || !cpf || !birthDate) {
      showToast('Preencha todos os campos obrigatórios.', 'warning');
      return;
    }

    if (!validateCPF(cpf)) {
      showToast('CPF inválido.', 'error');
      return;
    }

    try {
      await apiService.register({
        nome: name,
        email: email,
        telefone: phone,
        cpf: cpf.replace(/\D/g, ''),
        sexo: sex,
        dataNascimento: birthDate,
        senha: password
      });

      closeModal();
      showToast('Paciente cadastrado com sucesso no SQL Server!', 'success');
      renderAdminPacientes();
    } catch (err) {
      showToast(err.message || 'Erro ao cadastrar paciente no servidor.', 'error');
    }
  });

  const cpfEl = document.getElementById('adm-pac-cpf');
  if (cpfEl) maskCPF(cpfEl);
  const phoneEl = document.getElementById('adm-pac-phone');
  if (phoneEl) maskPhone(phoneEl);
}

async function openEditarPacienteModal(id) {
  const rawPacientes = await apiService.getPacientes().catch(() => []);
  const pac = (rawPacientes || []).find(u => u.id == id);
  if (!pac) return;

  const bodyHTML = `
    <div class="form-group">
      <label>Nome Completo</label>
      <input type="text" id="adm-pac-name" class="form-input" value="${pac.nome || pac.name}" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>E-mail</label>
        <input type="email" id="adm-pac-email" class="form-input" value="${pac.email}" required>
      </div>
      <div class="form-group">
        <label>Telefone</label>
        <input type="text" id="adm-pac-phone" class="form-input" value="${pac.telefone || pac.phone || ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Sexo</label>
        <select id="adm-pac-sex" class="form-input">
          <option value="M" ${(pac.sexo || pac.sex) === 'M' || (pac.sexo || pac.sex) === 'Masculino' ? 'selected' : ''}>Masculino</option>
          <option value="F" ${(pac.sexo || pac.sex) === 'F' || (pac.sexo || pac.sex) === 'Feminino' ? 'selected' : ''}>Feminino</option>
          <option value="O" ${(pac.sexo || pac.sex) === 'O' || (pac.sexo || pac.sex) === 'Outro' ? 'selected' : ''}>Outro</option>
        </select>
      </div>
      <div class="form-group">
        <label>Data de Nascimento</label>
        <input type="date" id="adm-pac-birth" class="form-input" value="${pac.dataNascimento || pac.birthDate || ''}">
      </div>
    </div>
  `;

  setTimeout(() => { const p = document.getElementById('adm-pac-phone'); if (p) maskPhone(p); }, 0);
  openFormModal('Editar Paciente', bodyHTML, async () => {
    const name = document.getElementById('adm-pac-name')?.value.trim();
    const email = document.getElementById('adm-pac-email')?.value.trim().toLowerCase();
    const phone = document.getElementById('adm-pac-phone')?.value.trim();
    const sex = document.getElementById('adm-pac-sex')?.value;
    const birthDate = document.getElementById('adm-pac-birth')?.value;

    if (!name || !email) {
      showToast('Nome e e-mail são obrigatórios.', 'warning');
      return;
    }

    try {
      const numericId = parseInt(String(id).replace(/\D/g, '')) || id;
      await apiService.updatePaciente(numericId, {
        id: numericId,
        nome: name,
        email: email,
        telefone: phone,
        sexo: sex,
        dataNascimento: birthDate
      });

      closeModal();
      showToast('Dados do paciente atualizados no SQL Server!', 'success');
      renderAdminPacientes();
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar paciente no servidor.', 'error');
    }
  });
}

function excluirPacienteAdmin(id) {
  openConfirmModal(
    'Excluir Paciente',
    'Tem certeza de que deseja excluir este paciente? Esta ação não pode ser desfeita.',
    async () => {
      try {
        const numericId = parseInt(String(id).replace(/\D/g, '')) || id;
        await apiService.deletePaciente(numericId);
        closeModal();
        showToast('Paciente excluído com sucesso do SQL Server.', 'info');
        renderAdminPacientes();
      } catch (err) {
        closeModal();
        showToast(err.message || 'Não é possível excluir: o paciente possui consultas registradas no histórico.', 'error');
      }
    }
  );
}

/**
 * ==========================================
 * 4. CRUD: AGENDA GERAL
 * ==========================================
 */
async function renderAdminAgenda() {
  const container = document.getElementById('crud-agenda-body');
  if (!container) return;

  renderLoading(container);
  try {
    const rawSchedules = await apiService.getAgendas().catch(() => []);
    let items = (rawSchedules || []).map(s => ({
      id: s.id,
      doctorId: s.medico?.id,
      doctorName: s.medico?.nome || 'Médico',
      date: s.data || '',
      startTime: s.hora_inicio || s.startTime || '',
      endTime: s.hora_fim || s.endTime || '',
      available: s.disponivel !== false
    }));

    const search = document.getElementById('search-agenda')?.value.toLowerCase() || '';
    if (search) {
      items = items.filter(s =>
        s.doctorName.toLowerCase().includes(search) ||
        s.date.includes(search)
      );
    }

    items.sort((a, b) => (a.date + ' ' + a.startTime).localeCompare(b.date + ' ' + b.startTime));

    const columns = [
      { key: 'doctorName', label: 'Médico' },
      { key: 'date', label: 'Data', format: (val) => formatDateBR(val) },
      { key: 'startTime', label: 'Início' },
      { key: 'endTime', label: 'Fim' },
      {
        key: 'available',
        label: 'Status',
        format: (val) => val !== false
          ? '<span class="status-badge status-pago">Disponível</span>'
          : '<span class="status-badge status-cancelado">Indisponível</span>'
      }
    ];

    const actions = [
      {
        label: 'Excluir',
        className: 'btn-sm btn-danger',
        onClick: (item) => {
          openConfirmModal('Excluir Horário', 'Deseja remover este horário da agenda no SQL Server?', async () => {
            try {
              const numericId = parseInt(String(item.id).replace(/\D/g, '')) || item.id;
              await apiService.deleteAgenda(numericId);
              closeModal();
              showToast('Horário removido com sucesso.', 'info');
              renderAdminAgenda();
            } catch (err) {
              closeModal();
              showToast(err.message || 'Erro ao excluir horário no servidor.', 'error');
            }
          });
        }
      }
    ];

    renderCrudTable('crud-agenda-body', columns, items, actions);
  } catch (err) {
    showToast(err.message, 'error');
    container.innerHTML = `<div class="empty-state"><p class="text-danger">${err.message}</p></div>`;
  }
}

async function openNovaAgendaAdminModal() {
  const rawDocs = await apiService.getMedicos().catch(() => []);
  const docOptions = (rawDocs || []).map(d => `<option value="${d.id}">${d.nome || d.name} (${d.numeroRegistro || d.crm || 'CRM'})</option>`).join('');

  const bodyHTML = `
    <div class="form-group">
      <label>Selecione o Médico</label>
      <select id="adm-sch-doc" class="form-input" required>
        ${docOptions || '<option value="2">Dr. Henrique Barros</option>'}
      </select>
    </div>
    <div class="form-group">
      <label>Data</label>
      <input type="date" id="adm-sch-date" class="form-input" required min="${getLocalDateISO(0)}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Início</label>
        <input type="time" id="adm-sch-start" class="form-input" value="08:00" required>
      </div>
      <div class="form-group">
        <label>Fim</label>
        <input type="time" id="adm-sch-end" class="form-input" value="12:00" required>
      </div>
    </div>
  `;

  openFormModal('Adicionar Horário na Agenda', bodyHTML, async () => {
    const doctorId = document.getElementById('adm-sch-doc')?.value;
    const date = document.getElementById('adm-sch-date')?.value;
    const startTime = document.getElementById('adm-sch-start')?.value;
    const endTime = document.getElementById('adm-sch-end')?.value;

    if (!doctorId || !date || !startTime || !endTime) {
      showToast('Preencha todos os campos.', 'warning');
      return;
    }

    try {
      await apiService.createAgenda({
        data: date,
        hora_inicio: startTime + ':00',
        hora_fim: endTime + ':00',
        disponivel: true,
        medico: { id: parseInt(doctorId) }
      });

      closeModal();
      showToast('Horário cadastrado na agenda no SQL Server!', 'success');
      renderAdminAgenda();
    } catch (err) {
      showToast(err.message || 'Erro ao cadastrar horário no servidor.', 'error');
    }
  });
}

/**
 * ==========================================
 * 5. CRUD: CONSULTAS
 * ==========================================
 */
async function renderAdminConsultas() {
  const container = document.getElementById('crud-consultas-body');
  if (!container) return;

  renderLoading(container);
  try {
    const rawConsultas = await apiService.getConsultas().catch(() => []);
    let items = (rawConsultas || []).map(a => {
      const dtParts = (a.data_hora || '').split('T');
      return {
        id: a.id,
        patientName: a.pacienteNome || a.paciente?.nome || 'Paciente',
        doctorName: a.medicoNome || a.medico?.nome || 'Médico',
        specialty: a.medico?.especialidades?.map(e => e.descricao || e.nome).join(', ') || 'Clínica Geral',
        date: dtParts[0] || '',
        time: dtParts[1] ? dtParts[1].substring(0, 5) : '',
        status: (a.status || 'pendente').toLowerCase(),
        price: a.valor || 250,
        observations: a.observacoes || ''
      };
    });

    const search = document.getElementById('search-consultas')?.value.toLowerCase() || '';
    if (search) {
      items = items.filter(a =>
        a.patientName.toLowerCase().includes(search) ||
        a.doctorName.toLowerCase().includes(search) ||
        a.specialty.toLowerCase().includes(search) ||
        a.status.toLowerCase().includes(search)
      );
    }

    items.sort((a, b) => (b.date + ' ' + b.time).localeCompare(a.date + ' ' + a.time));

    const statusMap = {
      pendente: 'status-pendente',
      confirmado: 'status-confirmado',
      pago: 'status-pago',
      cancelado: 'status-cancelado',
      concluido: 'status-concluido'
    };

    const columns = [
      { key: 'patientName', label: 'Paciente' },
      { key: 'doctorName', label: 'Médico' },
      { key: 'specialty', label: 'Especialidade' },
      { key: 'date', label: 'Data', format: (val) => formatDateBR(val) },
      { key: 'time', label: 'Horário' },
      {
        key: 'status',
        label: 'Status',
        format: (val) => `<span class="status-badge ${statusMap[val] || 'status-pendente'}">${val.toUpperCase()}</span>`
      },
      { key: 'price', label: 'Valor', format: (val) => formatCurrency(val || 0) }
    ];

    const actions = [
      {
        label: 'Editar Status',
        className: 'btn-sm btn-secondary',
        onClick: (item) => openEditarConsultaAdminModal(item.id)
      },
      {
        label: 'Excluir',
        className: 'btn-sm btn-danger',
        onClick: (item) => {
          openConfirmModal('Excluir Consulta', 'Deseja realmente excluir esta consulta do SQL Server?', async () => {
            try {
              const numericId = parseInt(String(item.id).replace(/\D/g, '')) || item.id;
              await apiService.deleteConsulta(numericId);
              closeModal();
              showToast('Consulta excluída com sucesso.', 'info');
              renderAdminConsultas();
            } catch (err) {
              closeModal();
              showToast(err.message || 'Erro ao excluir consulta no servidor.', 'error');
            }
          });
        }
      }
    ];

    renderCrudTable('crud-consultas-body', columns, items, actions);
  } catch (err) {
    showToast(err.message, 'error');
    container.innerHTML = `<div class="empty-state"><p class="text-danger">${err.message}</p></div>`;
  }
}

async function openNovaConsultaAdminModal() {
  const [pacs, docs, specs] = await Promise.all([
    apiService.getPacientes().catch(() => []),
    apiService.getMedicos().catch(() => []),
    apiService.getEspecialidades().catch(() => [])
  ]);

  const pacOptions = (pacs || []).map(p => `<option value="${p.id}">${p.nome || p.name} (${p.email})</option>`).join('');
  const docOptions = (docs || []).map(d => `<option value="${d.id}">${d.nome || d.name}</option>`).join('');
  const specOptions = (specs || []).map(s => `<option value="${s.id}">${s.descricao || s.nome}</option>`).join('');

  const bodyHTML = `
    <div class="form-group">
      <label>Paciente</label>
      <select id="adm-app-pac" class="form-input">${pacOptions || '<option value="100">Paciente</option>'}</select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Especialidade</label>
        <select id="adm-app-spec" class="form-input">${specOptions || '<option value="1">Cardiologia</option>'}</select>
      </div>
      <div class="form-group">
        <label>Médico</label>
        <select id="adm-app-doc" class="form-input">${docOptions || '<option value="2">Dr. Henrique Barros</option>'}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Data</label>
        <input type="date" id="adm-app-date" class="form-input" required>
      </div>
      <div class="form-group">
        <label>Horário</label>
        <input type="time" id="adm-app-time" class="form-input" value="09:00" required>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Status</label>
        <select id="adm-app-status" class="form-input">
          <option value="pendente">Pendente</option>
          <option value="confirmado">Confirmado</option>
          <option value="pago">Pago</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
      <div class="form-group">
        <label>Valor (R$)</label>
        <input type="number" id="adm-app-price" class="form-input" value="250.00" step="0.01">
      </div>
    </div>
  `;

  openFormModal('Nova Consulta', bodyHTML, async () => {
    const pacienteId = document.getElementById('adm-app-pac')?.value;
    const doctorId = document.getElementById('adm-app-doc')?.value;
    const date = document.getElementById('adm-app-date')?.value;
    const time = document.getElementById('adm-app-time')?.value;
    const status = document.getElementById('adm-app-status')?.value || 'pendente';
    const price = parseFloat(document.getElementById('adm-app-price')?.value) || 250;

    if (!pacienteId || !date || !time) {
      showToast('Preencha os campos obrigatórios.', 'warning');
      return;
    }

    try {
      await apiService.createConsulta({
        data_hora: date + 'T' + time + ':00',
        status: status,
        valor: price,
        observacoes: 'Agendado pelo Administrador',
        paciente: { id: parseInt(pacienteId) },
        medico: { id: parseInt(doctorId || '2') }
      });

      closeModal();
      showToast('Consulta criada com sucesso no SQL Server!', 'success');
      renderAdminConsultas();
    } catch (err) {
      showToast(err.message || 'Erro ao criar consulta no servidor.', 'error');
    }
  });
}

async function openEditarConsultaAdminModal(appId) {
  const numericId = parseInt(String(appId).replace(/\D/g, '')) || appId;
  const rawConsultas = await apiService.getConsultas().catch(() => []);
  const app = (rawConsultas || []).find(a => a.id == numericId);
  if (!app) return;

  const bodyHTML = `
    <div class="form-group">
      <label>Status da Consulta</label>
      <select id="adm-edit-status" class="form-input">
        <option value="pendente" ${app.status === 'pendente' ? 'selected' : ''}>Pendente</option>
        <option value="confirmado" ${app.status === 'confirmado' ? 'selected' : ''}>Confirmado</option>
        <option value="pago" ${app.status === 'pago' ? 'selected' : ''}>Pago</option>
        <option value="concluido" ${app.status === 'concluido' ? 'selected' : ''}>Concluído</option>
        <option value="cancelado" ${app.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
      </select>
    </div>
    <div class="form-group">
      <label>Observações Clínicas / Administrativas</label>
      <textarea id="adm-edit-obs" class="form-input form-textarea" rows="3">${app.observacoes || ''}</textarea>
    </div>
  `;

  openFormModal('Editar Consulta', bodyHTML, async () => {
    const status = document.getElementById('adm-edit-status')?.value || app.status;
    const obs = document.getElementById('adm-edit-obs')?.value.trim() || '';

    try {
      await apiService.updateConsulta(numericId, {
        id: numericId,
        status: status,
        observacoes: obs
      });

      closeModal();
      showToast('Consulta atualizada com sucesso no banco de dados!', 'success');
      renderAdminConsultas();
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar consulta no servidor.', 'error');
    }
  });
}

/**
 * ==========================================
 * 6. CRUD: PAGAMENTOS
 * ==========================================
 */
async function renderAdminPagamentos() {
  const container = document.getElementById('crud-pagamentos-body');
  if (!container) return;

  renderLoading(container);
  try {
    const rawPayments = await apiService.getPagamentos().catch(() => []);
    let items = (rawPayments || []).map(p => ({
      id: p.id,
      patientName: p.consulta?.pacienteNome || p.consulta?.paciente?.nome || 'Paciente',
      specialty: p.consulta?.medicoNome || 'Consulta',
      amount: p.valor || 0,
      method: p.formaPagamento || 'PIX',
      status: p.status || 'pago',
      paidAt: p.data_pagamento || new Date().toISOString()
    }));

    const search = document.getElementById('search-pagamentos')?.value.toLowerCase() || '';
    if (search) {
      items = items.filter(p =>
        p.patientName.toLowerCase().includes(search) ||
        (p.method || '').toLowerCase().includes(search) ||
        (p.status || '').toLowerCase().includes(search)
      );
    }

    const columns = [
      { key: 'id', label: 'ID Transação' },
      { key: 'patientName', label: 'Paciente' },
      { key: 'specialty', label: 'Médico / Consulta' },
      { key: 'amount', label: 'Valor', format: (val) => formatCurrency(val || 0) },
      { key: 'method', label: 'Forma', format: (val) => (val || 'PIX').toUpperCase() },
      {
        key: 'status',
        label: 'Status',
        format: (val) => val === 'pago'
          ? '<span class="status-badge status-pago">PAGO</span>'
          : '<span class="status-badge status-pendente">PENDENTE</span>'
      },
      { key: 'paidAt', label: 'Data/Hora', format: (val) => val ? new Date(val).toLocaleString('pt-BR') : '—' }
    ];

    const actions = [
      {
        label: 'Excluir',
        className: 'btn-sm btn-danger',
        onClick: (item) => {
          openConfirmModal('Excluir Pagamento', 'Deseja realmente remover este registro financeiro?', async () => {
            try {
              const numericId = parseInt(String(item.id).replace(/\D/g, '')) || item.id;
              await apiService.deletePagamento(numericId);
              closeModal();
              showToast('Pagamento excluído com sucesso.', 'info');
              renderAdminPagamentos();
            } catch (err) {
              closeModal();
              showToast(err.message || 'Erro ao excluir pagamento no servidor.', 'error');
            }
          });
        }
      }
    ];

    renderCrudTable('crud-pagamentos-body', columns, items, actions);
  } catch (err) {
    showToast(err.message, 'error');
    container.innerHTML = `<div class="empty-state"><p class="text-danger">${err.message}</p></div>`;
  }
}

async function openNovoPagamentoAdminModal() {
  const rawConsultas = await apiService.getConsultas().catch(() => []);
  const appOptions = (rawConsultas || []).map(a => `<option value="${a.id}">Consulta #${a.id} - R$ ${a.valor || 250}</option>`).join('');

  const bodyHTML = `
    <div class="form-group">
      <label>Consulta Vinculada</label>
      <select id="adm-pay-app" class="form-input">${appOptions || '<option value="1">Consulta #1</option>'}</select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Valor (R$)</label>
        <input type="number" id="adm-pay-amount" class="form-input" value="250.00" step="0.01">
      </div>
      <div class="form-group">
        <label>Forma de Pagamento</label>
        <select id="adm-pay-method" class="form-input">
          <option value="pix">PIX</option>
          <option value="cartao">Cartão de Crédito</option>
          <option value="boleto">Boleto Bancário</option>
        </select>
      </div>
    </div>
  `;

  openFormModal('Registrar Pagamento', bodyHTML, async () => {
    const appointmentId = document.getElementById('adm-pay-app')?.value;
    const amount = parseFloat(document.getElementById('adm-pay-amount')?.value) || 250;
    const method = document.getElementById('adm-pay-method')?.value || 'pix';

    try {
      const numericId = parseInt(String(appointmentId).replace(/\D/g, '')) || 1;
      await apiService.createPagamento({
        valor: amount,
        formaPagamento: method,
        status: 'pago',
        consulta: { id: numericId }
      });

      closeModal();
      showToast('Pagamento registrado com sucesso no SQL Server!', 'success');
      renderAdminPagamentos();
    } catch (err) {
      showToast(err.message || 'Erro ao registrar pagamento no servidor.', 'error');
    }
  });
}

/**
 * ==========================================
 * 7. RELATÓRIOS (VIEWS DO SQL SERVER)
 * ==========================================
 */

// Relatório: Consultas Detalhadas (Executa vw_ConsultasDetalhadas no SQL Server)
async function renderRelConsultas() {
  const container = document.getElementById('crud-rel-consultas-body');
  if (!container) return;

  renderLoading(container);
  try {
    const data = await apiService.getConsultasDetalhadasView();
    let rows = (data || []).map(r => ({
      paciente: r.nome_paciente || r.paciente || '—',
      cpf: r.cpf_paciente || r.cpf || '—',
      medico: r.nome_medico || r.medico || '—',
      especialidade: r.especialidade || '—',
      data: formatDataHoraBR(r.data_hora),
      status: (r.status_consulta || '').toUpperCase(),
      valor: formatCurrency(r.valor_consulta || 0),
      obs: r.observacoes || '—'
    }));

    const search = document.getElementById('search-rel-consultas')?.value.toLowerCase() || '';
    if (search) {
      rows = rows.filter(r =>
        r.paciente.toLowerCase().includes(search) ||
        r.medico.toLowerCase().includes(search) ||
        r.especialidade.toLowerCase().includes(search) ||
        r.status.toLowerCase().includes(search)
      );
    }

    const columns = [
      { key: 'paciente', label: 'Paciente' },
      { key: 'cpf', label: 'CPF' },
      { key: 'medico', label: 'Médico' },
      { key: 'especialidade', label: 'Especialidade' },
      { key: 'data', label: 'Data e Hora' },
      { key: 'status', label: 'Status' },
      { key: 'valor', label: 'Valor' },
      { key: 'obs', label: 'Observações' }
    ];

    renderCrudTable('crud-rel-consultas-body', columns, rows, []);
  } catch (err) {
    showToast(err.message, 'error');
    container.innerHTML = `<div class="empty-state"><p class="text-danger">${err.message}</p></div>`;
  }
}

// Relatório: Faturamento por Especialidade (Executa vw_FaturamentoPorEspecialidade no SQL Server)
async function renderRelFaturamento() {
  const container = document.getElementById('crud-rel-faturamento-body');
  if (!container) return;

  renderLoading(container);
  try {
    const data = await apiService.getFaturamentoEspecialidadeView();
    let rows = (data || []).map(r => ({
      especialidade: r.especialidade || '—',
      qtd: r.total_consultas || 0,
      total: formatCurrency(r.faturamento_total || r.total || 0),
      media: formatCurrency(r.ticket_medio || r.media || 0)
    }));

    const search = document.getElementById('search-rel-faturamento')?.value.toLowerCase() || '';
    if (search) {
      rows = rows.filter(r => r.especialidade.toLowerCase().includes(search));
    }

    const columns = [
      { key: 'especialidade', label: 'Especialidade Médica' },
      { key: 'qtd', label: 'Qtd. Consultas' },
      { key: 'total', label: 'Faturamento Total' },
      { key: 'media', label: 'Ticket Médio' }
    ];

    renderCrudTable('crud-rel-faturamento-body', columns, rows, []);
  } catch (err) {
    showToast(err.message, 'error');
    container.innerHTML = `<div class="empty-state"><p class="text-danger">${err.message}</p></div>`;
  }
}

// Relatório: Agenda Disponível (Lê a view vw_HorariosVagos no SQL Server)
async function renderRelAgenda() {
  const container = document.getElementById('crud-rel-agenda-body');
  if (!container) return;

  renderLoading(container);
  try {
    const data = await apiService.getAgendaDisponivelView();
    let rows = (data || []).map(r => ({
      medico: r.profissional || '—',
      crm: r.crm || '—',
      especialidade: r.especialidade || '—',
      data: formatDateBR(r.data) || '—',
      inicio: String(r.hora_inicio || '—').substring(0, 5),
      fim: String(r.hora_fim || '—').substring(0, 5)
    }));

    const search = document.getElementById('search-rel-agenda')?.value.toLowerCase() || '';
    if (search) {
      rows = rows.filter(r => r.medico.toLowerCase().includes(search) || r.crm.toLowerCase().includes(search));
    }

    const columns = [
      { key: 'medico', label: 'Médico' },
      { key: 'crm', label: 'CRM' },
      { key: 'especialidade', label: 'Especialidade' },
      { key: 'data', label: 'Data Disponível' },
      { key: 'inicio', label: 'Horário Início' },
      { key: 'fim', label: 'Horário Fim' }
    ];

    renderCrudTable('crud-rel-agenda-body', columns, rows, []);
  } catch (err) {
    showToast(err.message, 'error');
    container.innerHTML = `<div class="empty-state"><p class="text-danger">${err.message}</p></div>`;
  }
}

// Relatório: Consultas por Período (Executa a function inline fn_ListarConsultasPorPeriodo)
async function renderRelPeriodo() {
  const container = document.getElementById('crud-rel-periodo-body');
  if (!container) return;

  const inicioInput = document.getElementById('rel-periodo-inicio');
  const fimInput = document.getElementById('rel-periodo-fim');

  // Período padrão: do primeiro dia do mês atual até 60 dias à frente
  if (inicioInput && !inicioInput.value) {
    const hoje = new Date();
    inicioInput.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
  }
  if (fimInput && !fimInput.value) {
    const fim = new Date();
    fim.setDate(fim.getDate() + 60);
    fimInput.value = getLocalDateISO(60);
  }

  if (inicioInput.value > fimInput.value) {
    showToast('A data inicial deve ser anterior à data final.', 'warning');
    return;
  }

  renderLoading(container);
  try {
    const data = await apiService.getConsultasPorPeriodo(inicioInput.value, fimInput.value);
    const rows = (data || []).map(r => ({
      id: r.id,
      data: formatDataHoraBR(r.data_hora),
      paciente: r.paciente || '—',
      medico: r.medico || '—',
      valor: formatCurrency(r.valor || 0),
      status: (r.status || '').toUpperCase()
    }));

    const columns = [
      { key: 'id', label: 'Código' },
      { key: 'data', label: 'Data e Hora' },
      { key: 'paciente', label: 'Paciente' },
      { key: 'medico', label: 'Médico' },
      { key: 'valor', label: 'Valor' },
      { key: 'status', label: 'Status' }
    ];

    renderCrudTable('crud-rel-periodo-body', columns, rows, []);
  } catch (err) {
    showToast(err.message, 'error');
    container.innerHTML = `<div class="empty-state"><p class="text-danger">${err.message}</p></div>`;
  }
}

// Relatório do Dia (view vw_RelatorioDiario do script original)
async function renderRelDiario() {
  const container = document.getElementById('crud-rel-diario-body');
  if (!container) return;

  renderLoading(container);
  try {
    const data = await apiService.getRelatorioDiarioView();
    const rows = (data || []).map(r => ({
      id: r.id_consulta,
      hora: formatDataHoraBR(r.data_hora),
      paciente: r.paciente || '—',
      profissional: r.profissional || '—',
      especialidade: r.especialidade || '—',
      status: (r.status_cons || '').toUpperCase(),
      valor: formatCurrency(r.valor_cons || 0),
      pagamento: r.status_pagamento ? (r.status_pagamento + (r.metodo_pagamento ? ' (' + r.metodo_pagamento + ')' : '')) : '—'
    }));

    const columns = [
      { key: 'id', label: 'Código' },
      { key: 'hora', label: 'Data e Hora' },
      { key: 'paciente', label: 'Paciente' },
      { key: 'profissional', label: 'Profissional' },
      { key: 'especialidade', label: 'Especialidade' },
      { key: 'status', label: 'Status' },
      { key: 'valor', label: 'Valor' },
      { key: 'pagamento', label: 'Pagamento' }
    ];

    renderCrudTable('crud-rel-diario-body', columns, rows, []);
  } catch (err) {
    showToast(err.message, 'error');
    container.innerHTML = `<div class="empty-state"><p class="text-danger">${err.message}</p></div>`;
  }
}

// Formata data/hora ISO (AAAA-MM-DDTHH:MM) como DD/MM/AAAA HH:MM
function formatDataHoraBR(iso) {
  if (!iso) return '—';
  const texto = String(iso);
  return formatDateBR(texto.substring(0, 10)) + ' ' + texto.substring(11, 16);
}
