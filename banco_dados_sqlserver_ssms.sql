
USE clinica;
GO

-- ============================================================================
-- 1. RESTRIÇÕES DE VALIDAÇÃO (CHECK) E ÍNDICES NAS TABELAS CRIADAS PELO SPRING
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_tbpessoas_perfil')
    ALTER TABLE dbo.tbpessoas ADD CONSTRAINT CK_tbpessoas_perfil
        CHECK (perfil IN ('ADMIN', 'MEDICO', 'PACIENTE'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_tbpacientes_sexo')
    ALTER TABLE dbo.tbpacientes ADD CONSTRAINT CK_tbpacientes_sexo
        CHECK (sexo IN ('M', 'F', 'O'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_tbconsultas_status')
    ALTER TABLE dbo.tbconsultas ADD CONSTRAINT CK_tbconsultas_status
        CHECK (status IN ('pendente', 'confirmado', 'pago', 'concluido', 'cancelado'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_tbpagamentos_status')
    ALTER TABLE dbo.tbpagamentos ADD CONSTRAINT CK_tbpagamentos_status
        CHECK (status IN ('pendente', 'pago', 'cancelado', 'estornado'));
GO

-- Índices para acelerar joins nas chaves estrangeiras
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbmedico_especialidade_id_especialidade')
    CREATE INDEX IX_tbmedico_especialidade_id_especialidade ON dbo.tbmedico_especialidade(id_especialidade);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbagenda_id_profissional')
    CREATE INDEX IX_tbagenda_id_profissional ON dbo.tbagenda(id_profissional);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbagenda_id_paciente')
    CREATE INDEX IX_tbagenda_id_paciente ON dbo.tbagenda(id_paciente);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbconsultas_id_paciente')
    CREATE INDEX IX_tbconsultas_id_paciente ON dbo.tbconsultas(id_paciente);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbconsultas_id_profissional')
    CREATE INDEX IX_tbconsultas_id_profissional ON dbo.tbconsultas(id_profissional);
GO

-- ============================================================================
-- 2. VIEWS
-- ============================================================================

-- View 1: relatório geral de consultas (paciente, médico, especialidade e pagamento)
CREATE OR ALTER VIEW dbo.vw_ConsultasDetalhadas AS
SELECT
    c.id AS id_consulta,
    c.data_hora,
    c.status AS status_consulta,
    c.valor AS valor_consulta,
    c.observacoes,
    pes_pac.nome AS nome_paciente,
    pes_pac.cpf AS cpf_paciente,
    pes_pac.telefone AS telefone_paciente,
    pes_med.nome AS nome_medico,
    m.numero_registro AS crm_medico,
    (SELECT STRING_AGG(e.descricao, ', ') WITHIN GROUP (ORDER BY e.descricao)
       FROM dbo.tbmedico_especialidade me
       INNER JOIN dbo.tbespecialidades e ON e.id = me.id_especialidade
      WHERE me.id_medico = m.id_usuario) AS especialidade,
    ISNULL(pg.status, 'nao_gerado') AS status_pagamento,
    pg.forma_pagamento,
    pg.data_pagamento
FROM dbo.tbconsultas c
INNER JOIN dbo.tbpacientes pac ON c.id_paciente = pac.id_usuario
INNER JOIN dbo.tbpessoas pes_pac ON pac.id_usuario = pes_pac.id
INNER JOIN dbo.tbmedicos m ON c.id_profissional = m.id_usuario
INNER JOIN dbo.tbpessoas pes_med ON m.id_usuario = pes_med.id
LEFT JOIN dbo.tbpagamentos pg ON c.id = pg.id_consulta;
GO

-- View 2: faturamento consolidado por especialidade
CREATE OR ALTER VIEW dbo.vw_FaturamentoPorEspecialidade AS
SELECT
    esp.descricao AS especialidade,
    COUNT(c.id) AS total_consultas,
    ISNULL(SUM(c.valor), 0.00) AS faturamento_total,
    ISNULL(AVG(c.valor), 0.00) AS ticket_medio
FROM dbo.tbespecialidades esp
LEFT JOIN dbo.tbmedico_especialidade me ON esp.id = me.id_especialidade
LEFT JOIN dbo.tbconsultas c ON me.id_medico = c.id_profissional AND c.status <> 'cancelado'
GROUP BY esp.descricao;
GO

-- View 3: relatório diário - consultas do dia atual
CREATE OR ALTER VIEW dbo.vw_RelatorioDiario AS
SELECT
    c.id AS id_consulta,
    c.data_hora,
    up.nome AS paciente,
    ur.nome AS profissional,
    (SELECT STRING_AGG(e.descricao, ', ') WITHIN GROUP (ORDER BY e.descricao)
       FROM dbo.tbmedico_especialidade me
       INNER JOIN dbo.tbespecialidades e ON e.id = me.id_especialidade
      WHERE me.id_medico = pr.id_usuario) AS especialidade,
    c.status AS status_cons,
    c.valor AS valor_cons,
    pg.status AS status_pagamento,
    pg.forma_pagamento AS metodo_pagamento
FROM dbo.tbconsultas c
INNER JOIN dbo.tbpacientes pa ON c.id_paciente = pa.id_usuario
INNER JOIN dbo.tbpessoas up ON pa.id_usuario = up.id
INNER JOIN dbo.tbmedicos pr ON c.id_profissional = pr.id_usuario
INNER JOIN dbo.tbpessoas ur ON pr.id_usuario = ur.id
LEFT JOIN dbo.tbpagamentos pg ON c.id = pg.id_consulta
WHERE CAST(c.data_hora AS DATE) = CAST(GETDATE() AS DATE);
GO

-- View 4: horários vagos dos médicos
CREATE OR ALTER VIEW dbo.vw_HorariosVagos AS
SELECT
    a.id AS id_agenda,
    u.nome AS profissional,
    p.numero_registro AS crm,
    p.descricao,
    (SELECT STRING_AGG(e.descricao, ', ') WITHIN GROUP (ORDER BY e.descricao)
       FROM dbo.tbmedico_especialidade me
       INNER JOIN dbo.tbespecialidades e ON e.id = me.id_especialidade
      WHERE me.id_medico = p.id_usuario) AS especialidade,
    a.[data],
    a.hora_inicio,
    a.hora_fim,
    p.valor_consulta
FROM dbo.tbagenda a
INNER JOIN dbo.tbmedicos p ON a.id_profissional = p.id_usuario
INNER JOIN dbo.tbpessoas u ON p.id_usuario = u.id
WHERE a.disponivel = 1;
GO

-- ============================================================================
-- 3. STORED PROCEDURES
-- ============================================================================

-- Procedure 1: agenda uma consulta (valida paciente, médico e conflito de horário)
CREATE OR ALTER PROCEDURE dbo.agendar_consulta
    @p_id_paciente INT,
    @p_id_medico INT,
    @p_data_hora DATETIME,
    @p_valor DECIMAL(10,2),
    @p_novo_id_consulta INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM dbo.tbpacientes WHERE id_usuario = @p_id_paciente)
            THROW 50001, 'Paciente não encontrado.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.tbmedicos WHERE id_usuario = @p_id_medico)
            THROW 50002, 'Médico não encontrado.', 1;

        IF EXISTS (SELECT 1 FROM dbo.tbconsultas
                   WHERE id_profissional = @p_id_medico
                     AND data_hora = @p_data_hora
                     AND status <> 'cancelado')
            THROW 50003, 'Este horário já está ocupado para o médico selecionado.', 1;

        INSERT INTO dbo.tbconsultas (id_paciente, id_profissional, data_hora, status, valor, observacoes)
        VALUES (@p_id_paciente, @p_id_medico, @p_data_hora, 'pendente', @p_valor, 'Consulta agendada pelo portal web');

        SET @p_novo_id_consulta = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- Procedure 2: registra o pagamento de uma consulta
CREATE OR ALTER PROCEDURE dbo.registrar_pagamento
    @p_id_consulta INT,
    @p_forma_pagamento VARCHAR(30),
    @p_valor DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @status_atual VARCHAR(20);
        SELECT @status_atual = status FROM dbo.tbconsultas WHERE id = @p_id_consulta;

        IF @status_atual IS NULL
            THROW 50010, 'Consulta informada não existe.', 1;

        IF @status_atual = 'cancelado'
            THROW 50011, 'Não é possível pagar uma consulta cancelada.', 1;

        IF EXISTS (SELECT 1 FROM dbo.tbpagamentos WHERE id_consulta = @p_id_consulta AND status = 'pago')
            THROW 50012, 'Esta consulta já foi paga.', 1;

        IF EXISTS (SELECT 1 FROM dbo.tbpagamentos WHERE id_consulta = @p_id_consulta)
        BEGIN
            UPDATE dbo.tbpagamentos
            SET valor = @p_valor,
                data_pagamento = GETDATE(),
                status = 'pago',
                forma_pagamento = @p_forma_pagamento
            WHERE id_consulta = @p_id_consulta;
        END
        ELSE
        BEGIN
            INSERT INTO dbo.tbpagamentos (id_consulta, valor, data_pagamento, status, forma_pagamento)
            VALUES (@p_id_consulta, @p_valor, GETDATE(), 'pago', @p_forma_pagamento);
        END

        UPDATE dbo.tbconsultas
        SET status = 'pago'
        WHERE id = @p_id_consulta AND status IN ('pendente', 'confirmado');

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- Procedure 3: cancela um agendamento e devolve linha com "sucesso" e "mensagem"
CREATE OR ALTER PROCEDURE dbo.cancelar_agendamento
    @p_id_agendamento INT,
    @p_motivo NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.tbconsultas WHERE id = @p_id_agendamento)
    BEGIN
        SELECT CAST(0 AS BIT) AS sucesso, 'Agendamento não encontrado!' AS mensagem;
    END
    ELSE IF EXISTS (SELECT 1 FROM dbo.tbconsultas WHERE id = @p_id_agendamento AND status = 'cancelado')
    BEGIN
        SELECT CAST(0 AS BIT) AS sucesso, 'Este agendamento já está cancelado!' AS mensagem;
    END
    ELSE
    BEGIN
        UPDATE dbo.tbconsultas
        SET status = 'cancelado',
            observacoes = ISNULL(observacoes, '')
                + CASE WHEN @p_motivo IS NULL THEN '' ELSE ' [Cancelamento: ' + @p_motivo + ']' END
        WHERE id = @p_id_agendamento;

        UPDATE dbo.tbpagamentos
        SET status = 'estornado'
        WHERE id_consulta = @p_id_agendamento AND status = 'pago';

        SELECT CAST(1 AS BIT) AS sucesso, 'Agendamento cancelado com sucesso!' AS mensagem;
    END
END;
GO

-- ============================================================================
-- 4. FUNCTIONS
-- ============================================================================

-- Function 1 (escalar): total pago por um paciente
CREATE OR ALTER FUNCTION dbo.fn_CalcularTotalGastoPaciente (@p_id_paciente INT)
RETURNS DECIMAL(10,2)
AS
BEGIN
    DECLARE @total DECIMAL(10,2);
    SELECT @total = ISNULL(SUM(pg.valor), 0.00)
    FROM dbo.tbpagamentos pg
    INNER JOIN dbo.tbconsultas c ON pg.id_consulta = c.id
    WHERE c.id_paciente = @p_id_paciente AND pg.status = 'pago';
    RETURN @total;
END;
GO

-- Function 2 (inline table-valued): consultas em um período
CREATE OR ALTER FUNCTION dbo.fn_ListarConsultasPorPeriodo (
    @p_data_inicio DATE,
    @p_data_fim DATE
)
RETURNS TABLE
AS
RETURN (
    SELECT
        c.id,
        c.data_hora,
        p_pac.nome AS paciente,
        p_med.nome AS medico,
        c.valor,
        c.status
    FROM dbo.tbconsultas c
    INNER JOIN dbo.tbpessoas p_pac ON c.id_paciente = p_pac.id
    INNER JOIN dbo.tbpessoas p_med ON c.id_profissional = p_med.id
    WHERE c.data_hora >= CAST(@p_data_inicio AS DATETIME)
      AND c.data_hora < DATEADD(DAY, 1, CAST(@p_data_fim AS DATETIME))
);
GO

-- Function 3 (multi-statement table-valued): resumo de produtividade do médico
CREATE OR ALTER FUNCTION dbo.fn_RelatorioProdutividadeMedica (@p_id_medico INT)
RETURNS @Resumo TABLE (
    id_medico INT,
    nome_medico VARCHAR(100),
    total_agendamentos INT,
    total_concluidos INT,
    total_cancelados INT,
    receita_gerada DECIMAL(10,2)
)
AS
BEGIN
    DECLARE @nome VARCHAR(100);
    DECLARE @agendados INT, @concluidos INT, @cancelados INT;
    DECLARE @receita DECIMAL(10,2);

    SELECT @nome = p.nome
    FROM dbo.tbmedicos m
    INNER JOIN dbo.tbpessoas p ON m.id_usuario = p.id
    WHERE m.id_usuario = @p_id_medico;

    SELECT
        @agendados = COUNT(*),
        @concluidos = ISNULL(SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END), 0),
        @cancelados = ISNULL(SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END), 0),
        @receita = ISNULL(SUM(CASE WHEN status <> 'cancelado' THEN valor ELSE 0 END), 0.00)
    FROM dbo.tbconsultas
    WHERE id_profissional = @p_id_medico;

    INSERT INTO @Resumo VALUES (@p_id_medico, @nome, @agendados, @concluidos, @cancelados, @receita);
    RETURN;
END;
GO

-- ============================================================================
-- 5. DADOS INICIAIS 
-- ============================================================================

-- Especialidades
INSERT INTO dbo.tbespecialidades (descricao)
SELECT v.descricao
FROM (VALUES
    ('Cardiologia'),
    ('Pediatria'),
    ('Ortopedia'),
    ('Dermatologia'),
    ('Ginecologia'),
    ('Clínica Geral')
) AS v(descricao)
WHERE NOT EXISTS (SELECT 1 FROM dbo.tbespecialidades e WHERE e.descricao = v.descricao);
GO

-- Administrador, médicos e pacientes (senhas com BCrypt)
INSERT INTO dbo.tbpessoas (nome, cpf, email, senha, telefone, perfil)
SELECT v.nome, v.cpf, v.email, v.senha, v.telefone, v.perfil
FROM (VALUES
    ('Administrador Geral', '000.000.000-00', 'admin@beneficencia.com.br', '$2a$10$aJOvZz6Kr2pmcaIlcLIfEe6RmVxksQg7GS3X4CfS69g676eUTbpRG', '(17) 99999-0000', 'ADMIN'),
    ('Dr. Henrique Barros', '111.111.111-11', 'henrique@beneficencia.com.br', '$2a$10$tuxh20K6i72iFHCeB35cTeAJ.gkujADNfPmmyuOjRvWN3pYYrGczm', '(17) 99999-0001', 'MEDICO'),
    ('Dra. Camila Rodrigues', '222.222.222-22', 'camila@beneficencia.com.br', '$2a$10$tuxh20K6i72iFHCeB35cTeAJ.gkujADNfPmmyuOjRvWN3pYYrGczm', '(17) 99999-0002', 'MEDICO'),
    ('Dr. Roberto Martins', '333.333.333-33', 'roberto@beneficencia.com.br', '$2a$10$tuxh20K6i72iFHCeB35cTeAJ.gkujADNfPmmyuOjRvWN3pYYrGczm', '(17) 99999-0003', 'MEDICO'),
    ('Dra. Sofia Mendes', '444.444.444-44', 'sofia@beneficencia.com.br', '$2a$10$tuxh20K6i72iFHCeB35cTeAJ.gkujADNfPmmyuOjRvWN3pYYrGczm', '(17) 99999-0004', 'MEDICO'),
    ('Dr. Maurício Neves', '555.555.555-55', 'mauricio@beneficencia.com.br', '$2a$10$tuxh20K6i72iFHCeB35cTeAJ.gkujADNfPmmyuOjRvWN3pYYrGczm', '(17) 99999-0005', 'MEDICO'),
    ('Dra. Letícia Costa', '666.666.666-66', 'leticia@beneficencia.com.br', '$2a$10$tuxh20K6i72iFHCeB35cTeAJ.gkujADNfPmmyuOjRvWN3pYYrGczm', '(17) 99999-0006', 'MEDICO'),
    ('Dr. Felipe Nogueira', '777.777.777-77', 'felipe@beneficencia.com.br', '$2a$10$tuxh20K6i72iFHCeB35cTeAJ.gkujADNfPmmyuOjRvWN3pYYrGczm', '(17) 99999-0007', 'MEDICO'),
    ('Dra. Cláudia Lima', '888.888.888-88', 'claudia@beneficencia.com.br', '$2a$10$tuxh20K6i72iFHCeB35cTeAJ.gkujADNfPmmyuOjRvWN3pYYrGczm', '(17) 99999-0008', 'MEDICO'),
    ('Dra. Patrícia Silveira', '999.999.999-99', 'patricia@beneficencia.com.br', '$2a$10$tuxh20K6i72iFHCeB35cTeAJ.gkujADNfPmmyuOjRvWN3pYYrGczm', '(17) 99999-0009', 'MEDICO'),
    ('Dra. Mariana Souza', '101.010.101-01', 'mariana@beneficencia.com.br', '$2a$10$tuxh20K6i72iFHCeB35cTeAJ.gkujADNfPmmyuOjRvWN3pYYrGczm', '(17) 99999-0010', 'MEDICO'),
    ('Dr. Thiago Santos', '121.212.121-21', 'thiago@beneficencia.com.br', '$2a$10$tuxh20K6i72iFHCeB35cTeAJ.gkujADNfPmmyuOjRvWN3pYYrGczm', '(17) 99999-0011', 'MEDICO'),
    ('Dra. Luciana Fonseca', '131.313.131-31', 'luciana@beneficencia.com.br', '$2a$10$tuxh20K6i72iFHCeB35cTeAJ.gkujADNfPmmyuOjRvWN3pYYrGczm', '(17) 99999-0012', 'MEDICO'),
    ('Arthur Silva', '123.456.789-09', 'arthur@beneficencia.com.br', '$2a$10$bYr.u/epDBq6lkoCD2sxiOI1m3WKRVESHJP4.aMk6FoxaFSFbQ6By', '(17) 98888-1122', 'PACIENTE'),
    ('Carlos Pereira', '987.654.321-00', 'carlos@beneficencia.com.br', '$2a$10$bYr.u/epDBq6lkoCD2sxiOI1m3WKRVESHJP4.aMk6FoxaFSFbQ6By', '(17) 97777-3344', 'PACIENTE')
) AS v(nome, cpf, email, senha, telefone, perfil)
WHERE NOT EXISTS (SELECT 1 FROM dbo.tbpessoas p WHERE p.email = v.email);
GO

-- Médicos (CRM, descrição, valor da consulta e turno)
INSERT INTO dbo.tbmedicos (id_usuario, numero_registro, descricao, valor_consulta, turno)
SELECT p.id, v.crm, v.descricao, v.valor, v.turno
FROM (VALUES
    ('henrique@beneficencia.com.br', 'CRM 45892-SP', 'Especialista em cardiologia clínica e arritmias cardíacas.', 250.00, 'morning'),
    ('camila@beneficencia.com.br', 'CRM 98563-SP', 'Especialista em cardiologia preventiva e exames gráficos.', 250.00, 'afternoon'),
    ('roberto@beneficencia.com.br', 'CRM 33621-SP', 'Acompanhamento infantil geral, crescimento e neonatologia.', 220.00, 'morning'),
    ('sofia@beneficencia.com.br', 'CRM 77482-SP', 'Pediatra especialista em desenvolvimento e nutrição infantil.', 220.00, 'afternoon'),
    ('mauricio@beneficencia.com.br', 'CRM 11452-SP', 'Ortopedista especializado em traumatologia e lesões no joelho.', 240.00, 'morning'),
    ('leticia@beneficencia.com.br', 'CRM 88965-SP', 'Foco em reabilitação ortopédica, coluna e cirurgias minimamente invasivas.', 240.00, 'afternoon'),
    ('felipe@beneficencia.com.br', 'CRM 55698-SP', 'Dermatologia clínica, controle de acne e detecção de câncer de pele.', 280.00, 'morning'),
    ('claudia@beneficencia.com.br', 'CRM 22485-SP', 'Especialista em dermatologia estética e correção de cicatrizes.', 280.00, 'afternoon'),
    ('patricia@beneficencia.com.br', 'CRM 99512-SP', 'Ginecologia preventiva, exames de rotina e obstetrícia de baixo risco.', 260.00, 'morning'),
    ('mariana@beneficencia.com.br', 'CRM 44785-SP', 'Acompanhamento gestacional de alto risco e climatério.', 260.00, 'afternoon'),
    ('thiago@beneficencia.com.br', 'CRM 66321-SP', 'Atendimento clínico geral, check-up anual e medicina preventiva.', 180.00, 'morning'),
    ('luciana@beneficencia.com.br', 'CRM 88741-SP', 'Saúde da família, controle de hipertensão e diabetes.', 180.00, 'afternoon')
) AS v(email, crm, descricao, valor, turno)
INNER JOIN dbo.tbpessoas p ON p.email = v.email
WHERE NOT EXISTS (SELECT 1 FROM dbo.tbmedicos m WHERE m.id_usuario = p.id);
GO

-- Pacientes
INSERT INTO dbo.tbpacientes (id_usuario, sexo, data_nascimento)
SELECT p.id, v.sexo, CAST(v.nascimento AS DATE)
FROM (VALUES
    ('arthur@beneficencia.com.br', 'M', '2000-05-15'),
    ('carlos@beneficencia.com.br', 'M', '1992-09-30')
) AS v(email, sexo, nascimento)
INNER JOIN dbo.tbpessoas p ON p.email = v.email
WHERE NOT EXISTS (SELECT 1 FROM dbo.tbpacientes pac WHERE pac.id_usuario = p.id);
GO

-- Vínculo N x N entre médicos e especialidades
INSERT INTO dbo.tbmedico_especialidade (id_medico, id_especialidade)
SELECT p.id, e.id
FROM (VALUES
    ('henrique@beneficencia.com.br', 'Cardiologia'),
    ('camila@beneficencia.com.br', 'Cardiologia'),
    ('roberto@beneficencia.com.br', 'Pediatria'),
    ('sofia@beneficencia.com.br', 'Pediatria'),
    ('mauricio@beneficencia.com.br', 'Ortopedia'),
    ('leticia@beneficencia.com.br', 'Ortopedia'),
    ('felipe@beneficencia.com.br', 'Dermatologia'),
    ('claudia@beneficencia.com.br', 'Dermatologia'),
    ('patricia@beneficencia.com.br', 'Ginecologia'),
    ('mariana@beneficencia.com.br', 'Ginecologia'),
    ('thiago@beneficencia.com.br', 'Clínica Geral'),
    ('luciana@beneficencia.com.br', 'Clínica Geral'),
    ('henrique@beneficencia.com.br', 'Clínica Geral')
) AS v(email, especialidade)
INNER JOIN dbo.tbpessoas p ON p.email = v.email
INNER JOIN dbo.tbespecialidades e ON e.descricao = v.especialidade
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.tbmedico_especialidade me
    WHERE me.id_medico = p.id AND me.id_especialidade = e.id
);
GO

-- Agenda: horários de atendimento dos próximos 30 dias (somente dias úteis)
IF NOT EXISTS (SELECT 1 FROM dbo.tbagenda)
BEGIN
    ;WITH dias AS (
        SELECT TOP (30) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
        FROM sys.all_objects
    )
    INSERT INTO dbo.tbagenda (id_profissional, [data], hora_inicio, hora_fim, disponivel)
    SELECT
        m.id_usuario,
        CAST(DATEADD(DAY, d.n, GETDATE()) AS DATE),
        CASE WHEN m.turno = 'morning' THEN CAST('08:00' AS TIME) ELSE CAST('13:30' AS TIME) END,
        CASE WHEN m.turno = 'morning' THEN CAST('11:30' AS TIME) ELSE CAST('16:30' AS TIME) END,
        1
    FROM dbo.tbmedicos m
    CROSS JOIN dias d
    WHERE DATEDIFF(DAY, 0, DATEADD(DAY, d.n, GETDATE())) % 7 < 5;
END
GO

-- Consultas de demonstração (uma paga, uma de hoje e uma pendente)
IF NOT EXISTS (SELECT 1 FROM dbo.tbconsultas)
BEGIN
    DECLARE @arthur INT = (SELECT id FROM dbo.tbpessoas WHERE email = 'arthur@beneficencia.com.br');
    DECLARE @carlos INT = (SELECT id FROM dbo.tbpessoas WHERE email = 'carlos@beneficencia.com.br');
    DECLARE @henrique INT = (SELECT id FROM dbo.tbpessoas WHERE email = 'henrique@beneficencia.com.br');
    DECLARE @camila INT = (SELECT id FROM dbo.tbpessoas WHERE email = 'camila@beneficencia.com.br');
    DECLARE @roberto INT = (SELECT id FROM dbo.tbpessoas WHERE email = 'roberto@beneficencia.com.br');

    INSERT INTO dbo.tbconsultas (id_paciente, id_profissional, data_hora, status, valor, observacoes) VALUES
    (@arthur, @henrique, DATEADD(HOUR, 9,  CAST(CAST(DATEADD(DAY, 1, GETDATE()) AS DATE) AS DATETIME)), 'pago',       250.00, 'Paciente relatou dores leves no peito em esforço físico.'),
    (@arthur, @camila,   DATEADD(HOUR, 15, CAST(CAST(GETDATE() AS DATE) AS DATETIME)),                  'confirmado', 250.00, 'Retorno para avaliação de exames.'),
    (@carlos, @roberto,  DATEADD(HOUR, 10, CAST(CAST(DATEADD(DAY, 2, GETDATE()) AS DATE) AS DATETIME)), 'pendente',   220.00, 'Consulta agendada pelo portal web');

    INSERT INTO dbo.tbpagamentos (id_consulta, valor, data_pagamento, status, forma_pagamento)
    SELECT c.id, c.valor, GETDATE(), 'pago', 'pix'
    FROM dbo.tbconsultas c
    WHERE c.status = 'pago';
END
GO

-- ============================================================================
-- 6. CONSULTAS DE APOIO (testes)
-- ============================================================================
/*
-- Relatório geral de consultas
SELECT * FROM dbo.vw_ConsultasDetalhadas ORDER BY data_hora;

-- Relatório diário e horários vagos
SELECT * FROM dbo.vw_RelatorioDiario ORDER BY data_hora ASC;
SELECT * FROM dbo.vw_HorariosVagos ORDER BY [data], hora_inicio;

-- Análise de médicos sem nenhuma consulta
SELECT p.id, p.nome, m.descricao
FROM dbo.tbpessoas p
INNER JOIN dbo.tbmedicos m ON p.id = m.id_usuario
LEFT JOIN dbo.tbconsultas c ON c.id_profissional = m.id_usuario
WHERE c.id IS NULL;

-- Teste das procedures e functions
EXEC dbo.cancelar_agendamento @p_id_agendamento = 1;
EXEC dbo.cancelar_agendamento @p_id_agendamento = 99999;
SELECT dbo.fn_CalcularTotalGastoPaciente(2) AS total_gasto;
SELECT * FROM dbo.fn_ListarConsultasPorPeriodo('2026-01-01', '2026-12-31');
SELECT * FROM dbo.fn_RelatorioProdutividadeMedica(2);
*/

-- ============================================================================
-- 7. BACKUP E RESTORE 
-- ============================================================================
/*
BACKUP DATABASE clinica
TO DISK = 'C:\Backup\clinica_completo.bak'
WITH FORMAT, NAME = 'Backup completo da clinica';
GO

USE master;
GO
ALTER DATABASE clinica SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO
RESTORE DATABASE clinica
FROM DISK = 'C:\Backup\clinica_completo.bak'
WITH REPLACE;
GO
ALTER DATABASE clinica SET MULTI_USER;
GO
*/


select * from tbpessoas
select * from tbmedico_especialidade
select * from tbespecialidades