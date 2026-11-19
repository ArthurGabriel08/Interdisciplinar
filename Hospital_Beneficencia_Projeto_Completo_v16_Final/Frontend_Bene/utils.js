// ==========================================
// utils.js — Funções utilitárias globais
// HBSaúde v2 — Sistema de Agendamento Médico
// ==========================================

// ==========================================
// BANCO DE DADOS (localStorage helpers)
// ==========================================

/**
 * Lê um array do localStorage pela chave fornecida.
 * Retorna array vazio se a chave não existir.
 */
function getDB(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}

/**
 * Salva um array no localStorage sob a chave fornecida.
 */
function setDB(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Retorna o usuário logado atualmente, ou null.
 */
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('hbsaude_current_user'));
}

/**
 * Define o usuário logado atualmente.
 */
function setCurrentUser(user) {
  localStorage.setItem('hbsaude_current_user', JSON.stringify(user));
}

/**
 * Remove o usuário logado (encerra sessão).
 */
function clearCurrentUser() {
  localStorage.removeItem('hbsaude_current_user');
}

/**
 * Gera um ID único com prefixo, timestamp e número aleatório.
 * Ex.: generateId('app') → "app_1700000000000_4523"
 */
function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

// ==========================================
// INTEGRAÇÃO COM BACKEND SPRING BOOT (REST API)
// ==========================================
const API_BASE_URL = 'http://localhost:8080';

