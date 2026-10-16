-- Tres correccoes dele, 16 Out 2026 a noite.
--
-- 1. LINGUAS. "tem de ter pelo menos pt e en, e já estar preparado para ser facil para outras
--    linguas". Os textos do perfil deixam de viver so nas colunas de `perfis` e passam a ter uma
--    linha por lingua nesta tabela. A lingua base continua em `perfis`, para um cartao sem
--    traducao nenhuma continuar a abrir.
--
-- 2. PARTILHA. "tem de haver botao de partilha de perfil (...) e também source nova tipo shared".
--    A coluna `origem` tem uma lista fechada de valores, e no SQLite uma lista dessas nao se
--    altera: tem de se refazer a tabela. Esta vazia (os ensaios foram limpos), logo e seguro.
--
-- 3. SEM LIMITES POR PESSOA. "nao quero nada destes limites! quem me dera ter muita gente a
--    visitar o cartao". As tabelas de travao por aparelho e por cartao deixam de ser usadas pelo
--    codigo. NAO se apagam: ficam vazias e sem leitor, para o historico nao se perder e para o dia
--    em que faca falta um travao de emergencia sobre o NOSSO gasto, que e outra coisa.

CREATE TABLE perfil_textos (
  dono_num     INTEGER NOT NULL REFERENCES donos(num),
  lingua       TEXT    NOT NULL,          -- 'pt', 'en', e o que vier a seguir
  nome         TEXT,
  papel        TEXT,
  bio          TEXT,
  gemeo_nome   TEXT,
  gemeo_nota   TEXT,
  PRIMARY KEY (dono_num, lingua)
);

CREATE TABLE visitas_nova (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ts            INTEGER NOT NULL,
  dono_num      INTEGER NOT NULL,
  afiliado_num  INTEGER,
  origem        TEXT    NOT NULL CHECK (origem IN ('qr','manual','link','partilhado','desconhecida')),
  dispositivo   TEXT    NOT NULL DEFAULT 'desconhecido'
                  CHECK (dispositivo IN ('telefone','tablet','computador','desconhecido')),
  pais          TEXT,
  robo          INTEGER NOT NULL DEFAULT 0 CHECK (robo IN (0,1)),
  visitante     TEXT
);
INSERT INTO visitas_nova (id, ts, dono_num, afiliado_num, origem, dispositivo, pais, robo, visitante)
  SELECT id, ts, dono_num, afiliado_num, origem, dispositivo, pais, robo, visitante FROM visitas;
DROP TABLE visitas;
ALTER TABLE visitas_nova RENAME TO visitas;
CREATE INDEX idx_visitas_cartao ON visitas(dono_num, afiliado_num, id DESC);

-- O perfil dele, como ele o quer. "do meu cartao tira o Médico. Investigação e tratamento de
-- dados. mete só tipo o rapaz das soluções".
UPDATE perfis SET
  papel = 'O rapaz das soluções',
  mapa_url = 'https://share.google/UYurFIThaS7dtm1SQ',
  actualizado_em = unixepoch()
WHERE dono_num = 1;

INSERT INTO perfil_textos (dono_num, lingua, nome, papel, bio, gemeo_nome, gemeo_nota) VALUES
(1, 'pt', 'André da Silva', 'O rapaz das soluções',
 'Venho da investigação e do tratamento de dados aplicados à saúde, e o trabalho acabou por se expandir para empresas e para o sector público.

Na McMinsky construímos coisas que não existem noutro sítio: plataformas de raiz, especialistas virtuais, levantamentos de saúde, eventos. Temos estúdio aberto ao público em Lisboa.

Ligam-nos quando querem algo bem feito, depressa, e sem ficarem reféns de ninguém.',
 'André digital',
 'Atende a qualquer hora, em qualquer língua, e nunca se cansa de explicar a mesma coisa. Fala com a minha voz, mas não é eu.'),
(1, 'en', 'André da Silva', 'The solutions guy',
 'I come from research and data work applied to health, and it ended up growing into companies and the public sector.

At McMinsky we build things that do not exist anywhere else: platforms from scratch, virtual specialists, health surveys, events. We have a studio open to the public in Lisbon.

People call us when they want something done well, quickly, and without being locked in.',
 'Digital André',
 'Answers at any hour, in any language, and never tires of explaining the same thing twice. It speaks with my voice, but it is not me.');
