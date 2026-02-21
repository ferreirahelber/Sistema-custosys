# Product Requirements Document (PRD) - Sistema CustoSys

## 1. Visão Geral do Produto
O **CustoSys** é um sistema web integrado para gestão de custos, precificação e vendas (Frente de Caixa/PDV), focado em pequenos e médios estabelecimentos alimentícios (restaurantes, confeitarias, lanchonetes).
O diferencial do sistema é o cálculo preciso de custos de produção ("Engenharia de Cardápio"), considerando não apenas o Custo da Mercadoria Vendida (CMV/Insumos), mas também custos operacionais (Mão de Obra e Custos Fixos) rateados pelo tempo de preparo.

## 2. Perfis de Usuário
O sistema possui controle de acesso baseado em funções (RBAC):
1.  **Administrador (Admin)**
    *   Acesso total ao sistema.
    *   Gestão de configurações financeiras, cadastros de insumos, receitas, usuários e visualização de relatórios.
2.  **Operador de Caixa (Cashier)**
    *   Acesso restrito ao módulo de Frente de Caixa (POS).
    *   Funcionalidades: Abrir caixa, realizar vendas, fechar caixa.

## 3. Funcionalidades Principais

### 3.1. Gestão de Insumos e Estoque
Responsável pelo cadastro da base de dados de materiais.
*   **Ingredientes (`IngredientForm`)**: Cadastro de insumos alimentares com preço de compra e unidade (kg, g, l, un). Suporte a conversão de medidas.
*   **Embalagens (`PackagingView`)**: Gestão separada para itens de embalagem/descartáveis.
*   **Produtos de Revenda (`ResaleProductsView`)**: Itens comprados prontos para venda (ex: bebidas em lata), com cálculo simples de margem de lucro.

### 3.2. Engenharia de Cardápio e Custos
Núcleo da inteligência do sistema.
*   **Receitas e Fichas Técnicas (`RecipeForm`, `RecipeList`)**:
    *   Criação de receitas compostas por Insumos e/ou Outras Receitas (Bases).
    *   Definição de rendimento (porções/unidades) e tempo de preparo.
*   **Bases de Produção**: Receitas intermediárias (ex: "Molho de Tomate") que servem de insumo para outros pratos.
*   **Custeio Automático (`CostingView`)**: O sistema calcula automaticamente:
    *   Custo de Insumos (CMV).
    *   Custo de Mão de Obra (baseado no tempo de preparo x custo minuto da equipe).
    *   Custo Fixo/Overhead (rateio de aluguel/energia por minuto de produção).
*   **Simulador de Preços (`PricingSimulator`)**: Calculadora para definir o Preço de Venda ideal, considerando:
    *   Custos Totais.
    *   Taxas de Cartão e Impostos.
    *   Margem de Lucro Desejada.

### 3.3. Configurações Financeiras (`SettingsForm`)
Painel onde o Admin define os parâmetros globais para o cálculo de custos:
*   Custo total mensal da folha de pagamento.
*   Custos fixos mensais (Aluguel, Energia, Internet).
*   Jornada de trabalho mensal (para cálculo do custo/minuto).
*   Taxas padrões de impostos e cartões (Crédito/Débito).

### 3.4. Frente de Caixa (POS) (`PosView`)
Interface otimizada para operação rápida em balcão.
*   **Sessão de Caixa**: Abertura com fundo de troco e Fechamento com conferência de valores (`CashModal`, `CashHistory`).
*   **Venda Rápida**: Seleção de produtos (Receitas ou Revenda) e adição ao carrinho.
*   **Pagamento**: Registro de pagamentos em Dinheiro, Crédito, Débito ou PIX.
*   **Cupom**: Geração de comprovante (visualização/impressão).

### 3.5. Relatórios e Gestão
*   **Dashboard**: Visão geral de métricas.
*   **Vendas (`SalesView`)**: Histórico detalhado de vendas realizadas.
*   **Despesas (`ExpensesView`)**: Lançamento de saídas avulsas do caixa ou contas pagas.
*   **Gestão de Usuários (`UserManagement`)**: Convite e definição de permissões para novos usuários.

## 4. Arquitetura e Tecnologia
O projeto é uma **Single Page Application (SPA)** moderna.

*   **Frontend**: React 19 (Vite).
*   **Linguagem**: TypeScript.
*   **Armazenamento e Auth**: Supabase (PostgreSQL + Authentication).
*   **Gerenciamento de Estado**: React Query (TanStack Query) para dados do servidor; Context API para Sessão/Auth.
*   **Estilização**: Tailwind CSS (Utility-first) + Shadcn/UI (Componentes).
*   **Roteamento**: React Router v7.

## 5. Modelo de Dados (Entidades Chave)

| Entidade | Descrição |
| :--- | :--- |
| `Profile` | Perfil do usuário com role (`admin`/`cashier`). Vinculado ao Auth do Supabase. |
| `Settings` | Singleton com configurações globais de custos e taxas. |
| `Ingredient` | Matéria-prima base. |
| `Recipe` | Produto manufaturado. Possui lista de `items` (ingredientes ou sub-receitas). |
| `Product` | Produto de revenda (não manufaturado). |
| `Sale` / `Order` | Registro de uma transação de venda. |
| `CashSession` | Controle de fluxo de caixa (Turno). |
