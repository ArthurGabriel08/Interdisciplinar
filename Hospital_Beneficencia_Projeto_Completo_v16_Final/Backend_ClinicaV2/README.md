# 🏥 Hospital Beneficência Portuguesa de São José do Rio Preto
## Sistema Integrado de Agendamento de Consultas Médicas (MVP Web)
**Projeto de Extensão Comunitária — FATEC São José do Rio Preto**  
*Curso Superior de Tecnologia em Informática para Negócios — 4º Semestre (2º Semestre de 2026)*

---

## 👥 Equipe de Desenvolvimento (The Midnight Boys)
- **Arthur Gabriel de Mendonça** (*Líder do Projeto*)
- **Leonardo Francisco Gaitan Juliano**
- **Vitor Henrique Pereira de Lima**
- **Lucas Ricardo de Jesus Rodrigues**
- **Christian Vettorazzo de Castro**

---

## 💡 Sobre o Projeto
O presente projeto consiste no desenvolvimento de um **Mínimo Produto Viável (MVP)** de uma aplicação Web corporativa voltada para a gestão de agendamentos, escalas médicas, controle de atendimentos e pagamentos do **Hospital Beneficência Portuguesa de São José do Rio Preto**.

O sistema foi arquitetado para atender aos rigorosos critérios acadêmicos e técnicos das disciplinas de **Engenharia de Software, Programação Orientada a Objetos / Web (Java 21 + Spring Boot 4.1.1) e Administração de Banco de Dados (Microsoft SQL Server 2025)**, garantindo conformidade com a **Lei Geral de Proteção de Dados (LGPD)** e padrões modernos de usabilidade (UI/UX).

---

## 🎨 Identidade Visual e Padrões da Organização
- **Instituição Parceira:** Hospital Beneficência Portuguesa — São José do Rio Preto / SP
- **Cores Oficiais:**
  - 🟥 **Vermelho Institucional:** `#C41E24` (destaque, botões principais e identidade da cruz)
  - 🟩 **Verde Institucional:** `#2D8C3C` (status de sucesso, confirmação e saúde)
  - ⚪ **Fundos e Contraste:** `#F8F9FA` e `#FFFFFF`
  - ⚫ **Tipografia:** Inter / Segoe UI (`#2D3748`)
- **Logotipo Oficial:** Integrado nos cabeçalhos, rodapés e telas de autenticação (`logo_beneficencia.png`).
- **E-mails Padronizados:** Todos os usuários institucionais utilizam o domínio oficial `@beneficencia.com.br`.

---

## 🏗️ Arquitetura Tecnológica da Solução

```
 ┌─────────────────────────────────────────────────────────┐
 │                   FRONT-END (SPA)                       │
 │  HTML5 Semântico + CSS3 Moderno (Grid/Flex) + JS Modular│
 │   - auth.js, paciente.js, medico.js, admin.js, utils.js │
 │   - Chamadas diretas à API REST (http://localhost:8080) │
 │   - Tratamento explícito de erros com toasts de feedback│
 └────────────────────────────┬────────────────────────────┘
                              │ HTTP REST (JSON / CORS)
 ┌────────────────────────────▼────────────────────────────┐
 │                 BACK-END (SPRING BOOT)                  │
 │  Java 21 + Spring Boot 4.1.1 + Spring Data JPA          │
 │   - Spring Security com Criptografia BCrypt (senhas)    │
 │   - Coluna 'perfil' ('ADMIN', 'MEDICO', 'PACIENTE')     │
 │   - Proteção @JsonProperty(access = WRITE_ONLY)         │
 │   - ddl-auto=update (Spring cria e altera as tabelas)   │
 │   - Controllers REST completos com CORS habilitado      │
 └────────────────────────────┬────────────────────────────┘
                              │ JDBC Driver (Porta 1433)
 ┌────────────────────────────▼────────────────────────────┐
 │             BANCO DE DADOS (SQL SERVER)                 │
 │  Microsoft SQL Server 2025 (ou 2022)                    │
 │   - Arquivo canônico único:                             │
 │     src/main/resources/banco_dados_sqlserver.sql        │
 │   - 8 Tabelas (com relacionamento N x N e restrições)   │
 │   - 3 Stored Procedures Transacionais                   │
 │   - 4 Views Analíticas (2 do script original)           │
 │   - 3 User-Defined Functions (Escalar, Inline, Multi)   │
 │   - Scripts Automatizados de Backup e Restore (+1.0 pt) │
 └─────────────────────────────────────────────────────────┘
```

