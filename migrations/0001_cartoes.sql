-- Cartoes pessoais: donos, afiliados, lotes de impressao, visitas e o agregado que o painel le.
--
-- Decisoes que estao gravadas nesta forma, e que valem mais do que o SQL:
--
-- 1. OS NUMEROS SAO DESTA BASE, nao do Pessoas. A tabela persons do Pessoas esta exactamente nas
--    100 colunas, que e o limite do D1, logo um campo novo la custa largar outro; o Andre e a
--    pessoa 37 no Pessoas e quer "1" no cartao; e os cartoes imprimem-se ANTES de a pessoa existir.
--    A ligacao e so a coluna pessoa_id, que pode ficar vazia para sempre sem nada quebrar.
--
-- 2. POUCOS INDICES NA TABELA DE VISITAS. O tecto gratuito do D1 que BLOQUEIA e o das ESCRITAS,
--    100.000 linhas por dia na CONTA INTEIRA, partilhado com o Pessoas e o Tempo (a 23 Set 2026
--    uma migracao do Pessoas gastou 103.834 e a Cloudflare bloqueou escritas ate a meia-noite).
--    Cada indice multiplica as linhas cobradas por cada insercao. Por isso ha UM indice, e a lista
--    dos registos recentes ordena-se por `id` (que e o rowid e ja esta em ordem de insercao) em vez
--    de ter um indice proprio para a data.
--
-- 3. O AGREGADO E ESCRITO POR QUEM ESCREVE, nunca calculado por quem le. O painel nunca varre a
--    tabela de visitas: um ecra de estado que conta o universo a cada abertura custa universo vezes
--    aberturas, e foi assim que se gastou 1,76 milhoes de leituras num dia a 9 de Outubro de 2026.

CREATE TABLE donos (
  num          INTEGER PRIMARY KEY,          -- o "P" impresso no cartao. 1 = Andre.
  nome         TEXT    NOT NULL,
  pessoa_id    INTEGER,                      -- id no Pessoas, opcional e preenchido a mao
  tipo         TEXT    NOT NULL DEFAULT 'pessoa' CHECK (tipo IN ('pessoa','especialista')),
  activo       INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
  criado_em    INTEGER NOT NULL
);

CREATE TABLE lotes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  dono_num     INTEGER NOT NULL REFERENCES donos(num),
  de           INTEGER NOT NULL,             -- primeiro numero de afiliado da folha
  ate          INTEGER NOT NULL,             -- ultimo, inclusive
  quantos      INTEGER NOT NULL,
  criado_em    INTEGER NOT NULL,
  nota         TEXT
);

-- Um afiliado e a PESSOA CONCRETA a quem o cartao foi entregue (decisao dele a 16 Out 2026:
-- "a folha pdf deve ser toda para a mesma pessoa mas cada etiqueta com tag de afiliado diferente").
-- A linha nasce VAZIA no momento da impressao e so ganha nome quando o cartao e entregue, o que e
-- exactamente por isto que os numeros tem de ser reservados pelo servidor: duas folhas impressas em
-- dias diferentes nunca podem repetir numeros, porque o papel nao se corrige.
CREATE TABLE afiliados (
  num            INTEGER PRIMARY KEY,
  nome           TEXT,                       -- NULL enquanto o cartao nao for entregue
  pessoa_id      INTEGER,                    -- id no Pessoas, preenchido no painel
  lote_id        INTEGER REFERENCES lotes(id),
  nota           TEXT,
  criado_em      INTEGER NOT NULL,
  atribuido_em   INTEGER                     -- quando deixou de estar vazio
);

CREATE TABLE visitas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,  -- tambem serve de ordem cronologica
  ts            INTEGER NOT NULL,
  dono_num      INTEGER NOT NULL,
  afiliado_num  INTEGER,
  origem        TEXT    NOT NULL CHECK (origem IN ('qr','manual','link','desconhecida')),
  dispositivo   TEXT    NOT NULL DEFAULT 'desconhecido'
                  CHECK (dispositivo IN ('telefone','tablet','computador','desconhecido')),
  pais          TEXT,                         -- codigo de duas letras. O IP NUNCA e guardado.
  robo          INTEGER NOT NULL DEFAULT 0 CHECK (robo IN (0,1)),
  visitante     TEXT                          -- codigo aleatorio do dispositivo, ou NULL sem consentimento
);

CREATE INDEX idx_visitas_cartao ON visitas(dono_num, afiliado_num, id DESC);

CREATE TABLE agregado_dia (
  dia            TEXT    NOT NULL,            -- AAAA-MM-DD em hora de Portugal
  dono_num       INTEGER NOT NULL,
  afiliado_num   INTEGER NOT NULL DEFAULT 0,  -- 0 = sem afiliado, para a chave primaria funcionar
  visitas        INTEGER NOT NULL DEFAULT 0,
  visitas_robo   INTEGER NOT NULL DEFAULT 0,
  dispositivos   INTEGER NOT NULL DEFAULT 0,  -- visitantes distintos, so conta com consentimento
  PRIMARY KEY (dia, dono_num, afiliado_num)
);

-- O tecto diario de escritas em cru POR CARTAO (camada 2 dos tres limites). Passado o tecto a
-- visita continua a ser servida e continua a contar no agregado, mas deixa de gravar linha em cru.
-- Sem isto, um robo a bater num endereco de cartao esgota o orcamento de escritas da conta e poe o
-- Pessoas e o Tempo a recusar escritas ate a meia-noite UTC.
CREATE TABLE travao_dia (
  dia            TEXT    NOT NULL,
  dono_num       INTEGER NOT NULL,
  afiliado_num   INTEGER NOT NULL DEFAULT 0,
  escritas       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, dono_num, afiliado_num)
);

-- O dono 1 e o Andre. O nome vai como ele o escreve no site e na assinatura.
INSERT INTO donos (num, nome, tipo, activo, criado_em)
VALUES (1, 'André da Silva', 'pessoa', 1, unixepoch());
