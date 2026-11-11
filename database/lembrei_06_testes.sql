SET SERVEROUTPUT ON
SET AUTOCOMMIT OFF
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

SELECT name, type, line, position, text FROM user_errors
WHERE name IN (
  'PRC_LEMBREI_GERAR_ROTINA', 'PRC_LEMBREI_CONFIRMAR_DOSE',
  'PRC_LEMBREI_REPOR_ESTOQUE', 'PRC_LEMBREI_RELATORIO_SEMANAL',
  'PKG_LEMBREI_CALCULO', 'PKG_LEMBREI_OPERACAO', 'PKG_LEMBREI_RELATORIO',
  'TRG_LEMBREI_VALIDAR_DOSE', 'TRG_LEMBREI_BAIXAR_ESTOQUE')
ORDER BY name, type, sequence;

DECLARE
  v_total NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM user_objects
  WHERE status = 'VALID' AND (
    (object_type = 'PROCEDURE' AND object_name IN (
      'PRC_LEMBREI_GERAR_ROTINA', 'PRC_LEMBREI_CONFIRMAR_DOSE',
      'PRC_LEMBREI_REPOR_ESTOQUE', 'PRC_LEMBREI_RELATORIO_SEMANAL'))
    OR (object_type IN ('PACKAGE', 'PACKAGE BODY') AND object_name IN (
      'PKG_LEMBREI_CALCULO', 'PKG_LEMBREI_OPERACAO', 'PKG_LEMBREI_RELATORIO'))
    OR (object_type = 'TRIGGER' AND object_name IN (
      'TRG_LEMBREI_VALIDAR_DOSE', 'TRG_LEMBREI_BAIXAR_ESTOQUE')));
  IF v_total <> 12 THEN
    RAISE_APPLICATION_ERROR(-20090, 'T0: instale/corrija os objetos 03, 04 e 05; consulte USER_ERRORS.');
  END IF;
  SELECT COUNT(*) INTO v_total FROM user_triggers
  WHERE status = 'ENABLED' AND trigger_name IN (
    'TRG_LEMBREI_VALIDAR_DOSE', 'TRG_LEMBREI_BAIXAR_ESTOQUE');
  IF v_total <> 2 THEN
    RAISE_APPLICATION_ERROR(-20090, 'T0: as duas triggers precisam estar habilitadas.');
  END IF;
  DBMS_OUTPUT.PUT_LINE('OK T0 | objetos validos e triggers habilitadas.');
END;
/

DECLARE
  v_usuario NUMBER;
  v_outro_usuario NUMBER;
  v_remedio NUMBER;
  v_habito NUMBER;
  v_inativo NUMBER;
  v_sem_dias NUMBER;
  v_horario NUMBER;
  v_r1 NUMBER;
  v_r2 NUMBER;
  v_r3 NUMBER;
  v_rh NUMBER;
  v_futuro NUMBER;
  v_qtd NUMBER;
  v_total NUMBER;
  v_saldo NUMBER;
  v_movimentos NUMBER;
  v_antes NUMBER;
  v_data DATE := TRUNC(CAST(LOCALTIMESTAMP AS DATE)) - 1;
  v_referencia TIMESTAMP := TIMESTAMP '2026-11-09 07:00:00';
  v_previsao TIMESTAMP;
  v_cursor SYS_REFCURSOR;
  v_id NUMBER;
  v_nome item_lembrei.nome%TYPE;
  v_tipo item_lembrei.tipo%TYPE;
  v_previstas NUMBER;
  v_tomadas NUMBER;
  v_esquecidas NUMBER;
  v_pendentes NUMBER;
  v_percentual NUMBER;
  v_linhas NUMBER;
  v_testes NUMBER := 0;

  PROCEDURE verificar(p_ok BOOLEAN, p_descricao VARCHAR2) IS
  BEGIN
    IF p_ok IS NULL OR NOT p_ok THEN
      RAISE_APPLICATION_ERROR(-20090, 'FALHOU: ' || p_descricao);
    END IF;
    v_testes := v_testes + 1;
    DBMS_OUTPUT.PUT_LINE('OK | ' || p_descricao);
  END;

  PROCEDURE esperar_erro(p_caso PLS_INTEGER, p_codigo NUMBER, p_descricao VARCHAR2) IS
    v_codigo NUMBER := 0;
    v_n NUMBER;
  BEGIN
    BEGIN
      CASE p_caso
        WHEN 1 THEN prc_lembrei_gerar_rotina(NULL, v_data, v_n);
        WHEN 2 THEN pkg_lembrei_operacao.prc_confirmar_dose(v_outro_usuario, v_r1);
        WHEN 3 THEN pkg_lembrei_operacao.prc_confirmar_dose(v_usuario, v_r2);
        WHEN 4 THEN pkg_lembrei_operacao.prc_repor_estoque(v_usuario, v_remedio, 0);
        WHEN 5 THEN pkg_lembrei_operacao.prc_repor_estoque(v_usuario, v_remedio, 1.5);
        WHEN 6 THEN pkg_lembrei_operacao.prc_repor_estoque(v_usuario, v_habito, 1);
        WHEN 7 THEN pkg_lembrei_operacao.prc_repor_estoque(v_outro_usuario, v_remedio, 1);
        WHEN 8 THEN
          UPDATE registro_dose_lembrei SET status = 'PENDENTE', dt_tomada = NULL
          WHERE id_registro = v_r1;
        WHEN 9 THEN
          UPDATE registro_dose_lembrei SET dt_prevista = dt_prevista + INTERVAL '1' MINUTE
          WHERE id_registro = v_r2;
        WHEN 10 THEN pkg_lembrei_operacao.prc_confirmar_dose(v_usuario, v_futuro);
        WHEN 11 THEN v_n := pkg_lembrei_relatorio.fun_contar_registros('USER_TABLES');
        WHEN 12 THEN v_n := pkg_lembrei_relatorio.fun_contar_registros('ITEM_LEMBREI WHERE 1=1');
        WHEN 13 THEN v_n := pkg_lembrei_calculo.fun_consumo_semanal(v_outro_usuario, v_remedio);
        WHEN 14 THEN
          v_nome := pkg_lembrei_calculo.fun_precisa_reposicao(v_usuario, v_remedio, -1);
        WHEN 15 THEN
          UPDATE registro_dose_lembrei SET dt_tomada = LOCALTIMESTAMP
          WHERE id_registro = v_r2;
        ELSE RAISE_APPLICATION_ERROR(-20091, 'Caso de teste desconhecido.');
      END CASE;
    EXCEPTION
      WHEN OTHERS THEN v_codigo := SQLCODE;
    END;
    verificar(v_codigo = p_codigo,
      p_descricao || ' (esperado ' || p_codigo || ', recebido ' || v_codigo || ')');
  END;