const apiService = {
  /**
   * Executa requisições HTTP reais para o Spring Boot REST API
   * Sem fallback silencioso: falhas disparam exceções para tratamento explícito na interface
   */
  async request(endpoint, options = {}) {
    try {
      // Envia o token de login (Bearer) em toda requisição autenticada
      const usuarioLogado = getCurrentUser();
      const { headers: headersExtras, ...demaisOpcoes } = options;
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...demaisOpcoes,
        headers: {
          'Content-Type': 'application/json',
          ...(usuarioLogado && usuarioLogado.token ? { Authorization: `Bearer ${usuarioLogado.token}` } : {}),
          ...(headersExtras || {})
        }
      });

      if (!res.ok) {
        let errorMsg = `Erro ${res.status}: ${res.statusText}`;
        try {
          const errData = await res.json();
          if (errData && (errData.mensagem || errData.message || errData.error)) {
            errorMsg = errData.mensagem || errData.message || errData.error;
          }
        } catch (_) {}
        // Token vencido ou inválido: encerra a sessão e volta para o login
        if (res.status === 401 && !endpoint.startsWith('/auth/') && getCurrentUser()) {
          clearCurrentUser();
          if (typeof updateHeaderByRole === 'function') updateHeaderByRole();
          if (typeof navigateTo === 'function') navigateTo('auth');
          errorMsg = 'Sua sessão expirou. Faça login novamente.';
        }
        throw new Error(errorMsg);
      }

      if (res.status === 204) return true;
      return await res.json();
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
        throw new Error('Não foi possível conectar ao servidor backend (Spring Boot na porta 8080). Certifique-se de que a aplicação Java está em execução.');
      }
      throw err;
    }
  },

  // --- Autenticação e Perfis ---
  login(email, senha) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha })
    });
  },

  register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  resetPassword(email, cpf, novaSenha) {
    return this.request('/auth/esqueci-senha', {
      method: 'POST',
      body: JSON.stringify({ email, cpf, novaSenha })
    });
  },

  // --- CRUD Especialidades ---
  getEspecialidades() { return this.request('/especialidades'); },
  createEspecialidade(data) { return this.request('/especialidades', { method: 'POST', body: JSON.stringify(data) }); },
  updateEspecialidade(id, data) { return this.request(`/especialidades/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteEspecialidade(id) { return this.request(`/especialidades/${id}`, { method: 'DELETE' }); },

  // --- CRUD Médicos ---
  getMedicos() { return this.request('/medicos'); },
  createMedico(data) { return this.request('/medicos', { method: 'POST', body: JSON.stringify(data) }); },
  updateMedico(id, data) { return this.request(`/medicos/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteMedico(id) { return this.request(`/medicos/${id}`, { method: 'DELETE' }); },

  // --- CRUD Pacientes ---
  getPacientes() { return this.request('/pacientes'); },
  createPaciente(data) { return this.request('/pacientes', { method: 'POST', body: JSON.stringify(data) }); },
  updatePaciente(id, data) { return this.request(`/pacientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deletePaciente(id) { return this.request(`/pacientes/${id}`, { method: 'DELETE' }); },

  // --- CRUD Agendas ---
  getAgendas() { return this.request('/agendas'); },
  createAgenda(data) { return this.request('/agendas', { method: 'POST', body: JSON.stringify(data) }); },
  updateAgenda(id, data) { return this.request(`/agendas/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteAgenda(id) { return this.request(`/agendas/${id}`, { method: 'DELETE' }); },

  // --- CRUD Consultas ---
  getConsultas() { return this.request('/consultas'); },
  createConsulta(data) { return this.request('/consultas', { method: 'POST', body: JSON.stringify(data) }); },
  updateConsulta(id, data) { return this.request(`/consultas/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteConsulta(id) { return this.request(`/consultas/${id}`, { method: 'DELETE' }); },

  // --- CRUD Pagamentos ---
  getPagamentos() { return this.request('/pagamentos'); },
  createPagamento(data) { return this.request('/pagamentos', { method: 'POST', body: JSON.stringify(data) }); },
  updatePagamento(id, data) { return this.request(`/pagamentos/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deletePagamento(id) { return this.request(`/pagamentos/${id}`, { method: 'DELETE' }); },

  // --- Relatórios e Views do SQL Server ---
  getConsultasDetalhadasView() { return this.request('/api/database/views/consultas-detalhadas'); },
  getFaturamentoEspecialidadeView() { return this.request('/api/database/views/faturamento-especialidade'); },
  getAgendaDisponivelView() { return this.request('/api/database/views/agenda-disponivel'); },
  getRelatorioDiarioView() { return this.request('/api/database/views/relatorio-diario'); },

  // --- Dados do usuário logado (carregados do SQL Server) ---
  getMedicosPublico() { return this.request('/medicos/publico'); },
  getMinhasConsultas() { return this.request('/consultas/minhas'); },
  getPaciente(id) { return this.request(`/pacientes/${id}`); },
  changePassword(senhaAtual, novaSenha) {
    return this.request('/auth/alterar-senha', { method: 'POST', body: JSON.stringify({ senhaAtual, novaSenha }) });
  },

  // --- Stored Procedures do SQL Server ---
  agendarConsultaProcedure(idPaciente, idMedico, dataHora) {
    const q = new URLSearchParams({ idPaciente, idMedico, dataHora });
    return this.request(`/api/database/procedures/agendar?${q}`, { method: 'POST' });
  },
  pagarConsultaProcedure(idConsulta, formaPagamento) {
    const q = new URLSearchParams({ idConsulta, formaPagamento });
    return this.request(`/api/database/procedures/pagar?${q}`, { method: 'POST' });
  },
  cancelarConsultaProcedure(idConsulta, motivo) {
    const q = new URLSearchParams({ idConsulta, motivo });
    return this.request(`/api/database/procedures/cancelar?${q}`, { method: 'POST' });
  },

  // --- Functions do SQL Server ---
  getTotalGastoPaciente(idPaciente) { return this.request(`/api/database/functions/total-gasto-paciente/${idPaciente}`); },
  getProdutividadeMedico(idMedico) { return this.request(`/api/database/functions/produtividade-medico/${idMedico}`); },
  getConsultasPorPeriodo(dataInicio, dataFim) {
    const q = new URLSearchParams({ dataInicio, dataFim });
    return this.request(`/api/database/functions/consultas-periodo?${q}`);
  }
};

// ==========================================
// SINCRONIZAÇÃO COM O BANCO DE DADOS (SQL Server)
// ==========================================

/**
 * syncFromApi()
 * Carrega do backend os dados do usuário logado (especialidades, médicos, consultas,
 * pagamentos e agenda) e grava no cache local que as telas de paciente e médico usam.
 * O banco é a fonte da verdade: o cache é sempre sobrescrito pelo que veio do SQL Server.
 * Devolve true se sincronizou e false se não foi possível.
 */
async function syncFromApi() {
  const logged = getCurrentUser();
  if (!logged || !logged.token) return false;
  if (logged.role === 'admin') return true; // o admin trabalha direto na API, sem cache

  try {
    const [especialidades, medicos, agendas, consultas] = await Promise.all([
      apiService.getEspecialidades(),
      apiService.getMedicosPublico(),
      apiService.getAgendas(),
      apiService.getMinhasConsultas()
    ]);

    // Especialidades
    setDB('hbsaude_specialties', (especialidades || []).map(function (e) {
      return { id: String(e.id), name: e.descricao, description: e.descricao };
    }));

    // Usuários: médicos (catálogo) + pacientes que aparecem nas consultas
    const users = (medicos || []).map(function (m) {
      const isSelf = logged.role === 'medico' && m.id === logged.id;
      return {
        id: m.id,
        name: m.nome,
        email: isSelf ? logged.email : '',
        phone: isSelf ? (logged.phone || '') : '',
        cpf: isSelf ? (logged.cpf || '') : '',
        role: 'medico',
        crm: m.numeroRegistro,
        specialties: (m.especialidades || []).map(function (e) { return String(e.id); }),
        consultPrice: Number(m.valorConsulta) || 0,
        description: m.descricao || '',
        shift: m.turno || 'morning'
      };
    });
    const sexoPorExtenso = { M: 'Masculino', F: 'Feminino', O: 'Outro' };
    const pacientes = {};
    (consultas || []).forEach(function (c) {
      const p = c.paciente;
      if (p && !pacientes[p.id]) {
        pacientes[p.id] = {
          id: p.id, name: p.nome, email: p.email, cpf: p.cpf, phone: p.telefone,
          sex: sexoPorExtenso[p.sexo] || '', birthDate: p.dataNascimento || '', role: 'paciente'
        };
      }
    });
    Object.keys(pacientes).forEach(function (k) { users.push(pacientes[k]); });
    setDB('hbsaude_users', users);

    // Médico logado: completa a sessão com CRM, valor, bio e especialidades (mantendo o token)
    if (logged.role === 'medico') {
      const selfDoc = users.find(function (u) { return u.role === 'medico' && u.id === logged.id; });
      if (selfDoc) {
        setCurrentUser(Object.assign({}, logged, {
          name: selfDoc.name || logged.name,
          crm: selfDoc.crm || '',
          consultPrice: selfDoc.consultPrice || 0,
          description: selfDoc.description || '',
          specialties: selfDoc.specialties || [],
          shift: selfDoc.shift || 'morning'
        }));
      }
    }

    // Paciente logado: completa a sessão com os dados do cadastro (mantendo o token)
    if (logged.role === 'paciente') {
      try {
        const p = await apiService.getPaciente(logged.id);
        setCurrentUser(Object.assign({}, logged, {
          name: p.nome, email: p.email, phone: p.telefone, cpf: p.cpf,
          sex: sexoPorExtenso[p.sexo] || '', birthDate: p.dataNascimento || ''
        }));
      } catch (e) {
        console.warn('Não foi possível carregar o cadastro do paciente:', e);
      }
    }

    // Consultas
    setDB('hbsaude_appointments', (consultas || []).map(function (c) {
      const dh = String(c.data_hora || '');
      const medico = c.medico || {};
      const esp = (medico.especialidades || [])[0];
      return {
        id: String(c.id),
        patientEmail: c.paciente ? c.paciente.email : '',
        patientName: c.paciente ? c.paciente.nome : '',
        doctorName: medico.nome || '',
        doctorCrm: medico.numeroRegistro || '',
        specialty: esp ? esp.descricao : '',
        date: dh.substring(0, 10),
        time: dh.substring(11, 16),
        status: c.status || 'pendente',
        observations: c.observacoes || '',
        price: Number(c.valor) || 0
      };
    }));

    // Pagamentos (vêm dentro das consultas)
    const pagamentos = [];
    (consultas || []).forEach(function (c) {
      if (c.pagamento) {
        pagamentos.push({
          id: 'pay_' + c.pagamento.id,
          appointmentId: String(c.id),
          amount: Number(c.pagamento.valor) || 0,
          method: c.pagamento.formaPagamento,
          status: c.pagamento.status,
          paidAt: c.pagamento.data_pagamento
        });
      }
    });
    setDB('hbsaude_payments', pagamentos);

    // Agenda dos médicos
    setDB('hbsaude_schedules', (agendas || []).map(function (s) {
      return {
        id: String(s.id),
        doctorId: s.medico ? s.medico.id : null,
        date: s.data,
        startTime: String(s.hora_inicio || '').substring(0, 5),
        endTime: String(s.hora_fim || '').substring(0, 5),
        available: s.disponivel !== false
      };
    }));

    return true;
  } catch (err) {
    console.warn('Falha ao sincronizar com o servidor:', err);
    if (typeof showToast === 'function') {
      showToast('Não foi possível carregar os dados do servidor: ' + err.message, 'error');
    }
    return false;
  }
}



/**
 * Retorna a data local no formato YYYY-MM-DD (evita virada antecipada de dia por fuso UTC).
 */
function getLocalDateISO(offsetDays) {
  const d = new Date();
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ==========================================
// FORMATAÇÃO
// ==========================================

/**
 * Formata um número como moeda brasileira.
 * Ex.: formatCurrency(250) → "R$ 250,00"
 *      formatCurrency(1500.5) → "R$ 1.500,50"
 */
function formatCurrency(num) {
  if (num == null || isNaN(num)) return 'R$ 0,00';
  return 'R$ ' + Number(num).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Converte data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/AAAA).
 * Ex.: formatDateBR("2024-01-15") → "15/01/2024"
 */
function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

/**
 * Formata data e hora em texto legível em português.
 * Ex.: formatDateTime("2024-01-15", "14:30") → "15/01/2024 às 14:30"
 */
function formatDateTime(dateStr, timeStr) {
  return formatDateBR(dateStr) + ' às ' + (timeStr || '');
}


// ==========================================
// VALIDAÇÃO
// ==========================================

/**
 * Valida um endereço de e-mail com regex.
 * Retorna true se o formato for válido.
 */
function validateEmail(email) {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Valida CPF brasileiro com o algoritmo completo de 2 dígitos verificadores.
 * Aceita CPF com ou sem formatação (pontos e traço).
 * Retorna true se o CPF for válido.
 */
function validateCPF(cpf) {
  if (!cpf) return false;

  // Remove tudo que não for dígito
  const cleaned = cpf.replace(/\D/g, '');

  // Deve ter exatamente 11 dígitos
  if (cleaned.length !== 11) return false;

  // Rejeita CPFs com todos os dígitos iguais (ex.: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Cálculo do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;

  // Cálculo do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

/**
 * Valida a força da senha.
 * Requisitos: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 dígito, 1 caractere especial.
 * Retorna { valid: boolean, errors: string[] }
 */
function validatePassword(pwd) {
  const errors = [];

  if (!pwd || pwd.length < 8) {
    errors.push('A senha deve ter no mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(pwd)) {
    errors.push('A senha deve conter pelo menos uma letra maiúscula');
  }
  if (!/[a-z]/.test(pwd)) {
    errors.push('A senha deve conter pelo menos uma letra minúscula');
  }
  if (!/[0-9]/.test(pwd)) {
    errors.push('A senha deve conter pelo menos um número');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd)) {
    errors.push('A senha deve conter pelo menos um caractere especial');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}


// ==========================================
// MÁSCARAS DE INPUT (aplicadas em tempo real)
// ==========================================

/**
 * Aplica máscara de CPF ao campo de input.
 * Formata automaticamente como: 000.000.000-00
 */
function maskCPF(inputEl) {
  if (!inputEl) return;

  function applyMask() {
    let value = inputEl.value.replace(/\D/g, ''); // Apenas dígitos
    if (value.length > 11) value = value.substring(0, 11);

    // Aplica a formatação progressivamente
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }

    inputEl.value = value;
  }

  inputEl.addEventListener('input', applyMask);
  inputEl.addEventListener('keyup', applyMask);
}

/**
 * Aplica máscara de telefone ao campo de input.
 * Formata automaticamente como: (00) 00000-0000
 */
function maskPhone(inputEl) {
  if (!inputEl) return;

  function applyMask() {
    let value = inputEl.value.replace(/\D/g, ''); // Apenas dígitos
    if (value.length > 11) value = value.substring(0, 11);

    // Aplica a formatação progressivamente
    if (value.length > 6) {
      value = value.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3');
    } else if (value.length > 2) {
      value = value.replace(/(\d{2})(\d{1,5})/, '($1) $2');
    } else if (value.length > 0) {
      value = value.replace(/(\d{1,2})/, '($1');
    }

    inputEl.value = value;
  }

  inputEl.addEventListener('input', applyMask);
  inputEl.addEventListener('keyup', applyMask);
}


// ==========================================
// TOAST NOTIFICATIONS (Notificações visuais)
// ==========================================

/**
 * Exibe uma notificação toast.
 * @param {string} message — Mensagem a ser exibida
 * @param {string} type — 'success' | 'error' | 'info' | 'warning'
 */
function showToast(message, type) {
  if (!type) type = 'info';

  const container = document.getElementById('toast-container');
  if (!container) return;

  // Ícones SVG por tipo de notificação
  const icons = {
    success: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
    error: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
    warning: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>'
  };

  // Cores por tipo
  const colors = {
    success: { bg: '#E6F5E9', border: '#2D8C3C', text: '#236E2F' },
    error: { bg: '#FDE8E9', border: '#C41E24', text: '#A3181D' },
    info: { bg: '#E8F4FD', border: '#3B82F6', text: '#1E3A5F' },
    warning: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' }
  };

  const color = colors[type] || colors.info;

  // Cria o elemento do toast
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:14px 16px;margin-bottom:10px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:300px;max-width:420px;transform:translateX(120%);transition:transform 0.35s ease, opacity 0.35s ease;opacity:0;background:' + color.bg + ';border-left:4px solid ' + color.border + ';color:' + color.text + ';font-size:0.9rem;line-height:1.4;position:relative;';

  toast.innerHTML =
    '<span style="flex-shrink:0;margin-top:1px;">' + (icons[type] || icons.info) + '</span>' +
    '<span style="flex:1;">' + message + '</span>' +
    '<button style="background:none;border:none;cursor:pointer;color:' + color.text + ';font-size:1.2rem;line-height:1;padding:0 0 0 8px;opacity:0.7;" title="Fechar">&times;</button>';

  container.appendChild(toast);

  // Botão de fechar
  var closeBtn = toast.querySelector('button');
  closeBtn.addEventListener('click', function() {
    removeToast(toast);
  });

  // Animação de entrada (slide da direita)
  requestAnimationFrame(function() {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  });

  // Auto-remover após 4 segundos
  var autoRemoveTimer = setTimeout(function() {
    removeToast(toast);
  }, 4000);

  // Armazena o timer para limpar se removido manualmente
  toast._autoRemoveTimer = autoRemoveTimer;

  function removeToast(el) {
    if (el._autoRemoveTimer) clearTimeout(el._autoRemoveTimer);
    el.style.transform = 'translateX(120%)';
    el.style.opacity = '0';
    setTimeout(function() {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 350);
  }
}


// ==========================================
// SISTEMA DE MODAIS
// ==========================================

// Referência aos listeners ativos para remoção posterior
var _modalActiveListeners = {};

/**
 * Abre o modal genérico de formulário.
 * @param {string} title — Título do modal
 * @param {string} bodyHTML — HTML do corpo/formulário
 * @param {Function} onSubmit — Callback chamado ao clicar em "Salvar"
 */
function openFormModal(title, bodyHTML, onSubmit) {
  var overlay = document.getElementById('modal-overlay');
  var modal = document.getElementById('modal-form');
  var titleEl = document.getElementById('modal-form-title');
  var bodyEl = document.getElementById('modal-form-body');
  var submitBtn = document.getElementById('modal-form-submit');

  if (!overlay || !modal) return;

  // Configura conteúdo
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = bodyHTML;

  // Exibe o modal
  overlay.style.display = 'flex';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';

  // Handler do submit
  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (typeof onSubmit === 'function') onSubmit();
  }

  // Limpa listener anterior e registra novo
  if (_modalActiveListeners.formSubmit) {
    submitBtn.removeEventListener('click', _modalActiveListeners.formSubmit);
  }
  _modalActiveListeners.formSubmit = handleSubmit;
  submitBtn.addEventListener('click', handleSubmit);

  // Fechar ao clicar no overlay
  _attachOverlayClose(overlay);

  // Fechar ao clicar nos botões de fechar dentro do modal
  _attachCloseButtons(modal);
}

/**
 * Abre o modal de confirmação.
 * @param {string} title — Título da confirmação
 * @param {string} message — Mensagem de confirmação
 * @param {Function} onConfirm — Callback chamado ao clicar em "Confirmar"
 */
function openConfirmModal(title, message, onConfirm) {
  var overlay = document.getElementById('modal-overlay');
  var modal = document.getElementById('modal-confirm');
  var titleEl = document.getElementById('modal-confirm-title');
  var messageEl = document.getElementById('modal-confirm-message');
  var yesBtn = document.getElementById('modal-confirm-yes');
  var noBtn = document.getElementById('modal-confirm-no');

  if (!overlay || !modal) return;

  // Configura conteúdo
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;

  // Exibe o modal
  overlay.style.display = 'flex';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';

  // Handler do "Confirmar"
  function handleConfirm() {
    if (typeof onConfirm === 'function') onConfirm();
    closeModal();
  }

  // Limpa listener anterior e registra novo
  if (_modalActiveListeners.confirmYes) {
    yesBtn.removeEventListener('click', _modalActiveListeners.confirmYes);
  }
  _modalActiveListeners.confirmYes = handleConfirm;
  yesBtn.addEventListener('click', handleConfirm);

  // Botão "Cancelar" fecha o modal
  function handleCancel() {
    closeModal();
  }
  if (_modalActiveListeners.confirmNo) {
    noBtn.removeEventListener('click', _modalActiveListeners.confirmNo);
  }
  _modalActiveListeners.confirmNo = handleCancel;
  noBtn.addEventListener('click', handleCancel);

  // Fechar ao clicar no overlay
  _attachOverlayClose(overlay);

  // Fechar ao clicar nos botões de fechar dentro do modal
  _attachCloseButtons(modal);
}

/**
 * Abre o modal de pagamento.
 * @param {string} appointmentId — ID do agendamento
 * @param {number} amount — Valor a ser pago
 */
function openPaymentModal(appointmentId, amount) {
  var overlay = document.getElementById('modal-overlay');
  var modal = document.getElementById('modal-payment');
  var amountEl = document.getElementById('payment-amount');

  if (!overlay || !modal) return;

  // Configura o valor
  if (amountEl) amountEl.textContent = formatCurrency(amount);

  // Armazena o appointmentId e amount como data attributes no modal
  modal.setAttribute('data-appointment-id', appointmentId);
  modal.setAttribute('data-amount', amount);

  // Reseta o select de método de pagamento
  var methodSelect = document.getElementById('payment-method-select');
  if (methodSelect) methodSelect.value = 'pix';

  // Exibe o modal
  overlay.style.display = 'flex';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';

  // Fechar ao clicar no overlay
  _attachOverlayClose(overlay);

  // Fechar ao clicar nos botões de fechar dentro do modal
  _attachCloseButtons(modal);
}

/**
 * Fecha todos os modais e remove listeners ativos.
 */
function closeModal() {
  var overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.style.display = 'none';

  // Esconde todos os modais
  var modals = document.querySelectorAll('#modal-form, #modal-confirm, #modal-payment');
  modals.forEach(function(m) {
    m.style.display = 'none';
  });

  // Limpa listeners do submit do formulário
  var submitBtn = document.getElementById('modal-form-submit');
  if (submitBtn && _modalActiveListeners.formSubmit) {
    submitBtn.removeEventListener('click', _modalActiveListeners.formSubmit);
    _modalActiveListeners.formSubmit = null;
  }

  // Limpa listeners do modal de confirmação
  var yesBtn = document.getElementById('modal-confirm-yes');
  if (yesBtn && _modalActiveListeners.confirmYes) {
    yesBtn.removeEventListener('click', _modalActiveListeners.confirmYes);
    _modalActiveListeners.confirmYes = null;
  }
  var noBtn = document.getElementById('modal-confirm-no');
  if (noBtn && _modalActiveListeners.confirmNo) {
    noBtn.removeEventListener('click', _modalActiveListeners.confirmNo);
    _modalActiveListeners.confirmNo = null;
  }

  // Limpa listener do overlay
  if (overlay && _modalActiveListeners.overlayClick) {
    overlay.removeEventListener('click', _modalActiveListeners.overlayClick);
    _modalActiveListeners.overlayClick = null;
  }
}

/**
 * Fecha o modal ao clicar diretamente no overlay (fora do modal).
 */
function _attachOverlayClose(overlay) {
  if (_modalActiveListeners.overlayClick) {
    overlay.removeEventListener('click', _modalActiveListeners.overlayClick);
  }
  function handleOverlayClick(e) {
    if (e.target === overlay) {
      closeModal();
    }
  }
  _modalActiveListeners.overlayClick = handleOverlayClick;
  overlay.addEventListener('click', handleOverlayClick);
}

/**
 * Fecha o modal ao clicar em qualquer botão .modal-close dentro dele.
 */
function _attachCloseButtons(modal) {
  var closeBtns = modal.querySelectorAll('.modal-close');
  closeBtns.forEach(function(btn) {
    // Usa onclick direto para evitar acumular listeners
    btn.onclick = function() {
      closeModal();
    };
  });
}


// ==========================================
// LOADING & EMPTY STATE
// ==========================================
window.renderLoading = function(id) { showLoading(id); };
// ==========================================

/**
 * Exibe um spinner de carregamento dentro de um container.
 * @param {string} containerId — ID do elemento container
 */
function showLoading(containerId) {
  window.renderLoading = showLoading; // alias retrocompatível
  var container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<div class="loading-spinner" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;gap:12px;">' +
      '<div style="width:40px;height:40px;border:4px solid #e2e8f0;border-top:4px solid #C41E24;border-radius:50%;animation:spin 0.8s linear infinite;"></div>' +
      '<span style="color:#64748B;font-size:0.9rem;">Carregando...</span>' +
    '</div>';

  // Injeta a animação CSS se ainda não existir
  if (!document.getElementById('loading-spinner-style')) {
    var style = document.createElement('style');
    style.id = 'loading-spinner-style';
    style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }
}

/**
 * Remove o spinner de carregamento de um container.
 * @param {string} containerId — ID do elemento container
 */
function hideLoading(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var spinner = container.querySelector('.loading-spinner');
  if (spinner) spinner.remove();
}

/**
 * Renderiza um estado vazio (sem dados) dentro de um container.
 * @param {string} containerId — ID do elemento container
 * @param {string} title — Título do estado vazio
 * @param {string} subtitle — Subtítulo/descrição
 */
function renderEmptyState(containerId, title, subtitle) {
  var container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<div class="empty-state" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;text-align:center;color:#64748B;">' +
      '<svg viewBox="0 0 24 24" width="48" height="48" fill="#CBD5E1" style="margin-bottom:16px;"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>' +
      '<h3 style="margin:0 0 8px;font-size:1.1rem;color:#1E293B;font-weight:600;">' + (title || 'Nenhum item encontrado') + '</h3>' +
      '<p style="margin:0;font-size:0.9rem;color:#64748B;">' + (subtitle || '') + '</p>' +
    '</div>';
}


// ==========================================
// RENDERIZADOR DE TABELAS CRUD
// ==========================================

/**
 * Renderiza uma tabela CRUD dinâmica dentro de um container.
 * @param {string} containerId — ID do container de destino
 * @param {Array} columns — [{key: string, label: string, format?: Function}]
 * @param {Array} data — Array de objetos com os dados
 * @param {Array} actions — [{label: string, className: string, onClick: Function(item)}]
 */
function renderCrudTable(containerId, columns, data, actions) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // Se não há dados, mostra empty state
  if (!data || data.length === 0) {
    renderEmptyState(containerId, 'Nenhum registro encontrado', 'Não há dados para exibir nesta seção.');
    return;
  }

  // Cria a tabela
  var table = document.createElement('table');
  table.className = 'crud-table';
  table.style.cssText = 'width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);';

  // Cabeçalho
  var thead = document.createElement('thead');
  var headerRow = document.createElement('tr');
  headerRow.style.cssText = 'background:#f8fafc;border-bottom:2px solid #e2e8f0;';

  columns.forEach(function(col) {
    var th = document.createElement('th');
    th.textContent = col.label;
    th.style.cssText = 'padding:12px 16px;text-align:left;font-size:0.8rem;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;';
    headerRow.appendChild(th);
  });

  // Coluna de ações (se houver)
  if (actions && actions.length > 0) {
    var thActions = document.createElement('th');
    thActions.textContent = 'Ações';
    thActions.style.cssText = 'padding:12px 16px;text-align:center;font-size:0.8rem;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;';
    headerRow.appendChild(thActions);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Corpo da tabela
  var tbody = document.createElement('tbody');

  data.forEach(function(item) {
    var row = document.createElement('tr');
    row.style.cssText = 'border-bottom:1px solid #e2e8f0;transition:background 0.2s;';
    row.onmouseenter = function() { this.style.background = '#f8fafc'; };
    row.onmouseleave = function() { this.style.background = ''; };

    columns.forEach(function(col) {
      var td = document.createElement('td');
      td.style.cssText = 'padding:12px 16px;font-size:0.9rem;color:#1E293B;';

      // Usa formatador customizado se fornecido
      var value = item[col.key];
      if (typeof col.format === 'function') {
        td.innerHTML = col.format(value, item);
      } else {
        td.textContent = value != null ? value : '—';
      }

      row.appendChild(td);
    });

    // Coluna de ações
    if (actions && actions.length > 0) {
      var tdActions = document.createElement('td');
      tdActions.style.cssText = 'padding:12px 16px;text-align:center;white-space:nowrap;';

      actions.forEach(function(action) {
        var btn = document.createElement('button');
        btn.textContent = action.label;
        btn.className = action.className || '';
        btn.style.cssText = 'padding:6px 12px;margin:0 4px;border:none;border-radius:4px;cursor:pointer;font-size:0.8rem;font-weight:500;transition:opacity 0.2s;';
        btn.addEventListener('click', function() {
          if (typeof action.onClick === 'function') action.onClick(item);
        });
        tdActions.appendChild(btn);
      });

      row.appendChild(tdActions);
    }

    tbody.appendChild(row);
  });

  table.appendChild(tbody);

  // Insere no container
  container.innerHTML = '';
  container.appendChild(table);
}
