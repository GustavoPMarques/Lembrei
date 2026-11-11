SET SERVEROUTPUT ON
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

CREATE OR REPLACE PACKAGE pkg_lembrei_calculo AS
  c_dias_alerta CONSTANT PLS_INTEGER := 3;

  FUNCTION fun_consumo_semanal (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_id_item IN item_lembrei.id_item%TYPE
  ) RETURN NUMBER;

  FUNCTION fun_previsao_termino (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_id_item IN item_lembrei.id_item%TYPE,
    p_referencia IN TIMESTAMP DEFAULT LOCALTIMESTAMP
  ) RETURN TIMESTAMP;

  FUNCTION fun_precisa_reposicao (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_id_item IN item_lembrei.id_item%TYPE,
    p_dias_alerta IN NUMBER DEFAULT c_dias_alerta,
    p_referencia IN TIMESTAMP DEFAULT LOCALTIMESTAMP
  ) RETURN VARCHAR2;
END pkg_lembrei_calculo;
/
SHOW ERRORS PACKAGE pkg_lembrei_calculo

CREATE OR REPLACE PACKAGE BODY pkg_lembrei_calculo AS

  PROCEDURE ler_item (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_id_item IN item_lembrei.id_item%TYPE,
    p_item OUT item_lembrei%ROWTYPE
  ) IS
  BEGIN
    IF p_id_usuario IS NULL OR p_id_item IS NULL THEN
      RAISE_APPLICATION_ERROR(-20030, 'Usuario e item sao obrigatorios.');
    END IF;
    SELECT * INTO p_item FROM item_lembrei
    WHERE id_item = p_id_item AND id_usuario = p_id_usuario;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE_APPLICATION_ERROR(-20031, 'Item nao encontrado para este usuario.');
  END ler_item;

  FUNCTION fun_consumo_semanal (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_id_item IN item_lembrei.id_item%TYPE
  ) RETURN NUMBER IS
    v_item item_lembrei%ROWTYPE;
    v_horarios NUMBER;
    v_dias NUMBER;
  BEGIN
    ler_item(p_id_usuario, p_id_item, v_item);
    IF v_item.tipo <> 'REMEDIO' OR v_item.ativo <> 'S' THEN
      RETURN 0;
    END IF;
    SELECT COUNT(*) INTO v_horarios FROM horario_lembrei WHERE id_item = p_id_item;
    v_dias := LENGTH(REPLACE(v_item.dias_semana, '0', ''));
    RETURN v_horarios * NVL(v_dias, 0) * v_item.qtd_por_dose;
  END fun_consumo_semanal;

  FUNCTION fun_previsao_termino (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_id_item IN item_lembrei.id_item%TYPE,
    p_referencia IN TIMESTAMP
  ) RETURN TIMESTAMP IS
    v_item item_lembrei%ROWTYPE;
    v_consumo NUMBER;
    v_doses_semana NUMBER;
    v_dose_sem_saldo NUMBER;
    v_semanas NUMBER;
    v_posicao NUMBER;
    v_contador NUMBER := 0;
  BEGIN
    IF p_referencia IS NULL THEN
      RAISE_APPLICATION_ERROR(-20032, 'Instante de referencia obrigatorio.');
    END IF;
    ler_item(p_id_usuario, p_id_item, v_item);
    v_consumo := fun_consumo_semanal(p_id_usuario, p_id_item);
    IF v_consumo = 0 THEN
      RETURN NULL;
    END IF;
    v_doses_semana := v_consumo / v_item.qtd_por_dose;
    v_dose_sem_saldo := FLOOR(v_item.estoque_atual / v_item.qtd_por_dose) + 1;
    v_semanas := FLOOR((v_dose_sem_saldo - 1) / v_doses_semana);
    v_posicao := MOD(v_dose_sem_saldo - 1, v_doses_semana) + 1;

    FOR h IN (
      SELECT CAST(d.dia AS TIMESTAMP)
             + NUMTODSINTERVAL(TO_NUMBER(SUBSTR(h.hora, 1, 2)) * 60
                              + TO_NUMBER(SUBSTR(h.hora, 4, 2)), 'MINUTE') AS instante
      FROM horario_lembrei h
      CROSS JOIN (
        SELECT TRUNC(CAST(p_referencia AS DATE)) + LEVEL - 1 AS dia
        FROM dual CONNECT BY LEVEL <= 8
      ) d
      WHERE h.id_item = p_id_item
        AND SUBSTR(v_item.dias_semana, d.dia - TRUNC(d.dia, 'IW') + 1, 1) = '1'
      ORDER BY instante
    ) LOOP
      IF h.instante > p_referencia
         AND h.instante <= p_referencia + INTERVAL '7' DAY THEN
        v_contador := v_contador + 1;
        IF v_contador = v_posicao THEN
          RETURN h.instante + NUMTODSINTERVAL(v_semanas * 7, 'DAY');
        END IF;
      END IF;
    END LOOP;
    RAISE_APPLICATION_ERROR(-20033, 'Nao foi possivel calcular a previsao de estoque.');
  END fun_previsao_termino;

  FUNCTION fun_precisa_reposicao (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_id_item IN item_lembrei.id_item%TYPE,
    p_dias_alerta IN NUMBER,
    p_referencia IN TIMESTAMP
  ) RETURN VARCHAR2 IS
    v_termino TIMESTAMP;
  BEGIN
    IF p_dias_alerta IS NULL OR p_dias_alerta < 0 OR p_dias_alerta > 365
       OR p_dias_alerta <> TRUNC(p_dias_alerta) THEN
      RAISE_APPLICATION_ERROR(-20034, 'Prazo de alerta deve ser inteiro entre 0 e 365 dias.');
    END IF;
    v_termino := fun_previsao_termino(p_id_usuario, p_id_item, p_referencia);
    IF v_termino <= p_referencia + NUMTODSINTERVAL(p_dias_alerta, 'DAY') THEN
      RETURN 'S';
    END IF;
    RETURN 'N';
  END fun_precisa_reposicao;
