// ==========================================
// auth.js — Módulo de Autenticação e Perfis
// HBSaúde v2 — Sistema de Agendamento Médico
// ==========================================

let resetTargetEmail = null;
let resetTargetCpf = null;

/**
 * Inicializa todos os eventos de autenticação e controle de telas de acesso
 */
function initAuth() {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const linkForgot = document.getElementById('link-forgot-password');
  const linkBackLogin = document.getElementById('link-back-login');
  const formForgot = document.getElementById('form-forgot-password');
  const formReset = document.getElementById('form-reset-password');

  // Alternância de abas
  if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));
  if (tabRegister) tabRegister.addEventListener('click', () => switchAuthTab('register'));

  // Submissões
  if (formLogin) formLogin.addEventListener('submit', handleLogin);
  if (formRegister) formRegister.addEventListener('submit', handleRegister);
  if (formForgot) formForgot.addEventListener('submit', handleForgotPassword);
  if (formReset) formReset.addEventListener('submit', handleResetPassword);

  // Links de navegação interna
  if (linkForgot) {
    linkForgot.addEventListener('click', (e) => {
      e.preventDefault();
      showAuthSubView('forgot');
    });
  }

  if (linkBackLogin) {
    linkBackLogin.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab('login');
    });
  }

  // Botões de mostrar/ocultar senha
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function () {
      const targetId = this.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        this.innerHTML = `
          <svg class="eye-icon" viewBox="0 0 24 24">
            <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
          </svg>
        `;
      } else {
        input.type = 'password';
        this.innerHTML = `
          <svg class="eye-icon" viewBox="0 0 24 24">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
        `;
      }
    });
  });

  // Eventos de logout
  document.querySelectorAll('.btn-logout-action').forEach(btn => {
    btn.addEventListener('click', handleLogout);
  });

  // Aplicar máscaras nos inputs
  const regCpf = document.getElementById('register-cpf');
  if (regCpf) maskCPF(regCpf);

  const forgotCpf = document.getElementById('forgot-cpf');
  if (forgotCpf) maskCPF(forgotCpf);

  const regPhone = document.getElementById('register-phone');
  if (regPhone) maskPhone(regPhone);

  const perfilPhone = document.getElementById('perfil-phone');
  if (perfilPhone) maskPhone(perfilPhone);
}

/**
 * Alterna entre subformulários na tela de autenticação
 */
function showAuthSubView(view) {
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const formForgot = document.getElementById('form-forgot-password');
  const formReset = document.getElementById('form-reset-password');
  const authTabs = document.querySelector('.auth-tabs');

  [formLogin, formRegister, formForgot, formReset].forEach(f => {
    if (f) f.classList.remove('active');
  });

  if (view === 'login') {
    if (authTabs) authTabs.style.display = 'flex';
    if (formLogin) formLogin.classList.add('active');
  } else if (view === 'register') {
    if (authTabs) authTabs.style.display = 'flex';
    if (formRegister) formRegister.classList.add('active');
  } else if (view === 'forgot') {
    if (authTabs) authTabs.style.display = 'none';
    if (formForgot) formForgot.classList.add('active');
  } else if (view === 'reset') {
    if (authTabs) authTabs.style.display = 'none';
    if (formReset) formReset.classList.add('active');
  }
}

/**
 * Alterna entre abas Login / Cadastro
 */
function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const authGlobalMessage = document.getElementById('auth-global-message');
  if (authGlobalMessage) authGlobalMessage.style.display = 'none';

  if (tab === 'login') {
    if (tabLogin) tabLogin.classList.add('active');
    if (tabRegister) tabRegister.classList.remove('active');
    showAuthSubView('login');
  } else {
    if (tabRegister) tabRegister.classList.add('active');
    if (tabLogin) tabLogin.classList.remove('active');
    showAuthSubView('register');
  }
}

/**
 * Processa login via Spring Security / Backend REST
 */
async function handleLogin(e) {
  e.preventDefault();

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const password = passwordInput ? passwordInput.value : '';

  let valid = true;

  if (!validateEmail(email)) {
    showInputFeedback('login-email', 'feedback-login-email', 'Informe um e-mail válido');
    valid = false;
  } else {
    hideInputFeedback('login-email', 'feedback-login-email');
  }

  if (!password || password.length < 6) {
    showInputFeedback('login-password', 'feedback-login-password', 'Senha deve conter no mínimo 6 caracteres');
    valid = false;
  } else {
    hideInputFeedback('login-password', 'feedback-login-password');
  }

  if (!valid) return;

  try {
    const authData = await apiService.login(email, password);
    const user = {
      id: authData.id,
      name: authData.nome,
      email: authData.email,
      cpf: authData.cpf,
      phone: authData.telefone,
      role: (authData.perfil || 'paciente').toLowerCase(),
      token: authData.token
    };

    // Login bem sucedido autenticado pelo Spring Security
    setCurrentUser(user);
    updateHeaderByRole();
    await syncFromApi(); // carrega do SQL Server as consultas, médicos e agenda do usuário
    showToast(`Bem-vindo de volta, ${user.name.split(' ')[0]}!`, 'success');

    // Limpa campos
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';

    // Redireciona conforme perfil autenticado no banco de dados
    if (user.role === 'admin') {
      navigateTo('admin');
    } else if (user.role === 'medico') {
      navigateTo('medico-consultas');
    } else {
      navigateTo('dashboard');
    }
  } catch (err) {
    showToast(err.message || 'E-mail ou senha incorretos.', 'error');
  }
}

