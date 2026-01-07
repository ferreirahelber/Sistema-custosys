# Sistema Custosys

Sistema web profissional para **gestão de custos, receitas e precificação** voltado a pequenos negócios (docerias, confeitarias, alimentação artesanal, etc.).

O objetivo do projeto é facilitar o controle de estoque de ingredientes, criação de fichas técnicas, cálculo automático de custos e simulação de preços de venda com foco em precisão financeira.

---

## 🧰 Tecnologias Utilizadas

O projeto utiliza uma stack moderna e robusta:

* **Frontend:** React 19, TypeScript, Vite
* **Estilização:** Tailwind CSS, Lucide React
* **Backend / Banco de Dados:** Supabase (PostgreSQL + Auth)
* **Gerenciamento de Estado:** React Context API + Hooks

---

## 📁 Estrutura do Projeto

Sistema-custosys/ ├─ components/ # Componentes de UI e telas do sistema ├─ contexts/ # Contextos globais (AuthContext, etc) ├─ services/ # Camada de comunicação com o Supabase ├─ utils/ # Regras de negócio e cálculos matemáticos ├─ database/ # Scripts SQL para criação do banco e políticas de segurança ├─ .env.example # Modelo das variáveis de ambiente └─ App.tsx # Componente raiz e roteamento


---

## ⚙️ Requisitos

Antes de começar, certifique-se de ter instalado:

* **Node.js** (versão 18 ou superior)
* **npm** ou **yarn**

---

## 🚀 Como rodar o projeto localmente

### 1️⃣ Clonar o repositório

```bash
git clone [https://github.com/ferreirahelber/Sistema-custosys.git](https://github.com/ferreirahelber/Sistema-custosys.git)
cd Sistema-custosys
2️⃣ Instalar as dependências
Bash

npm install
3️⃣ Configurar o Supabase (Banco de Dados)
O sistema necessita de um backend Supabase para funcionar:

Crie uma conta e um novo projeto em Supabase.com.

No painel do Supabase, vá até SQL Editor.

Copie o conteúdo do arquivo database/schema.sql deste projeto e execute-o no SQL Editor.

Isso criará as tabelas necessárias (recipes, ingredients, user_settings, etc).

Isso também configurará as políticas de segurança (Row Level Security - RLS).

Vá em Project Settings > API e copie:

Project URL

anon public key

4️⃣ Configurar variáveis de ambiente
Na raiz do projeto, crie um arquivo chamado .env.local (baseado no .env.example):

Bash

cp .env.example .env.local
Abra o arquivo .env.local e preencha com as credenciais obtidas no passo anterior:

Snippet de código

VITE_APP_NAME=Sistema Custosys
VITE_SUPABASE_URL=SUA_URL_DO_SUPABASE_AQUI
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA_AQUI
5️⃣ Rodar o projeto
Inicie o servidor de desenvolvimento:

Bash

npm run dev
Acesse a aplicação em: http://localhost:5173 (ou na porta indicada no terminal).

💾 Segurança e Persistência
Diferente de versões anteriores (que usavam LocalStorage), esta versão persiste todos os dados na nuvem via Supabase.

Autenticação: Gerenciada via Supabase Auth (E-mail/Senha).

Segurança (RLS): Todas as tabelas possuem Row Level Security ativado. Um usuário só consegue ler, editar e excluir seus próprios dados. As regras de acesso são validadas diretamente no banco de dados.

📌 Funcionalidades
✅ Ativas:

Autenticação: Login seguro de usuários.

Ingredientes: Cadastro, edição e exclusão com conversão automática de medidas (kg/g/L/ml).

Receitas (Fichas Técnicas): Criação de receitas detalhadas com cálculo automático de custos.

Precificação: Simulador de preço de venda (markup) considerando impostos, taxas de cartão e margem de lucro desejada.

Configurações: Definição de custo de mão de obra e custos fixos para rateio automático.

Impressão: Modos de visualização "Cozinha" (operacional) e "Gerencial" (com custos).

🚧 Em Desenvolvimento (Roadmap):

Refatoração para alta precisão decimal (correção de flutuação financeira).

Testes Automatizados (Unitários e E2E).

Sistema de notificações (Toasts) para melhor experiência do usuário.

👤 Autor
Desenvolvido por Helber Ferreira

📄 Licença
MIT