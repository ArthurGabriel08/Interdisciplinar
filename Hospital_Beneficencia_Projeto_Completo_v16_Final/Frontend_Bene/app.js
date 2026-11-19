// ==========================================
// app.js — Orquestrador e Roteador Central (SPA)
// HBSaúde v2 — Sistema de Agendamento Médico
// ==========================================

// Mapeamento de rotas e permissões de acesso
const routePermissions = {
  'home': ['public'],
  'auth': ['public'],
  'dashboard': ['paciente', 'admin'],
  'paciente-perfil': ['paciente', 'admin'],
  'paciente-historico': ['paciente', 'admin'],
  'medico-consultas': ['medico', 'admin'],
  'medico-agenda': ['medico', 'admin'],
  'medico-perfil': ['medico', 'admin'],
  'admin': ['admin'],
  'access-denied': ['public'],
  'not-found': ['public']
};

/**
 * Retorna o papel do usuário devidamente normalizado
 */
function getUserEffectiveRole(user) {
  if (!user) return null;
  const raw = (user.role || '').toString().toLowerCase().trim();
  if (raw === 'admin' || raw === 'administrador') return 'admin';
  if (raw === 'medico' || raw === 'médico') return 'medico';
  return 'paciente'; // Qualquer outro caso (inclusive sem role) é paciente
}

/**
 * Roteador central da SPA
 * Controla exibição de seções e proteção por nível de acesso
 */
function navigateTo(viewName) {
  let user = getCurrentUser();
  const allowedRoles = routePermissions[viewName];

  // Garante sincronização de perfil no usuário da sessão
  if (user && !user.role) {
    user.role = 'paciente';
    setCurrentUser(user);
  }

  const role = getUserEffectiveRole(user);

  // 1. Rota inexistente -> 404
  if (!allowedRoles) {
    viewName = 'not-found';
  }
  // 2. Rota requer autenticação mas não está logado -> tela de login
  else if (!allowedRoles.includes('public') && !user) {
    showToast('Você precisa fazer login para acessar esta página.', 'warning');
    switchAuthTab('login');
    navigateTo('auth');
    return;
  }
  // 3. Usuário logado mas sem perfil suficiente -> Acesso Negado (403)
  // Administrador tem acesso irrestrito a todas as páginas do sistema
  else if (!allowedRoles.includes('public') && user && role !== 'admin' && !allowedRoles.includes(role)) {
    showToast('Acesso negado: seu perfil não tem permissão para esta tela.', 'error');
    navigateTo('access-denied');
    return;
  }

  // Ocultar todas as seções
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  // Exibir a seção correspondente
  const targetId = `view-${viewName}`;
  const targetSection = document.getElementById(targetId);

  if (targetSection) {
    targetSection.classList.add('active');
  } else {
    const notFoundSec = document.getElementById('view-not-found');
    if (notFoundSec) notFoundSec.classList.add('active');
  }

  // Atualizar classe ativa nos links da navegação
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-target') === viewName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Limpar mensagens e modais abertos
  closeModal();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Disparar renderizadores de conteúdo dinâmico
  switch (viewName) {
    case 'dashboard':
      if (typeof renderDashboard === 'function') renderDashboard();
      break;
    case 'paciente-perfil':
      if (typeof renderPacientePerfil === 'function') renderPacientePerfil();
      break;
    case 'paciente-historico':
      if (typeof renderPacienteHistorico === 'function') renderPacienteHistorico();
      break;
    case 'medico-consultas':
      if (typeof renderMedicoConsultas === 'function') renderMedicoConsultas();
      break;
    case 'medico-agenda':
      if (typeof renderMedicoAgenda === 'function') renderMedicoAgenda();
      break;
    case 'medico-perfil':
      if (typeof renderMedicoPerfil === 'function') renderMedicoPerfil();
      break;
    case 'admin':
      if (typeof renderAdminPanel === 'function') {
        renderAdminPanel(typeof currentAdminPanel !== 'undefined' ? currentAdminPanel : 'admin-panel-especialidades');
      }
      break;
  }
}

/**
 * Configuração dos listeners de navegação globais
 */
function setupGlobalNavigation() {
  // Clique no logo
  document.getElementById('nav-logo')?.addEventListener('click', () => navigateTo('home'));

  // Links do rodapé
  document.querySelector('.footer-link-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('home');
  });

  // Botões do header (Visitante)
  document.getElementById('btn-nav-login')?.addEventListener('click', () => {
    switchAuthTab('login');
    navigateTo('auth');
  });

  document.getElementById('btn-nav-register')?.addEventListener('click', () => {
    switchAuthTab('register');
    navigateTo('auth');
  });

  // Botões de CTA do Hero
  document.getElementById('hero-btn-start')?.addEventListener('click', () => {
    const user = getCurrentUser();
    if (user) {
      if (user.role === 'admin') navigateTo('admin');
      else if (user.role === 'medico') navigateTo('medico-consultas');
      else navigateTo('dashboard');
    } else {
      switchAuthTab('login');
      navigateTo('auth');
    }
  });

  document.getElementById('hero-btn-register')?.addEventListener('click', () => {
    switchAuthTab('register');
    navigateTo('auth');
  });

  // Links de navegação com data-target nos menus
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const target = this.getAttribute('data-target');
      if (target) {
        navigateTo(target);
      }
    });
  });
}

/**
 * Inicialização Completa da Aplicação
 */
window.addEventListener('DOMContentLoaded', () => {
  // 2. Inicializa módulos JS
  initAuth();
  if (typeof initPaciente === 'function') initPaciente();
  if (typeof initMedico === 'function') initMedico();
  if (typeof initAdmin === 'function') initAdmin();

  // 3. Configura eventos de navegação
  setupGlobalNavigation();

  // 4. Atualiza interface e header de acordo com a sessão ativa
  updateHeaderByRole();

  // 4.1 Se já existe sessão, recarrega os dados do SQL Server
  if (typeof getCurrentUser === 'function' && getCurrentUser()) {
    syncFromApi();
  }

  // 5. Entra na tela inicial
  navigateTo('home');
});
