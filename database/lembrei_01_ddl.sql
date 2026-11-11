WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

CREATE TABLE usuario_lembrei (
  id_usuario        NUMBER GENERATED ALWAYS AS IDENTITY,
  uuid_dispositivo  VARCHAR2(36)  NOT NULL,
  nome              VARCHAR2(60)  NOT NULL,
  dt_criacao        DATE          DEFAULT SYSDATE NOT NULL,
  CONSTRAINT pk_usuario      PRIMARY KEY (id_usuario),
  CONSTRAINT uk_usuario_uuid UNIQUE (uuid_dispositivo)
);

CREATE TABLE item_lembrei (
  id_item        NUMBER GENERATED ALWAYS AS IDENTITY,
  id_usuario     NUMBER        NOT NULL,
  tipo           VARCHAR2(10)  NOT NULL,
  nome           VARCHAR2(80)  NOT NULL,
  dose           VARCHAR2(40),
  qtd_por_dose   NUMBER(3)     DEFAULT 1 NOT NULL,
  estoque_atual  NUMBER(5),
  dias_semana    CHAR(7)       DEFAULT '1111111' NOT NULL,
  ativo          CHAR(1)       DEFAULT 'S' NOT NULL,
  dt_criacao     DATE          DEFAULT SYSDATE NOT NULL,
  CONSTRAINT pk_item          PRIMARY KEY (id_item),
  CONSTRAINT fk_item_usuario  FOREIGN KEY (id_usuario) REFERENCES usuario_lembrei (id_usuario) ON DELETE CASCADE,
  CONSTRAINT ck_item_tipo     CHECK (tipo IN ('REMEDIO','HABITO')),
  CONSTRAINT ck_item_ativo    CHECK (ativo IN ('S','N')),
  CONSTRAINT ck_item_qtd      CHECK (qtd_por_dose > 0),
  CONSTRAINT ck_item_estoque  CHECK (estoque_atual IS NULL OR estoque_atual >= 0),
  CONSTRAINT ck_item_remedio  CHECK (tipo = 'HABITO' OR estoque_atual IS NOT NULL),
  CONSTRAINT ck_item_dias     CHECK (REGEXP_LIKE(dias_semana, '^[01]{7}$'))
);

CREATE TABLE horario_lembrei (
  id_horario  NUMBER GENERATED ALWAYS AS IDENTITY,
  id_item     NUMBER    NOT NULL,
  hora        CHAR(5)   NOT NULL,
  CONSTRAINT pk_horario      PRIMARY KEY (id_horario),
  CONSTRAINT fk_horario_item FOREIGN KEY (id_item) REFERENCES item_lembrei (id_item) ON DELETE CASCADE,
  CONSTRAINT uk_horario      UNIQUE (id_item, hora),
  CONSTRAINT ck_horario_hora CHECK (REGEXP_LIKE(hora, '^([01][0-9]|2[0-3]):[0-5][0-9]$'))
);

CREATE TABLE registro_dose_lembrei (
  id_registro  NUMBER GENERATED ALWAYS AS IDENTITY,
  id_horario   NUMBER        NOT NULL,
  dt_prevista  TIMESTAMP     NOT NULL,
  dt_tomada    TIMESTAMP,
  status       VARCHAR2(10)  DEFAULT 'PENDENTE' NOT NULL,
  CONSTRAINT pk_registro      PRIMARY KEY (id_registro),
  CONSTRAINT fk_registro_hor  FOREIGN KEY (id_horario) REFERENCES horario_lembrei (id_horario) ON DELETE CASCADE,
  CONSTRAINT uk_registro      UNIQUE (id_horario, dt_prevista),
  CONSTRAINT ck_registro_st   CHECK (status IN ('PENDENTE','TOMADO','ESQUECIDO')),
  CONSTRAINT ck_registro_tom  CHECK (status <> 'TOMADO' OR dt_tomada IS NOT NULL)
);

CREATE TABLE movimento_estoque_lembrei (
  id_movimento   NUMBER GENERATED ALWAYS AS IDENTITY,
  id_item        NUMBER        NOT NULL,
  id_registro    NUMBER,
  tipo           VARCHAR2(10)  NOT NULL,
  quantidade     NUMBER(5)     NOT NULL,
  dt_movimento   TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_movimento     PRIMARY KEY (id_movimento),
  CONSTRAINT fk_mov_item      FOREIGN KEY (id_item)     REFERENCES item_lembrei (id_item) ON DELETE CASCADE,
  CONSTRAINT fk_mov_registro  FOREIGN KEY (id_registro) REFERENCES registro_dose_lembrei (id_registro) ON DELETE SET NULL,
  CONSTRAINT ck_mov_tipo      CHECK (tipo IN ('BAIXA','REPOSICAO')),
  CONSTRAINT ck_mov_qtd       CHECK (quantidade > 0)
);

CREATE INDEX idx_item_usuario   ON item_lembrei (id_usuario);

CREATE INDEX idx_horario_item   ON horario_lembrei (id_item);

CREATE INDEX idx_registro_hor   ON registro_dose_lembrei (id_horario);

CREATE INDEX idx_registro_dt    ON registro_dose_lembrei (dt_prevista);

CREATE INDEX idx_mov_item       ON movimento_estoque_lembrei (id_item);
