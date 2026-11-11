SET SERVEROUTPUT ON
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

CREATE OR REPLACE PROCEDURE prc_lembrei_gerar_rotina (
  p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
  p_data IN DATE,
  p_qtd_gerada OUT NUMBER
) IS
  v_usuario NUMBER;
  v_dia DATE := TRUNC(p_data);
  v_semana NUMBER;
  v_prevista TIMESTAMP;
BEGIN
  SAVEPOINT lembrei_rotina;
  IF p_id_usuario IS NULL OR p_data IS NULL THEN
    RAISE_APPLICATION_ERROR(-20010, 'Usuario e data sao obrigatorios.');
  END IF;
  SELECT id_usuario INTO v_usuario FROM usuario_lembrei
  WHERE id_usuario = p_id_usuario FOR UPDATE;
  v_semana := v_dia - TRUNC(v_dia, 'IW') + 1;
  p_qtd_gerada := 0;
  FOR h IN (
    SELECT h.id_horario, h.hora
    FROM horario_lembrei h JOIN item_lembrei i ON i.id_item = h.id_item
    WHERE i.id_usuario = p_id_usuario AND i.ativo = 'S'
      AND SUBSTR(i.dias_semana, v_semana, 1) = '1'
      AND i.dt_criacao < v_dia + 1
    ORDER BY h.id_horario
  ) LOOP
    v_prevista := CAST(v_dia AS TIMESTAMP)
      + NUMTODSINTERVAL(TO_NUMBER(SUBSTR(h.hora, 1, 2)) * 60
                       + TO_NUMBER(SUBSTR(h.hora, 4, 2)), 'MINUTE');
    INSERT INTO registro_dose_lembrei (id_horario, dt_prevista)
    SELECT h.id_horario, v_prevista FROM dual
    WHERE NOT EXISTS (
      SELECT 1 FROM registro_dose_lembrei r
      WHERE r.id_horario = h.id_horario AND r.dt_prevista = v_prevista
    );
    p_qtd_gerada := p_qtd_gerada + SQL%ROWCOUNT;
  END LOOP;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    ROLLBACK TO lembrei_rotina;
    RAISE_APPLICATION_ERROR(-20011, 'Usuario inexistente.');
  WHEN OTHERS THEN
    ROLLBACK TO lembrei_rotina;
    RAISE;
END prc_lembrei_gerar_rotina;
/
SHOW ERRORS PROCEDURE prc_lembrei_gerar_rotina

CREATE OR REPLACE PROCEDURE prc_lembrei_confirmar_dose (
  p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
  p_id_registro IN registro_dose_lembrei.id_registro%TYPE,
  p_dt_tomada IN TIMESTAMP DEFAULT LOCALTIMESTAMP
) IS
  v_status registro_dose_lembrei.status%TYPE;
BEGIN
  IF p_id_usuario IS NULL OR p_id_registro IS NULL OR p_dt_tomada IS NULL THEN
    RAISE_APPLICATION_ERROR(-20012, 'Usuario, registro e data sao obrigatorios.');
  END IF;
  SELECT r.status INTO v_status
  FROM registro_dose_lembrei r
  JOIN horario_lembrei h ON h.id_horario = r.id_horario
  JOIN item_lembrei i ON i.id_item = h.id_item
  WHERE r.id_registro = p_id_registro AND i.id_usuario = p_id_usuario
  FOR UPDATE OF r.status;
  IF v_status <> 'TOMADO' THEN
    UPDATE registro_dose_lembrei
    SET status = 'TOMADO', dt_tomada = p_dt_tomada
    WHERE id_registro = p_id_registro;
  END IF;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE_APPLICATION_ERROR(-20013, 'Registro nao encontrado para este usuario.');
END prc_lembrei_confirmar_dose;
/
SHOW ERRORS PROCEDURE prc_lembrei_confirmar_dose

CREATE OR REPLACE PROCEDURE prc_lembrei_repor_estoque (
  p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
  p_id_item IN item_lembrei.id_item%TYPE,
  p_quantidade IN NUMBER
) IS
  v_tipo item_lembrei.tipo%TYPE;
  v_saldo item_lembrei.estoque_atual%TYPE;