/**
 * Processa cadastro público no banco de dados (SEMPRE como paciente)
 */
async function handleRegister(e) {
  e.preventDefault();

  const nameInput = document.getElementById('register-name');
  const emailInput = document.getElementById('register-email');
  const phoneInput = document.getElementById('register-phone');
  const cpfInput = document.getElementById('register-cpf');
  const sexInput = document.getElementById('register-sex');
  const birthInput = document.getElementById('register-birthdate');
  const passwordInput = document.getElementById('register-password');
  const confirmInput = document.getElementById('register-password-confirm');

  const name = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const cpf = cpfInput ? cpfInput.value.trim() : '';
  const sex = sexInput ? sexInput.value : '';
  const birthDate = birthInput ? birthInput.value : '';
  const password = passwordInput ? passwordInput.value : '';
  const confirm = confirmInput ? confirmInput.value : '';

  let valid = true;

  // Nome
  if (!name || name.length < 3) {
    showInputFeedback('register-name', 'feedback-register-name', 'Informe seu nome completo');
    valid = false;
  } else {
    hideInputFeedback('register-name', 'feedback-register-name');
  }

  // E-mail
  if (!validateEmail(email)) {
    showInputFeedback('register-email', 'feedback-register-email', 'Digite um e-mail válido');
    valid = false;
  } else {
    hideInputFeedback('register-email', 'feedback-register-email');
  }

  // Telefone
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    showInputFeedback('register-phone', 'feedback-register-phone', 'Informe um telefone válido com DDD');
    valid = false;
  } else {
    hideInputFeedback('register-phone', 'feedback-register-phone');
  }

  // CPF (Validação Completa dos dígitos verificadores)
  const cleanCPF = cpf.replace(/\D/g, '');
  if (!validateCPF(cpf)) {
    showInputFeedback('register-cpf', 'feedback-register-cpf', 'CPF inválido (verifique os números)');
    valid = false;
  } else {
    hideInputFeedback('register-cpf', 'feedback-register-cpf');
  }

  // Sexo e Data de Nascimento
  if (!sex) {
    showToast('Por favor, selecione o sexo.', 'warning');
    valid = false;
  }

  if (!birthDate) {
    showToast('A data de nascimento é obrigatória.', 'warning');
    valid = false;
  }

  // Senha
  const pwdValidation = validatePassword(password);
  if (!pwdValidation.valid) {
    showInputFeedback('register-password', 'feedback-register-password', pwdValidation.errors[0] || 'Senha fraca');
    valid = false;
  } else {
    hideInputFeedback('register-password', 'feedback-register-password');
  }

  // Confirmação
  if (password !== confirm) {
    showInputFeedback('register-password-confirm', 'feedback-register-password-confirm', 'As senhas não coincidem');
    valid = false;
  } else {
    hideInputFeedback('register-password-confirm', 'feedback-register-password-confirm');
  }

  if (!valid) return;

  try {
    await apiService.register({
      nome: name,
      email: email,
      telefone: phone,
      cpf: cleanCPF,
      sexo: sex,
      dataNascimento: birthDate,
      senha: password
    });

    showToast('Cadastro realizado com sucesso no banco de dados! Faça login para continuar.', 'success');

    // Limpa formulário e joga na aba de login
    document.getElementById('form-register').reset();
    setTimeout(() => {
      switchAuthTab('login');
      const loginEmail = document.getElementById('login-email');
      if (loginEmail) loginEmail.value = email;
    }, 1200);
  } catch (err) {
    showToast(err.message || 'Erro ao realizar cadastro no servidor.', 'error');
  }
}

/**
 * Solicitação de recuperação de senha
 */
function handleForgotPassword(e) {
  e.preventDefault();

  const emailInput = document.getElementById('forgot-email');
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';

  if (!validateEmail(email)) {
    showInputFeedback('forgot-email', 'feedback-forgot-email', 'Informe um e-mail válido');
    return;
  }
  hideInputFeedback('forgot-email', 'feedback-forgot-email');

  const cpfInput = document.getElementById('forgot-cpf');
  const cpfDigits = cpfInput ? cpfInput.value.replace(/\D/g, '') : '';
  if (cpfDigits.length !== 11) {
    showInputFeedback('forgot-cpf', 'feedback-forgot-cpf', 'Informe o CPF completo (11 dígitos)');
    return;
  }
  hideInputFeedback('forgot-cpf', 'feedback-forgot-cpf');

  resetTargetEmail = email;
  resetTargetCpf = cpfDigits;
  showToast('Dados recebidos! Digite sua nova senha.', 'info');
  showAuthSubView('reset');
}