---

## 🔒 Segurança da Informação e Spring Security
- **Autenticação Segura via API REST (`/auth/login`, `/auth/register`, `/auth/esqueci-senha`):** O login não é meramente cosmético no front-end; a requisição é validada no servidor pelo `AuthController` usando Spring Security com `BCryptPasswordEncoder`.
- **Criptografia de Senhas com BCrypt:** Nenhuma senha é armazenada em texto puro no banco de dados. Todos os registros iniciais do script SQL possuem hashes BCrypt válidos.
- **Segurança na Serialização JSON:** O atributo `senha` na entidade `PessoaEntity` está anotado com `@JsonProperty(access = JsonProperty.Access.WRITE_ONLY)`. Isso garante que endpoints públicos como `GET /pacientes`, `GET /medicos` e `GET /pessoas` **nunca** exponham o hash ou texto da senha aos clientes.
- **Controle de Perfil em Banco (`perfil`):** A coluna `perfil` em `tbpessoas` é tipada e validada via `CHECK (perfil IN ('ADMIN', 'MEDICO', 'PACIENTE'))`.

---

## 🗄️ Banco de Dados (SQL Server)
O script único do banco é `Backend_ClinicaV2/src/main/resources/banco_dados_sqlserver.sql`. Ele **apaga e recria** o banco `clinica` e foi montado a partir do script do responsável pelo banco (views `vw_RelatorioDiario` e `vw_HorariosVagos` e procedure `cancelar_agendamento`), adaptado às tabelas que o Spring Boot usa. **Não possui triggers.**

### Tabelas
| Tabela | Descrição |
|---|---|
| `tbpessoas` | Base de usuários: `id`, `nome`, `cpf`, `email`, `senha` (BCrypt), `telefone`, `perfil` (`ADMIN`, `MEDICO` ou `PACIENTE`) |
| `tbpacientes` | Paciente: `id_usuario`, `sexo`, `data_nascimento` |
| `tbmedicos` | Médico: `id_usuario`, `numero_registro` (CRM), `descricao`, `valor_consulta`, `turno` |
| `tbespecialidades` | Catálogo de especialidades |
| `tbmedico_especialidade` | Relacionamento **N x N** entre médicos e especialidades |
| `tbagenda` | Horários de atendimento: `id_profissional`, `id_paciente` (opcional), `data`, `hora_inicio`, `hora_fim`, `disponivel` |
| `tbconsultas` | Consultas: `id_paciente`, `id_profissional`, `data_hora`, `status`, `valor`, `observacoes` |
| `tbpagamentos` | Pagamentos (um por consulta): `id_consulta`, `valor`, `status`, `forma_pagamento` |

### Views, procedures e functions
- **Views:** `vw_ConsultasDetalhadas`, `vw_FaturamentoPorEspecialidade`, `vw_RelatorioDiario` e `vw_HorariosVagos` (as duas últimas vêm do script original).
- **Procedures:** `agendar_consulta`, `registrar_pagamento` e `cancelar_agendamento` (esta vem do script original, com as mesmas mensagens).
- **Functions:** `fn_CalcularTotalGastoPaciente` (escalar), `fn_ListarConsultasPorPeriodo` (tabela inline) e `fn_RelatorioProdutividadeMedica` (tabela multi-statement).
- **Backup e restore:** instruções comentadas no final do script.

---

## 🚀 Como Executar (tudo em http://localhost:8080)
**Pré-requisitos:** Java 21, Maven (ou o `mvnw` do projeto) e SQL Server (a edição Express serve) com **TCP/IP habilitado na porta 1433** e o usuário `sa` com a mesma senha de `spring.datasource.password` em `application.properties`.

