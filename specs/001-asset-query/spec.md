# Feature Specification: Consulta de Ativos (Asset Query)

**Feature Branch**: `001-asset-query`
**Created**: 2026-04-30
**Status**: Draft
**Input**: User description: "O MCP server deve prover dados da API do Valueray sobre ações e ETF"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Buscar dados de um ativo por símbolo (Priority: P1)

Um usuário de IA (agente ou assistente com acesso ao MCP server) precisa obter dados
técnicos, de risco e de performance de um ativo financeiro específico — seja uma ação
(stock) ou um ETF — informando o símbolo do ticker (ex.: `AAPL`, `SPY`).

**Why this priority**: É o caso de uso central do servidor. Sem essa capacidade, nenhum
dado de ativo pode ser fornecido ao cliente MCP.

**Independent Test**: O cliente MCP pode chamar a tool `get_asset_data` passando apenas
o símbolo `AAPL` e receber uma resposta estruturada com dados técnicos, de risco e
de performance do ativo. Testável de forma isolada sem nenhum outro fluxo.

**Acceptance Scenarios**:

1. **Given** o MCP server está rodando localmente, **When** o cliente chama a tool
   `get_asset_data` com `symbol="AAPL"`, **Then** o servidor retorna dados técnicos
   (preço, médias móveis), de risco (Beta, Sharpe) e de performance (retornos por
   período) do ativo.

2. **Given** o MCP server está rodando localmente, **When** o cliente chama a tool
   `get_asset_data` com `symbol="SPY"` (ETF), **Then** o servidor retorna os dados
   correspondentes ao ETF, incluindo campos de performance e sentimento.

3. **Given** o MCP server está rodando localmente, **When** o cliente chama a tool
   `get_asset_data` com um símbolo inexistente (ex.: `XYZXYZ`), **Then** o servidor
   retorna uma mensagem de erro clara indicando que o ativo não foi encontrado.

---

### User Story 2 - Buscar comparativo com peers do setor (Priority: P2)

Um usuário de IA quer entender como um ativo se posiciona em percentil relativo aos
seus pares de mesmo subsetor GICS (valuation, rentabilidade, performance).

**Why this priority**: Agrega valor analítico significativo mas depende da US1 estar
funcional. O usuário pode trabalhar apenas com US1 num primeiro momento.

**Independent Test**: O cliente MCP chama a tool `get_asset_peers` com `symbol="AAPL"`
e recebe rankings percentuais de valuation, lucratividade e performance em relação
aos pares, além de lista dos 5 maiores pares por Relative Strength.

**Acceptance Scenarios**:

1. **Given** o MCP server está rodando localmente, **When** o cliente chama
   `get_asset_peers` com `symbol="AAPL"`, **Then** o servidor retorna percentis de
   valuation (PE, PS, PB), lucratividade (ROIC, ROE) e performance comparados ao
   subsetor do ativo.

2. **Given** o cliente chama `get_asset_peers` com um símbolo válido de ETF (ex.: `SPY`),
   **Then** o servidor retorna o JSON da Valueray API como vier (passthrough), sem
   tratamento especial para ETFs. O cliente MCP é responsável por interpretar a resposta.

---

### User Story 3 - Consultar regime de mercado global (Priority: P3)

Um usuário de IA quer ter contexto do regime de mercado atual (indicadores VIX/SKEW,
sinais de regime, rotação de indústrias) para embasar análises sobre os ativos consultados.

**Why this priority**: Contexto útil mas complementar. As US1 e US2 entregam valor
independentemente do regime de mercado.

**Independent Test**: O cliente MCP chama a tool `get_market_regime` sem parâmetros
e recebe o JSON completo do endpoint `/marketRegime` da Valueray API, contendo
`regime_values`, `regime_signals` e `industry_rotation`.

**Acceptance Scenarios**:

1. **Given** o MCP server está rodando localmente, **When** o cliente chama
   `get_market_regime` sem parâmetros, **Then** o servidor retorna o JSON completo
   da Valueray API (passthrough) com os campos de regime de mercado (`regime_values`,
   `regime_signals`, `industry_rotation`), sem filtragem ou parâmetros adicionais.

---

### Edge Cases

- O que acontece quando a API Valueray está indisponível ou retorna erro 5xx? O servidor
  deve propagar um erro descritivo ao cliente MCP em vez de travar silenciosamente.
- O que acontece quando o rate limit da API Valueray é atingido? O servidor deve retornar
  erro informativo ao cliente.