/**
 * Redefinição final da senha via backend com BCrypt
 */
async function handleResetPassword(e) {
  e.preventDefault();

  if (!resetTargetEmail) {
    showToast('Sessão de recuperação expirada. Solicite novamente.', 'error');
    showAuthSubView('forgot');
    return;
  }

  const newPassInput = document.getElementById('reset-new-password');
  const confirmPassInput = document.getElementById('reset-confirm-password');
  const newPassword = newPassInput ? newPassInput.value : '';
  const confirmPassword = confirmPassInput ? confirmPassInput.value : '';

  let valid = true;

  const pwdValidation = validatePassword(newPassword);
  if (!pwdValidation.valid) {
    showInputFeedback('reset-new-password', 'feedback-reset-new-password', pwdValidation.errors[0] || 'Senha fraca');
    valid = false;
  } else {
    hideInputFeedback('reset-new-password', 'feedback-reset-new-password');
  }

  if (newPassword !== confirmPassword) {
    showInputFeedback('reset-confirm-password', 'feedback-reset-confirm-password', 'As senhas não coincidem');
    valid = false;
  } else {
    hideInputFeedback('reset-confirm-password', 'feedback-reset-confirm-password');
  }

  if (!valid) return;

  try {
    await apiService.resetPassword(resetTargetEmail, resetTargetCpf, newPassword);
    showToast('Senha redefinida com sucesso com BCrypt! Você já pode entrar.', 'success');

    resetTargetEmail = null;
    resetTargetCpf = null;
    document.getElementById('form-reset-password').reset();
    setTimeout(() => {
      switchAuthTab('login');
    }, 1200);
  } catch (err) {
    showToast(err.message || 'Erro ao redefinir senha no servidor.', 'error');
  }
}

/**
 * Encerra sessão do usuário
 */
function handleLogout() {
  clearCurrentUser();
  updateHeaderByRole();
  navigateTo('home');
  showToast('Sessão encerrada com sucesso.', 'info');
}

/**
 * Atualiza os 4 menus de navegação conforme o papel do usuário
 */
function updateHeaderByRole() {
  const user = getCurrentUser();

  const menuLoggedOut = document.getElementById('menu-logged-out');
  const menuPaciente = document.getElementById('menu-paciente');
  const menuMedico = document.getElementById('menu-medico');
  const menuAdmin = document.getElementById('menu-admin');

  // Esconder todos
  [menuLoggedOut, menuPaciente, menuMedico, menuAdmin].forEach(m => {
    if (m) m.style.display = 'none';
  });

  if (!user) {
    if (menuLoggedOut) menuLoggedOut.style.display = 'flex';
    return;
  }

  const firstName = user.name.split(' ')[0];
  const initial = (user.name.charAt(0) || 'U').toUpperCase();

  if (user.role === 'admin') {
    if (menuAdmin) menuAdmin.style.display = 'flex';
    const nameEl = document.getElementById('user-name-admin');
    const avatarEl = document.getElementById('user-avatar-admin');
    const roleEl = document.getElementById('user-role-admin');
    if (nameEl) nameEl.textContent = firstName;
    if (avatarEl) avatarEl.textContent = initial;
    if (roleEl) roleEl.textContent = 'Administrador';
  } else if (user.role === 'medico') {
    if (menuMedico) menuMedico.style.display = 'flex';
    const nameEl = document.getElementById('user-name-medico');
    const avatarEl = document.getElementById('user-avatar-medico');
    const roleEl = document.getElementById('user-role-medico');
    if (nameEl) nameEl.textContent = firstName;
    if (avatarEl) avatarEl.textContent = initial;
    if (roleEl) roleEl.textContent = 'Médico';
  } else {
    // Paciente
    if (menuPaciente) menuPaciente.style.display = 'flex';
    const nameEl = document.getElementById('user-name-paciente');
    const avatarEl = document.getElementById('user-avatar-paciente');
    const roleEl = document.getElementById('user-role-paciente');
    if (nameEl) nameEl.textContent = firstName;
    if (avatarEl) avatarEl.textContent = initial;
    if (roleEl) roleEl.textContent = 'Paciente';
  }
}

// Helpers de validação visual
function showInputFeedback(inputId, feedbackId, message) {
  const input = document.getElementById(inputId);
  const feedback = document.getElementById(feedbackId);
  if (input) input.classList.add('input-error');
  if (feedback) {
    if (message) feedback.textContent = message;
    feedback.classList.add('error');
  }
}

function hideInputFeedback(inputId, feedbackId) {
  const input = document.getElementById(inputId);
  const feedback = document.getElementById(feedbackId);
  if (input) input.classList.remove('input-error');
  if (feedback) feedback.classList.remove('error');
}