1. **Banco vazio no SSMS:** execute `CREATE DATABASE clinica;` no SQL Server Management Studio.
2. **Spring Boot cria as tabelas:** na pasta `Backend_ClinicaV2`, rode `mvn spring-boot:run`. O Hibernate criará todas as tabelas automaticamente no banco `clinica`.
3. **Objetos do banco e dados iniciais:** execute o script externo `banco_dados_sqlserver_ssms.sql` no SSMS para criar as Views, Procedures, Functions e popular os dados de demonstração.
3. **Abra** `http://localhost:8080` no navegador.

Se a sua instalação usa outra senha do `sa`, outra porta ou instância nomeada, ajuste `spring.datasource.url`, `username` e `password` em `application.properties`.

## 🔑 Usuários de Demonstração
| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@beneficencia.com.br` | `Admin@123` |
| Médicos (12) | `henrique@`, `camila@`, `roberto@`, `sofia@`, `mauricio@`, `leticia@`, `felipe@`, `claudia@`, `patricia@`, `mariana@`, `thiago@` e `luciana@` + `beneficencia.com.br` | `Medico@123` |
| Pacientes | `arthur@beneficencia.com.br` e `carlos@beneficencia.com.br` | `Paciente@123` |

---

## Segurança da API (v5)

- **Login:** `POST /auth/login` devolve um token assinado (HMAC-SHA256, validade de 8 h). O front envia `Authorization: Bearer <token>` em toda requisição.
- **Perfis e permissões:**
  - **ADMIN:** CRUD de todas as tabelas, views e relatórios.
  - **MEDICO:** consulta a agenda geral, gerencia só a própria agenda e atende só as próprias consultas.
  - **PACIENTE:** agenda, paga e cancela só as próprias consultas e edita só o próprio cadastro.
- **Sem token ou token inválido/expirado:** `401`. **Perfil sem permissão ou dado de outra pessoa:** `403`.
- **Senhas:** sempre gravadas com BCrypt (login, cadastro público, cadastro feito pelo admin e recuperação de senha). Cadastro público é sempre `PACIENTE`.
- **Recuperação de senha:** `POST /auth/esqueci-senha` exige e-mail + CPF do titular + nova senha.
- **Segredo do token:** definido em `app.security.token-secret` (mínimo 32 caracteres). Em produção use a variável de ambiente `APP_TOKEN_SECRET`.

### Teste rápido (Postman ou curl)
```
POST http://localhost:8080/auth/login   {"email":"admin@beneficencia.com.br","senha":"Admin@123"}
GET  http://localhost:8080/pacientes     sem token  -> 401
GET  http://localhost:8080/pacientes     com token de PACIENTE -> 403
GET  http://localhost:8080/pacientes     com token de ADMIN    -> 200
```

---

## Integração front ↔ SQL Server (v6)

- **Dados vêm do banco:** ao fazer login, o front chama `syncFromApi()` e carrega do SQL Server as especialidades, os médicos (`GET /medicos/publico`, sem CPF/e-mail), as consultas do usuário (`GET /consultas/minhas`), os pagamentos e a agenda.
- **Procedures usadas pelas telas:**
  - Paciente agenda → `agendar_consulta` (`POST /api/database/procedures/agendar`; o valor vem do cadastro do médico).
  - Paciente paga → `registrar_pagamento` (`/procedures/pagar`).
  - Paciente ou médico cancela → `cancelar_agendamento` (`/procedures/cancelar`).
- **Functions exibidas nas telas:** `fn_CalcularTotalGastoPaciente` (histórico do paciente), `fn_RelatorioProdutividadeMedica` (consultas do médico) e `fn_ListarConsultasPorPeriodo` (relatório do admin).
- **Relatórios do admin:** Consultas Detalhadas, Faturamento por Especialidade, Agenda Disponível (`vw_HorariosVagos`), Relatório do Dia (`vw_RelatorioDiario`) e Consultas por Período.
- **Perfil:** paciente e médico gravam o próprio perfil no banco (`PUT /pacientes/{id}`, `PUT /medicos/{id}`), e a troca de senha usa `POST /auth/alterar-senha`.
- **Erros do SQL Server** (procedure, constraint) chegam ao front como mensagem legível no formato `{"mensagem": "..."}`.