- O que acontece quando o símbolo é fornecido em letras minúsculas? O servidor deve
  normalizar para maiúsculas antes de chamar a API.
- O que acontece quando o parâmetro `exchange` é omitido? A API Valueray aceita consultas
  apenas pelo símbolo; o servidor não deve exigir o exchange.
- O que acontece quando `get_asset_peers` é chamado com um ETF? O servidor retorna o
  JSON da API como vier (passthrough), sem detecção especial de tipo de ativo. Pode
  resultar em lista de peers vazia — o cliente MCP interpreta o resultado.
- O que acontece quando a variável de ambiente `TOKEN_SERVICE` não está configurada?
  O servidor DEVE recusar a inicialização e exibir uma mensagem de erro clara
  informando que a chave de acesso é obrigatória.
- O que acontece quando `TOKEN_SERVICE` está definida com valor vazio? O servidor
  DEVE tratar como ausente e recusar a inicialização.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O MCP server DEVE implementar o protocolo MCP e expor suas capacidades
  via ferramentas (tools) e prompts MCP-compatíveis.
- **FR-002**: O MCP server DEVE prover uma tool `get_asset_data` que aceite um símbolo
  de ticker (obrigatório) e opcionalmente o exchange, retornando o JSON completo da
  Valueray API para o ativo (passthrough), removendo apenas os campos `disclaimer` e
  `field_explanations` antes de entregar ao cliente MCP.
- **FR-003**: O MCP server DEVE prover uma tool `get_asset_peers` que aceite um símbolo
  de ticker e retorne o JSON completo da Valueray API de peers do ativo (passthrough),
  removendo apenas `disclaimer` e `field_explanations`.
- **FR-004**: O MCP server DEVE prover uma tool `get_market_regime` sem parâmetros
  obrigatórios, retornando o JSON completo da Valueray API de regime de mercado
  (passthrough), removendo apenas `disclaimer` e `field_explanations`.
- **FR-005**: O MCP server DEVE expor ao menos um prompt de exemplo que encadeia as 3
  tools em sequência (`get_asset_data` → `get_asset_peers` → `get_market_regime`),
  demonstrando uma análise completa de um ativo no contexto do mercado atual.
- **FR-006**: O MCP server DEVE rodar localmente e ser inicializável via linha de
  comando sem infraestrutura externa.
- **FR-007**: O MCP server DEVE normalizar símbolos de ticker para maiúsculas antes
  de encaminhar requisições à Valueray API.
- **FR-008**: O MCP server DEVE retornar erros descritivos ao cliente MCP quando a
  Valueray API estiver indisponível, retornar erro ou atingir rate limit.
- **FR-009**: A base URL da Valueray API DEVE ser configurável via variável de ambiente
  `VALUERAY_BASE_URL`, com fallback hardcoded para `https://www.valueray.com/api/v1`.
  Um arquivo `.env` DEVE ser incluído no repositório com o valor padrão pré-configurado.
- **FR-010**: O MCP server DEVE exigir uma chave de acesso configurada via variável de
  ambiente `TOKEN_SERVICE`. No momento da inicialização do servidor, o sistema DEVE
  validar a existência (presença e valor não-vazio) dessa variável. Caso a variável
  não esteja definida ou esteja vazia, o servidor DEVE recusar a inicialização e
  encerrar com uma mensagem de erro clara indicando que a chave é obrigatória. Nesta
  versão, apenas a presença da chave é validada — o conteúdo/formato não é verificado.

### Key Entities

- **Asset (Ativo)**: Representa uma ação ou ETF identificado por símbolo (ticker) e
  opcionalmente exchange. O conteúdo do objeto é o JSON completo retornado pela
  Valueray API (endpoint `/symbolData`), excluindo `disclaimer` e `field_explanations`.
- **AssetPeers (Pares do Ativo)**: Representa o comparativo do ativo com peers do mesmo
  subsetor GICS. O conteúdo é o JSON completo do endpoint `/symbolPeers`, excluindo
  `disclaimer` e `field_explanations`.
- **MarketRegime (Regime de Mercado)**: Representa o estado atual do mercado global.
  O conteúdo é o JSON completo do endpoint `/marketRegime` (contém `regime_values`,
  `regime_signals`, `industry_rotation`), excluindo `disclaimer` e `field_explanations`.
- **MCPTool**: Uma ferramenta exposta pelo servidor MCP. Cada tool tem nome, descrição,
  schema de input e lógica de execução que consulta a Valueray API.
