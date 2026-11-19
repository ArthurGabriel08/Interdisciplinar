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
 │   - ddl-auto=none (o script SQL define o banco)         │
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
- **Criptografia de Senhas com BCrypt:** Nenhuma senha é armazenada em texto puro no banco de dados. Todos os registros iniciais do script SQL possuem hashes BCrypt válidos (ex: `$2a$10$hbxecwitQQ.dDT4JOFzQAulNySFwEpaFLw38jda6Td.Y/cOiRzDFu`).
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

1. **Banco:** abra `banco_dados_sqlserver.sql` no SSMS e execute o script **inteiro** (F5). Pare o Spring Boot antes, porque o script recria o banco.
2. **Back-end e front-end juntos:** na pasta `Backend_ClinicaV2`, rode `mvn spring-boot:run`. O Spring Boot também serve o front-end (a pasta irmã `Frontend_HBSaude`).
3. **Abra** `http://localhost:8080` no navegador.

Se a sua instalação usa outra senha do `sa`, outra porta ou instância nomeada, ajuste `spring.datasource.url`, `username` e `password` em `application.properties`.

## 🔑 Usuários de Demonstração
| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@beneficencia.com.br` | `Admin@123` |
| Médicos (12) | `henrique@`, `camila@`, `roberto@`, `sofia@`, `mauricio@`, `leticia@`, `felipe@`, `claudia@`, `patricia@`, `mariana@`, `thiago@` e `luciana@` + `beneficencia.com.br` | `Medico@123` |
| Pacientes | `arthur@beneficencia.com.br` e `carlos@beneficencia.com.br` | `Paciente@123` |
