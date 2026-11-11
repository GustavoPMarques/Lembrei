SET SERVEROUTPUT ON
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

CREATE OR REPLACE TRIGGER trg_lembrei_validar_dose
BEFORE INSERT OR UPDATE ON registro_dose_lembrei
FOR EACH ROW
BEGIN
  IF UPDATING THEN
    IF :NEW.id_horario <> :OLD.id_horario OR :NEW.dt_prevista <> :OLD.dt_prevista
       OR :NEW.id_registro <> :OLD.id_registro THEN
      RAISE_APPLICATION_ERROR(-20020, 'A identidade e o agendamento da ocorrencia sao imutaveis.');
    END IF;
    IF :OLD.status = 'TOMADO' AND
       (:NEW.status <> 'TOMADO' OR :NEW.dt_tomada IS NULL
        OR :NEW.dt_tomada <> :OLD.dt_tomada) THEN
      RAISE_APPLICATION_ERROR(-20021, 'Uma dose confirmada nao pode ser revertida ou alterada.');
    END IF;
  END IF;
  IF :NEW.status = 'TOMADO' THEN
    :NEW.dt_tomada := NVL(:NEW.dt_tomada, LOCALTIMESTAMP);
    IF :NEW.dt_tomada > LOCALTIMESTAMP OR :NEW.dt_prevista > LOCALTIMESTAMP THEN
      RAISE_APPLICATION_ERROR(-20022, 'Nao e permitido confirmar uma ocorrencia futura.');
    END IF;
  ELSIF :NEW.dt_tomada IS NOT NULL THEN
    RAISE_APPLICATION_ERROR(-20023, 'Somente uma dose tomada pode ter data de confirmacao.');
  END IF;
END trg_lembrei_validar_dose;
/
SHOW ERRORS TRIGGER trg_lembrei_validar_dose

CREATE OR REPLACE TRIGGER trg_lembrei_baixar_estoque
AFTER INSERT OR UPDATE OF status ON registro_dose_lembrei
FOR EACH ROW
DECLARE
  v_item item_lembrei.id_item%TYPE;
  v_tipo item_lembrei.tipo%TYPE;
  v_qtd item_lembrei.qtd_por_dose%TYPE;
BEGIN
  IF :NEW.status = 'TOMADO' AND (INSERTING OR :OLD.status <> 'TOMADO') THEN
    SELECT i.id_item, i.tipo, i.qtd_por_dose INTO v_item, v_tipo, v_qtd
    FROM item_lembrei i JOIN horario_lembrei h ON h.id_item = i.id_item
    WHERE h.id_horario = :NEW.id_horario
    FOR UPDATE OF i.estoque_atual;
    IF v_tipo = 'REMEDIO' THEN
      UPDATE item_lembrei SET estoque_atual = estoque_atual - v_qtd
      WHERE id_item = v_item AND estoque_atual >= v_qtd;
      IF SQL%ROWCOUNT = 0 THEN
        RAISE_APPLICATION_ERROR(-20024, 'Estoque insuficiente; reponha antes de confirmar.');
      END IF;
      INSERT INTO movimento_estoque_lembrei
        (id_item, id_registro, tipo, quantidade)
      VALUES (v_item, :NEW.id_registro, 'BAIXA', v_qtd);
    END IF;
  END IF;
END trg_lembrei_baixar_estoque;
/
SHOW ERRORS TRIGGER trg_lembrei_baixar_estoque

SELECT trigger_name, table_name, status FROM user_triggers
WHERE trigger_name IN ('TRG_LEMBREI_VALIDAR_DOSE', 'TRG_LEMBREI_BAIXAR_ESTOQUE')
ORDER BY trigger_name;

SELECT name, type, line, position, text FROM user_errors
WHERE name IN ('TRG_LEMBREI_VALIDAR_DOSE', 'TRG_LEMBREI_BAIXAR_ESTOQUE')
ORDER BY name, sequence;
DECLARE
  v_erros NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_erros FROM user_errors
  WHERE attribute = 'ERROR' AND name IN (
    'TRG_LEMBREI_VALIDAR_DOSE', 'TRG_LEMBREI_BAIXAR_ESTOQUE');
  IF v_erros > 0 THEN
    RAISE_APPLICATION_ERROR(-20025, 'Triggers com erros; consulte USER_ERRORS.');
  END IF;
END;
/