BEGIN
  SAVEPOINT lembrei_reposicao;
  IF p_id_usuario IS NULL OR p_id_item IS NULL OR p_quantidade IS NULL
     OR p_quantidade <= 0 OR p_quantidade <> TRUNC(p_quantidade)
     OR p_quantidade > 99999 THEN
    RAISE_APPLICATION_ERROR(-20014, 'Informe usuario, item e quantidade inteira de 1 a 99999.');
  END IF;
  SELECT tipo, estoque_atual INTO v_tipo, v_saldo FROM item_lembrei
  WHERE id_item = p_id_item AND id_usuario = p_id_usuario FOR UPDATE;
  IF v_tipo <> 'REMEDIO' THEN
    RAISE_APPLICATION_ERROR(-20015, 'Somente remedios possuem reposicao.');
  END IF;
  IF v_saldo + p_quantidade > 99999 THEN
    RAISE_APPLICATION_ERROR(-20016, 'Reposicao excede o limite de estoque.');
  END IF;
  UPDATE item_lembrei SET estoque_atual = estoque_atual + p_quantidade
  WHERE id_item = p_id_item;
  INSERT INTO movimento_estoque_lembrei (id_item, tipo, quantidade)
  VALUES (p_id_item, 'REPOSICAO', p_quantidade);
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    ROLLBACK TO lembrei_reposicao;
    RAISE_APPLICATION_ERROR(-20017, 'Item nao encontrado para este usuario.');
  WHEN OTHERS THEN
    ROLLBACK TO lembrei_reposicao;
    RAISE;
END prc_lembrei_repor_estoque;
/
SHOW ERRORS PROCEDURE prc_lembrei_repor_estoque

CREATE OR REPLACE PROCEDURE prc_lembrei_relatorio_semanal (
  p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
  p_data IN DATE,
  p_relatorio OUT SYS_REFCURSOR
) IS
  v_inicio DATE := TRUNC(p_data, 'IW');
  v_usuario NUMBER;
  v_agora TIMESTAMP := LOCALTIMESTAMP;
BEGIN
  IF p_id_usuario IS NULL OR p_data IS NULL THEN
    RAISE_APPLICATION_ERROR(-20018, 'Usuario e data sao obrigatorios.');
  END IF;
  SELECT id_usuario INTO v_usuario FROM usuario_lembrei WHERE id_usuario = p_id_usuario;
  OPEN p_relatorio FOR
    SELECT i.id_item, i.nome, i.tipo,
           COUNT(*) AS total_previsto,
           SUM(CASE WHEN r.status = 'TOMADO' THEN 1 ELSE 0 END) AS total_tomado,
           SUM(CASE WHEN r.status = 'ESQUECIDO' THEN 1 ELSE 0 END) AS total_esquecido,
           SUM(CASE WHEN r.status = 'PENDENTE' THEN 1 ELSE 0 END) AS total_pendente,
           ROUND(100 * SUM(CASE WHEN r.status = 'TOMADO' THEN 1 ELSE 0 END)
                 / COUNT(*), 1) AS percentual_adesao
    FROM item_lembrei i
    JOIN horario_lembrei h ON h.id_item = i.id_item
    JOIN registro_dose_lembrei r ON r.id_horario = h.id_horario
    WHERE i.id_usuario = p_id_usuario
      AND r.dt_prevista >= CAST(v_inicio AS TIMESTAMP)
      AND r.dt_prevista < CAST(v_inicio + 7 AS TIMESTAMP)
      AND r.dt_prevista <= v_agora
    GROUP BY i.id_item, i.nome, i.tipo
    ORDER BY i.nome, i.id_item;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE_APPLICATION_ERROR(-20011, 'Usuario inexistente.');
END prc_lembrei_relatorio_semanal;
/
SHOW ERRORS PROCEDURE prc_lembrei_relatorio_semanal

SELECT name, type, line, position, text FROM user_errors
WHERE name IN ('PRC_LEMBREI_GERAR_ROTINA', 'PRC_LEMBREI_CONFIRMAR_DOSE',
               'PRC_LEMBREI_REPOR_ESTOQUE', 'PRC_LEMBREI_RELATORIO_SEMANAL')
ORDER BY name, sequence;
DECLARE
  v_erros NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_erros FROM user_errors
  WHERE attribute = 'ERROR' AND name IN (
    'PRC_LEMBREI_GERAR_ROTINA', 'PRC_LEMBREI_CONFIRMAR_DOSE',
    'PRC_LEMBREI_REPOR_ESTOQUE', 'PRC_LEMBREI_RELATORIO_SEMANAL');
  IF v_erros > 0 THEN
    RAISE_APPLICATION_ERROR(-20019, 'Procedures com erros; consulte USER_ERRORS.');
  END IF;
END;
/
