-- Fase 1.5 e fase 2: o perfil que a pagina do cartao mostra, o identificador do aparelho com
-- consentimento, e a fila de mensagens de voz para o duplo digital.
--
-- Decisoes gravadas nesta forma:
--
-- 1. O PERFIL VIVE NA BASE, nao no codigo. Ordem dele a 16 Out 2026: "por agora não te preocupes
--    com back office de edição dos campos todos que aqui estão, podes ser tu a meter diretamente
--    na base de dados D1 onde isto depois vai buscar a informação". Assim um dono novo entra sem
--    publicar codigo outra vez.
--
-- 2. AS FOTOGRAFIAS VAO PARA O R2, nao para a pasta do site. Pedido dele: "R2 para termos a
--    fotografia da pessoa do cartão". Uma fotografia nova nao obriga a publicar o site.
--
-- 3. O IDENTIFICADOR DO APARELHO SO NASCE COM CONSENTIMENTO. Nao ha isencao de analitica em
--    Portugal: a nota informativa da CNPD de 25 Jun 2021 diz expressamente que o consentimento se
--    aplica "como é o caso de cookies para fins de analítica". A isencao de medicao de audiencia e
--    pratica francesa (CNIL), nao vincula a CNPD. Por isso a coluna `visitas.visitante` fica NULL
--    para quem nao aceitou, e o resto do sistema tem de funcionar com ela vazia.
--
-- 4. O QUE PESA JURIDICAMENTE E A JUNCAO (codigo do aparelho x numero do cartao), nao cada metade.
--    O codigo vive 13 meses desde a criacao e NAO e renovado a cada visita; os dados ligados a ele
--    duram no maximo 25 meses. Esses prazos sao de produto, nao de capricho: estao escritos aqui
--    para quem vier depois nao os esticar sem perceber o que esta a fazer.

CREATE TABLE perfis (
  dono_num        INTEGER PRIMARY KEY REFERENCES donos(num),
  nome            TEXT,            -- como aparece no cartao, se diferente de donos.nome
  papel           TEXT,            -- uma linha debaixo do nome
  bio             TEXT,            -- CV curto, em paragrafos separados por linha vazia
  foto_chave      TEXT,            -- chave no R2
  linkedin        TEXT,
  morada          TEXT,
  mapa_url        TEXT,
  email           TEXT,
  whatsapp        TEXT,            -- so digitos, com indicativo
  telegram        TEXT,            -- sem o @
  telefone        TEXT,            -- so digitos, com indicativo
  gemeo_activo    INTEGER NOT NULL DEFAULT 1 CHECK (gemeo_activo IN (0,1)),
  gemeo_nome      TEXT,            -- "André digital"
  gemeo_nota      TEXT,            -- a frase meio a serio meio a brincar da parte digital
  gemeo_voz       TEXT NOT NULL DEFAULT 'clonada' CHECK (gemeo_voz IN ('clonada','neural','browser')),
  actualizado_em  INTEGER NOT NULL
);

-- Visitantes distintos por dia e por cartao, para o agregado nao precisar de varrer as visitas.
-- Quem escreve e que soma; quem le nunca conta o universo.
CREATE TABLE visto_dia (
  dia            TEXT    NOT NULL,
  dono_num       INTEGER NOT NULL,
  afiliado_num   INTEGER NOT NULL DEFAULT 0,
  visitante      TEXT    NOT NULL,
  PRIMARY KEY (dia, dono_num, afiliado_num, visitante)
);

-- Uma conversa por aparelho e por cartao. E o que da contexto ao atendimento seguinte, requisito
-- dele: "tem de dar para ter contexto da conversa anterior a cada atendimento".
CREATE TABLE conversas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  dono_num       INTEGER NOT NULL,
  afiliado_num   INTEGER,
  visitante      TEXT    NOT NULL,          -- codigo do aparelho; sem ele nao ha conversa
  nome           TEXT,                      -- opcional, escrito por quem fala
  contacto       TEXT,                      -- opcional
  estado         TEXT    NOT NULL DEFAULT 'aberta' CHECK (estado IN ('aberta','humano','fechada')),
  para_humano    INTEGER NOT NULL DEFAULT 0 CHECK (para_humano IN (0,1)),
  criado_em      INTEGER NOT NULL,
  ultima_em      INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_conversas_cartao ON conversas(dono_num, visitante);

-- A fila. Uma mensagem de cada vez, por ordem de id, como o copiloto do carro ja faz.
CREATE TABLE mensagens (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  conversa_id    INTEGER NOT NULL REFERENCES conversas(id),
  papel          TEXT    NOT NULL CHECK (papel IN ('visitante','gemeo','humano')),
  texto          TEXT,                      -- transcricao, ou a resposta escrita
  audio_chave    TEXT,                      -- chave no R2
  audio_ms       INTEGER,
  estado         TEXT    NOT NULL DEFAULT 'pendente'
                   CHECK (estado IN ('pendente','a_atender','respondida','falhou')),
  criado_em      INTEGER NOT NULL,
  atendido_em    INTEGER,
  resposta_de    INTEGER                    -- id da mensagem a que esta responde
);
CREATE INDEX idx_mensagens_fila ON mensagens(estado, id);

-- Travao de uso abusivo. Requisito dele: "tem de dar para limitar uso abusivo". Conta por aparelho
-- e por dia, porque e a unica coisa que temos sem guardar o IP.
CREATE TABLE travao_voz (
  dia            TEXT    NOT NULL,
  visitante      TEXT    NOT NULL,
  pedidos        INTEGER NOT NULL DEFAULT 0,
  segundos       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, visitante)
);

-- O perfil do dono 1. Os valores sao os que ele deu a 16 Out 2026 e os que ja estao no site.
INSERT INTO perfis (
  dono_num, nome, papel, bio, foto_chave, linkedin, morada, mapa_url,
  email, whatsapp, telegram, telefone, gemeo_activo, gemeo_nome, gemeo_nota, gemeo_voz, actualizado_em
) VALUES (
  1,
  'André da Silva',
  'Médico. Investigação e tratamento de dados.',
  'Venho da investigação e do tratamento de dados aplicados à saúde, e o trabalho acabou por se expandir para empresas e para o sector público.

Na McMinsky construímos coisas que não existem noutro sítio: plataformas de raiz, especialistas virtuais, levantamentos de saúde, eventos. Temos estúdio aberto ao público em Lisboa.

Ligam-nos quando querem algo bem feito, depressa, e sem ficarem reféns de ninguém.',
  'andre-1.png',
  'https://www.linkedin.com/in/andrefrsilva',
  'Azinhaga da Cidade, 24A r/c, 1750-063 Lisboa',
  'https://www.google.com/maps/search/?api=1&query=Azinhaga+da+Cidade+24A+1750-063+Lisboa',
  'andrefrsilva@msn.com',
  '351913008339',
  'medicinup',
  '351913008339',
  1,
  'André digital',
  'Atende a qualquer hora, em qualquer língua, e nunca se cansa de explicar a mesma coisa. Fala com a minha voz, mas não é eu.',
  'clonada',
  unixepoch()
);
