# Sistema de Agendamento de Consultas Médicas — Hospital Beneficência Portuguesa

---

## O que é o projeto?

Desenvolvemos um sistema web completo de agendamento de consultas médicas para o **Hospital Beneficência Portuguesa de São José do Rio Preto**. O objetivo é permitir que os pacientes agendem, acompanhem e realizem o pagamento de suas consultas de forma simples e rápida, sem precisar sair de casa ou ir pessoalmente ao hospital.

O sistema conta com **integração completa entre Front-end, Back-end (Java / Spring Boot) e Banco de Dados (Microsoft SQL Server)**, além de ter sido desenvolvido com foco na **segurança dos dados**, protegendo as informações pessoais dos usuários conforme a **Lei Geral de Proteção de Dados (LGPD)** — utilizando criptografia de senhas com **BCrypt**, autenticação via tokens assinados (**HMAC-SHA256**) e controle de acesso por perfil (`ADMIN`, `MEDICO` e `PACIENTE`).

**Status do Projeto:** Finalizado e integrado (Front-end + API REST Spring Boot + SQL Server / SSMS).

---

## Funcionalidades Principais

* **Paciente:** Cadastro com validação de CPF, login, recuperação/alteração de senha, agendamento inteligente por especialidade e turno, pagamento de consultas (PIX, Cartão ou Boleto), histórico completo e cálculo automático de total gasto.
* **Médico:** Visualização da agenda diária e semanal, registro de prontuário/observações clínicas, conclusão ou cancelamento de consultas, gerenciamento de horários disponíveis e indicadores de produtividade.
* **Administrador:** Painel completo (CRUD) de especialidades, médicos (relacionamento N × N com especialidades), pacientes, agendas, consultas e pagamentos, além de relatórios gerenciais em tempo real alimentados por *Views* e *Functions* do SQL Server.

---

## Tecnologias Utilizadas

* **Front-end:** HTML5, CSS3, JavaScript (SPA modularizado)
* **Back-end:** Java 21, Spring Boot 4.1.1, Spring Data JPA (Hibernate), Spring Security
* **Banco de Dados:** Microsoft SQL Server (SSMS) — com tabelas geradas via JPA (`ddl-auto=update`), *Views*, *Stored Procedures*, *Functions* e restrições `CHECK`

---

## Identidade Visual

As cores e a estética do site seguem a identidade visual do próprio **Hospital Beneficência Portuguesa** (vermelho institucional `#C41E24`, verde `#2D8C3C` e fundo claro `#F8FAFC`), garantindo que a experiência online seja consistente com a instituição.

---

## Equipe — The midnight boys

* Arthur Gabriel de Mendonça
* Leonardo Francisco Gaitan Juliano
* Vitor Henrique Pereira de Lima
* Lucas Ricardo de Jesus Rodrigues
* Christian Vettorazzo de Castro

---

## Informações Acadêmicas

**Curso:** Informática para Negócios — 4° Semestre  
**Instituição:** FATEC São José do Rio Preto  
**Período:** 2° Semestre de 2026