END pkg_lembrei_calculo;
/
SHOW ERRORS PACKAGE BODY pkg_lembrei_calculo

CREATE OR REPLACE PACKAGE pkg_lembrei_operacao AS
  PROCEDURE prc_gerar_rotina (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_data IN DATE, p_qtd_gerada OUT NUMBER);
  PROCEDURE prc_confirmar_dose (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_id_registro IN registro_dose_lembrei.id_registro%TYPE,
    p_dt_tomada IN TIMESTAMP DEFAULT LOCALTIMESTAMP);
  PROCEDURE prc_repor_estoque (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_id_item IN item_lembrei.id_item%TYPE, p_quantidade IN NUMBER);
END pkg_lembrei_operacao;
/
SHOW ERRORS PACKAGE pkg_lembrei_operacao

CREATE OR REPLACE PACKAGE BODY pkg_lembrei_operacao AS
  PROCEDURE prc_gerar_rotina (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_data IN DATE, p_qtd_gerada OUT NUMBER
  ) IS
  BEGIN
    prc_lembrei_gerar_rotina(p_id_usuario, p_data, p_qtd_gerada);
  END prc_gerar_rotina;

  PROCEDURE prc_confirmar_dose (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_id_registro IN registro_dose_lembrei.id_registro%TYPE,
    p_dt_tomada IN TIMESTAMP
  ) IS
  BEGIN
    prc_lembrei_confirmar_dose(p_id_usuario, p_id_registro, p_dt_tomada);
  END prc_confirmar_dose;

  PROCEDURE prc_repor_estoque (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_id_item IN item_lembrei.id_item%TYPE, p_quantidade IN NUMBER
  ) IS
  BEGIN
    prc_lembrei_repor_estoque(p_id_usuario, p_id_item, p_quantidade);
  END prc_repor_estoque;
END pkg_lembrei_operacao;
/
SHOW ERRORS PACKAGE BODY pkg_lembrei_operacao

CREATE OR REPLACE PACKAGE pkg_lembrei_relatorio AS
  PROCEDURE prc_relatorio_semanal (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_data IN DATE, p_relatorio OUT SYS_REFCURSOR);
  FUNCTION fun_contar_registros(p_tabela IN VARCHAR2) RETURN NUMBER;
END pkg_lembrei_relatorio;
/
SHOW ERRORS PACKAGE pkg_lembrei_relatorio

CREATE OR REPLACE PACKAGE BODY pkg_lembrei_relatorio AS
  PROCEDURE prc_relatorio_semanal (
    p_id_usuario IN usuario_lembrei.id_usuario%TYPE,
    p_data IN DATE, p_relatorio OUT SYS_REFCURSOR
  ) IS
  BEGIN
    prc_lembrei_relatorio_semanal(p_id_usuario, p_data, p_relatorio);
  END prc_relatorio_semanal;

  FUNCTION fun_contar_registros(p_tabela IN VARCHAR2) RETURN NUMBER IS
    v_tabela VARCHAR2(32767) := UPPER(TRIM(p_tabela));
    v_total NUMBER;
  BEGIN
    IF v_tabela IS NULL OR v_tabela NOT IN (
      'USUARIO_LEMBREI', 'ITEM_LEMBREI', 'HORARIO_LEMBREI',
      'REGISTRO_DOSE_LEMBREI', 'MOVIMENTO_ESTOQUE_LEMBREI'
    ) THEN
      RAISE_APPLICATION_ERROR(-20035, 'Tabela nao permitida para contagem.');
    END IF;
    EXECUTE IMMEDIATE 'SELECT COUNT(*) FROM ' || DBMS_ASSERT.SIMPLE_SQL_NAME(v_tabela)
      INTO v_total;
    RETURN v_total;
  END fun_contar_registros;
END pkg_lembrei_relatorio;
/
SHOW ERRORS PACKAGE BODY pkg_lembrei_relatorio

SELECT object_name, object_type, status FROM user_objects
WHERE object_name IN ('PKG_LEMBREI_CALCULO', 'PKG_LEMBREI_OPERACAO', 'PKG_LEMBREI_RELATORIO')
  AND object_type IN ('PACKAGE', 'PACKAGE BODY')
ORDER BY object_name, object_type;

SELECT name, type, line, position, text FROM user_errors
WHERE name IN ('PKG_LEMBREI_CALCULO', 'PKG_LEMBREI_OPERACAO', 'PKG_LEMBREI_RELATORIO')
ORDER BY name, type, sequence;

DECLARE
  v_validos NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_validos FROM user_objects
  WHERE object_name IN ('PKG_LEMBREI_CALCULO', 'PKG_LEMBREI_OPERACAO', 'PKG_LEMBREI_RELATORIO')
    AND object_type IN ('PACKAGE', 'PACKAGE BODY') AND status = 'VALID';
  IF v_validos <> 6 THEN
    RAISE_APPLICATION_ERROR(-20036, 'Packages invalidos; consulte USER_ERRORS.');
  END IF;
END;
/