BEGIN
  SAVEPOINT lembrei_suite;

  INSERT INTO usuario_lembrei (uuid_dispositivo, nome)
  VALUES (LOWER(RAWTOHEX(SYS_GUID())), 'Teste integrado A')
  RETURNING id_usuario INTO v_usuario;
  INSERT INTO usuario_lembrei (uuid_dispositivo, nome)
  VALUES (LOWER(RAWTOHEX(SYS_GUID())), 'Teste integrado B')
  RETURNING id_usuario INTO v_outro_usuario;
  INSERT INTO item_lembrei (id_usuario, tipo, nome, estoque_atual, dt_criacao)
  VALUES (v_usuario, 'REMEDIO', 'Remedio teste', 1, v_data - 7)
  RETURNING id_item INTO v_remedio;
  INSERT INTO horario_lembrei (id_item, hora) VALUES (v_remedio, '00:00');
  INSERT INTO horario_lembrei (id_item, hora) VALUES (v_remedio, '12:00');
  INSERT INTO horario_lembrei (id_item, hora) VALUES (v_remedio, '18:00');
  INSERT INTO item_lembrei (id_usuario, tipo, nome, dt_criacao)
  VALUES (v_usuario, 'HABITO', 'Habito teste', v_data - 7)
  RETURNING id_item INTO v_habito;
  INSERT INTO horario_lembrei (id_item, hora) VALUES (v_habito, '06:00');
  INSERT INTO item_lembrei (id_usuario, tipo, nome, ativo, dt_criacao)
  VALUES (v_usuario, 'HABITO', 'Inativo teste', 'N', v_data - 7)
  RETURNING id_item INTO v_inativo;
  INSERT INTO horario_lembrei (id_item, hora) VALUES (v_inativo, '00:00');
  INSERT INTO item_lembrei (id_usuario, tipo, nome, dias_semana, dt_criacao)
  VALUES (v_usuario, 'HABITO', 'Sem dias teste', '0000000', v_data - 7)
  RETURNING id_item INTO v_sem_dias;
  INSERT INTO horario_lembrei (id_item, hora) VALUES (v_sem_dias, '00:00');

  prc_lembrei_gerar_rotina(v_usuario, v_data, v_qtd);
  verificar(v_qtd = 4, 'T1: tres doses e um habito; inativo e sem dias ignorados');
  pkg_lembrei_operacao.prc_gerar_rotina(v_usuario, v_data, v_qtd);
  verificar(v_qtd = 0, 'T1: segunda geracao nao duplica ocorrencias');
  SELECT r.id_registro, h.id_horario INTO v_r1, v_horario
  FROM registro_dose_lembrei r JOIN horario_lembrei h ON h.id_horario = r.id_horario
  WHERE h.id_item = v_remedio AND h.hora = '00:00';
  SELECT r.id_registro INTO v_r2
  FROM registro_dose_lembrei r JOIN horario_lembrei h ON h.id_horario = r.id_horario
  WHERE h.id_item = v_remedio AND h.hora = '12:00';
  SELECT r.id_registro INTO v_r3
  FROM registro_dose_lembrei r JOIN horario_lembrei h ON h.id_horario = r.id_horario
  WHERE h.id_item = v_remedio AND h.hora = '18:00';
  SELECT r.id_registro INTO v_rh
  FROM registro_dose_lembrei r JOIN horario_lembrei h ON h.id_horario = r.id_horario
  WHERE h.id_item = v_habito;
  esperar_erro(1, -20010, 'T2: usuario nulo');
  esperar_erro(2, -20013, 'T2: confirmacao por outro usuario bloqueada');

  prc_lembrei_confirmar_dose(v_usuario, v_r1);
  pkg_lembrei_operacao.prc_confirmar_dose(v_usuario, v_r1);
  SELECT estoque_atual INTO v_saldo FROM item_lembrei WHERE id_item = v_remedio;
  SELECT COUNT(*) INTO v_total FROM movimento_estoque_lembrei
  WHERE id_registro = v_r1 AND tipo = 'BAIXA' AND quantidade = 1;
  verificar(v_saldo = 0 AND v_total = 1, 'T3: confirmar duas vezes desconta somente uma dose');
  esperar_erro(3, -20024, 'T4: falta de estoque rejeita confirmacao');
  SELECT COUNT(*) INTO v_total FROM registro_dose_lembrei
  WHERE id_registro = v_r2 AND status = 'PENDENTE' AND dt_tomada IS NULL;
  verificar(v_total = 1, 'T4: confirmacao rejeitada preserva status e data');
  SELECT COUNT(*) INTO v_total FROM movimento_estoque_lembrei WHERE id_registro = v_r2;
  verificar(v_total = 0, 'T4: confirmacao rejeitada nao grava movimento');

  esperar_erro(4, -20014, 'T5: reposicao zero');
  esperar_erro(5, -20014, 'T5: reposicao fracionada');
  esperar_erro(6, -20015, 'T5: reposicao de habito');
  esperar_erro(7, -20017, 'T5: reposicao de outro usuario');
  pkg_lembrei_operacao.prc_repor_estoque(v_usuario, v_remedio, 5);
  pkg_lembrei_operacao.prc_confirmar_dose(v_usuario, v_r2);
  SELECT estoque_atual INTO v_saldo FROM item_lembrei WHERE id_item = v_remedio;
  SELECT COUNT(*) INTO v_total FROM movimento_estoque_lembrei
  WHERE id_item = v_remedio AND tipo = 'REPOSICAO' AND quantidade = 5;
  verificar(v_saldo = 4 AND v_total = 1, 'T5: reposicao auditada e nova confirmacao');

  UPDATE registro_dose_lembrei SET status = 'TOMADO' WHERE id_registro = v_rh;
  SELECT COUNT(*) INTO v_total FROM registro_dose_lembrei
  WHERE id_registro = v_rh AND dt_tomada IS NOT NULL;
  SELECT COUNT(*) INTO v_movimentos FROM movimento_estoque_lembrei WHERE id_item = v_habito;
  verificar(v_total = 1 AND v_movimentos = 0, 'T6: habito confirmado sem movimentar estoque');
  esperar_erro(8, -20021, 'T7: confirmacao nao pode ser revertida');
  esperar_erro(9, -20020, 'T7: agendamento da ocorrencia e imutavel');
  INSERT INTO registro_dose_lembrei (id_horario, dt_prevista)
  VALUES (v_horario, CAST(v_data + 10 AS TIMESTAMP)) RETURNING id_registro INTO v_futuro;
  esperar_erro(10, -20022, 'T7: confirmacao futura bloqueada');

  UPDATE registro_dose_lembrei SET status = 'ESQUECIDO' WHERE id_registro = v_r3;
  INSERT INTO registro_dose_lembrei (id_horario, dt_prevista)
  VALUES (v_horario, CAST(v_data AS TIMESTAMP) + INTERVAL '19' HOUR);
  pkg_lembrei_relatorio.prc_relatorio_semanal(v_usuario, v_data, v_cursor);
  v_linhas := 0;
  LOOP
    FETCH v_cursor INTO v_id, v_nome, v_tipo, v_previstas, v_tomadas,
      v_esquecidas, v_pendentes, v_percentual;
    EXIT WHEN v_cursor%NOTFOUND;
    v_linhas := v_linhas + 1;
    IF v_id = v_remedio THEN
      verificar(v_previstas = 4 AND v_tomadas = 2 AND v_esquecidas = 1
        AND v_pendentes = 1 AND v_percentual = 50, 'T8: adesao do remedio = 50%');
    ELSE
      verificar(v_id = v_habito AND v_previstas = 1 AND v_tomadas = 1
        AND v_percentual = 100, 'T8: adesao do habito = 100%');
    END IF;
  END LOOP;
  CLOSE v_cursor;
  verificar(v_linhas = 2, 'T8: relatorio retorna somente os dois itens com ocorrencias vencidas');
  prc_lembrei_relatorio_semanal(v_outro_usuario, v_data, v_cursor);
  FETCH v_cursor INTO v_id, v_nome, v_tipo, v_previstas, v_tomadas,
    v_esquecidas, v_pendentes, v_percentual;
  verificar(v_cursor%NOTFOUND, 'T8: usuario sem ocorrencias recebe cursor vazio');
  CLOSE v_cursor;

  UPDATE item_lembrei SET dias_semana = '1111100' WHERE id_item = v_remedio;
  verificar(pkg_lembrei_calculo.fun_consumo_semanal(v_usuario, v_remedio) = 15,
    'T9: consumo semanal = cinco dias vezes tres doses');
  v_previsao := pkg_lembrei_calculo.fun_previsao_termino(v_usuario, v_remedio, v_referencia);
  verificar(v_previsao = TIMESTAMP '2026-11-10 18:00:00', 'T9: quatro comprimidos cobrem quatro horarios');
  verificar(pkg_lembrei_calculo.fun_precisa_reposicao(v_usuario, v_remedio, 3, v_referencia) = 'S',
    'T9: alerta dentro de tres dias');
  UPDATE item_lembrei SET qtd_por_dose = 2 WHERE id_item = v_remedio;
  v_previsao := pkg_lembrei_calculo.fun_previsao_termino(v_usuario, v_remedio, v_referencia);
  verificar(v_previsao = TIMESTAMP '2026-11-10 00:00:00', 'T9: previsao respeita quantidade por dose');
  v_previsao := pkg_lembrei_calculo.fun_previsao_termino(v_usuario, v_habito, v_referencia);
  verificar(v_previsao IS NULL, 'T9: habito nao tem previsao de estoque');
  esperar_erro(13, -20031, 'T9: calculo de item de outro usuario');
  esperar_erro(14, -20034, 'T9: prazo de alerta negativo');

  SELECT COUNT(*) INTO v_total FROM item_lembrei;
  verificar(pkg_lembrei_relatorio.fun_contar_registros(' item_lembrei ') = v_total,
    'T10: contagem dinamica coincide com SELECT direto');
  esperar_erro(11, -20035, 'T10: tabela externa bloqueada');
  esperar_erro(12, -20035, 'T10: entrada SQL nao aceita como nome de tabela');

  INSERT INTO registro_dose_lembrei (id_horario, dt_prevista, status)
  VALUES (v_horario, CAST(v_data AS TIMESTAMP) + INTERVAL '20' HOUR, 'TOMADO')
  RETURNING id_registro INTO v_id;
  SELECT estoque_atual INTO v_saldo FROM item_lembrei WHERE id_item = v_remedio;
  SELECT COUNT(*) INTO v_total FROM movimento_estoque_lembrei
  WHERE id_registro = v_id AND quantidade = 2 AND tipo = 'BAIXA';
  verificar(v_saldo = 2 AND v_total = 1, 'T11: INSERT confirmado baixa quantidade por dose');

  v_antes := v_r2;
  v_r2 := v_r3;
  esperar_erro(15, -20023, 'T11: data de tomada exige status TOMADO');
  v_r2 := v_antes;

  ROLLBACK TO lembrei_suite;
  SELECT COUNT(*) INTO v_total FROM usuario_lembrei
  WHERE id_usuario IN (v_usuario, v_outro_usuario);
  verificar(v_total = 0, 'T12: rollback remove os usuarios exclusivos');
  SELECT COUNT(*) INTO v_total FROM item_lembrei
  WHERE id_usuario IN (v_usuario, v_outro_usuario);
  verificar(v_total = 0, 'T12: rollback remove itens');
  SELECT COUNT(*) INTO v_total FROM movimento_estoque_lembrei
  WHERE id_item IN (v_remedio, v_habito);
  verificar(v_total = 0, 'T12: rollback remove movimentos de estoque');
  DBMS_OUTPUT.PUT_LINE('SUCESSO: ' || v_testes || ' verificacoes aprovadas; dados de teste desfeitos.');
EXCEPTION
  WHEN OTHERS THEN
    IF v_cursor%ISOPEN THEN CLOSE v_cursor; END IF;
    ROLLBACK TO lembrei_suite;
    DBMS_OUTPUT.PUT_LINE('FALHA: ' || SQLERRM);
    DBMS_OUTPUT.PUT_LINE(DBMS_UTILITY.FORMAT_ERROR_BACKTRACE);
    RAISE;
END;
/
