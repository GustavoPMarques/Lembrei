WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

DECLARE
  v_usuario  NUMBER;
  v_item     NUMBER;
BEGIN
  INSERT INTO usuario_lembrei (uuid_dispositivo, nome)
  VALUES ('11111111-2222-3333-4444-555555555555', 'Maria')
  RETURNING id_usuario INTO v_usuario;

  INSERT INTO item_lembrei (id_usuario, tipo, nome, dose, qtd_por_dose, estoque_atual)
  VALUES (v_usuario, 'REMEDIO', 'Losartana 50 mg', '1 comprimido', 1, 24)
  RETURNING id_item INTO v_item;
  INSERT INTO horario_lembrei (id_item, hora) VALUES (v_item, '08:00');
  INSERT INTO horario_lembrei (id_item, hora) VALUES (v_item, '20:00');

  INSERT INTO item_lembrei (id_usuario, tipo, nome, dose, qtd_por_dose, estoque_atual)
  VALUES (v_usuario, 'REMEDIO', 'Metformina 850 mg', '1 comprimido', 1, 3)
  RETURNING id_item INTO v_item;
  INSERT INTO horario_lembrei (id_item, hora) VALUES (v_item, '20:00');

  INSERT INTO item_lembrei (id_usuario, tipo, nome)
  VALUES (v_usuario, 'HABITO', 'Beber agua')
  RETURNING id_item INTO v_item;
  INSERT INTO horario_lembrei (id_item, hora) VALUES (v_item, '12:00');

  COMMIT;
EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
END;
/

SELECT u.nome, i.tipo, i.nome AS item, i.estoque_atual, h.hora
FROM usuario_lembrei u
JOIN item_lembrei i    ON i.id_usuario = u.id_usuario
JOIN horario_lembrei h ON h.id_item    = i.id_item
ORDER  BY h.hora;