- **MCPPrompt**: Um template de prompt registrado no servidor MCP, demonstrando um
  caso de uso concreto das tools disponíveis.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um cliente MCP compatível consegue invocar a tool `get_asset_data` e
  receber resposta estruturada com dados do ativo em menos de 5 segundos (excluindo
  latência de rede da API Valueray).
- **SC-002**: 100% das chamadas às tools com símbolos válidos resultam em resposta
  de dados bem-formada ao cliente MCP.
- **SC-003**: 100% das chamadas com símbolos inválidos ou quando a API retorna erro
  resultam em mensagem de erro descritiva (não em falha silenciosa ou crash do servidor).
- **SC-004**: O MCP server inicia com sucesso localmente em menos de 10 segundos após
  o comando de inicialização, quando `TOKEN_SERVICE` está configurada.
- **SC-005**: O prompt de exemplo registrado no servidor é listado e utilizável por
  clientes MCP compatíveis (ex.: Claude Desktop, outros clientes MCP).
- **SC-006**: O MCP server recusa inicialização e encerra com mensagem de erro clara
  quando a variável de ambiente `TOKEN_SERVICE` não está definida ou está vazia.

## Assumptions

- O rate limit da Valueray API (30 req/h para dados de ativo) é suficiente para uso
  exploratório/desenvolvimento; caching não é escopo desta feature.
- O MCP server é consumido por um único cliente MCP por vez (não há requisito de
  concorrência ou escalonamento horizontal).
- A Valueray API não requer autenticação via API key para o plano gratuito; rate
  limiting é por IP.
- O endpoint `symbolSearch` da Valueray não é coberto nesta feature; a busca por
  símbolo exato é suficiente.
- Os endpoints reais da Valueray API são: `/symbolData?symbol=`, `/symbolPeers?symbol=`,
  e `/marketRegime` (confirmados empiricamente). O arquivo `.env` incluído no repositório
  define `VALUERAY_BASE_URL=https://www.valueray.com/api/v1` como padrão.
- O protocolo de transporte MCP usado será stdio (padrão para servidores MCP locais),
  compatível com Claude Desktop e ferramentas similares.
- Os campos de resposta da Valueray API são passados diretamente ao cliente MCP
  (passthrough), sem mapeamento ou curadoria de campos. Apenas `disclaimer` e
  `field_explanations` são removidos de cada resposta antes da entrega.
- A variável `TOKEN_SERVICE` é obrigatória na configuração do servidor MCP pelo cliente.
  Nesta versão, apenas a presença (existência e não-vazio) da chave é validada — não
  há verificação de formato, validade ou autenticação contra um serviço externo.
- O valor de `TOKEN_SERVICE` NÃO é incluído no arquivo `.env` do repositório por ser
  um segredo; cada operador fornece seu próprio valor na configuração do cliente MCP.

## Clarifications

### Session 2026-04-30

- Q: Qual escopo de campos a tool `get_asset_data` deve retornar? → A: Passthrough completo — JSON exato da Valueray API, removendo apenas `disclaimer` e `field_explanations`.
- Q: Como o ValuerayClient deve gerenciar a base URL da API? → A: Env var `VALUERAY_BASE_URL` com fallback hardcoded + arquivo `.env` no repositório com valor `https://www.valueray.com/api/v1`.
- Q: Comportamento de `get_asset_peers` com ETF? → A: Passthrough puro — retorna o JSON da API como vier, sem tratamento especial ou detecção de tipo de ativo.
- Q: A tool `get_market_regime` aceita parâmetros de filtro? → A: Não — sem parâmetros, passthrough total do endpoint `/marketRegime` (campos: `regime_values`, `regime_signals`, `industry_rotation`).
- Q: O prompt de exemplo deve chamar qual combinação de tools? → A: As 3 tools em sequência — `get_asset_data` → `get_asset_peers` → `get_market_regime` para análise completa.

### Session 2026-05-04

- Q: O servidor exige autenticação? → A: Sim. O cliente que configura o MCP server deve obrigatoriamente informar uma chave de acesso via variável de ambiente `TOKEN_SERVICE`. No momento da inicialização, o servidor valida somente a existência (presença e não-vazio) dessa variável — não valida formato nem autenticidade do token.
- Q: O que acontece se `TOKEN_SERVICE` não for informada? → A: O servidor recusa a inicialização e encerra com mensagem de erro clara.
- Q: O `TOKEN_SERVICE` deve ser incluído no `.env`? → A: Não — é um segredo. O operador configura na seção de environment do cliente MCP (ex.: `claude_desktop_config.json`).
