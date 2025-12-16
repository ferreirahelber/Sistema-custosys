# Sistema Custosys

Sistema web para **gestão de custos, receitas e precificação** voltado a pequenos negócios (docerias, confeitaria, alimentação artesanal, etc.).

O objetivo do projeto é facilitar o controle de ingredientes, receitas, cálculo de custos e simulação de preços de venda.

---

## 🧰 Tecnologias Utilizadas

* **React**
* **TypeScript**
* **Vite**
* **LocalStorage** (persistência local)
* **Node.js** (ambiente de desenvolvimento)

---

## 📁 Estrutura do Projeto

```
Sistema-custosys/
├─ components/        # Componentes de UI e telas
├─ services/          # Serviços (ex: storage)
├─ utils/             # Funções utilitárias e regras de negócio
├─ .gitignore
├─ .env.example
├─ App.tsx
├─ index.html
├─ index.tsx
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
└─ README.md
```

---

## ⚙️ Requisitos

Antes de começar, você precisa ter instalado:

* **Node.js** (versão 18 ou superior recomendada)
* **npm** (ou yarn/pnpm)

Verifique com:

```bash
node -v
npm -v
```

---

## 🚀 Como rodar o projeto localmente

### 1️⃣ Clonar o repositório

```bash
git clone https://github.com/ferreirahelber/Sistema-custosys.git
cd Sistema-custosys
```

---

### 2️⃣ Instalar as dependências

```bash
npm install
```

> Isso irá criar a pasta `node_modules` localmente (ela **não** é versionada no GitHub).

---

### 3️⃣ Configurar variáveis de ambiente

Crie o arquivo `.env.local` a partir do exemplo:

```bash
cp .env.example .env.local
```

Edite o `.env.local` conforme necessário.

Exemplo:

```env
VITE_APP_NAME=Sistema Custosys
VITE_STORAGE_KEY=custosys-storage
```

⚠️ O arquivo `.env.local` **não deve ser commitado**.

---

### 4️⃣ Rodar o projeto

```bash
npm run dev
```

A aplicação estará disponível em:

```
http://localhost:5173
```

---

## 💾 Persistência de Dados

Os dados do sistema (ingredientes, receitas, configurações) são armazenados no **localStorage do navegador**.

* Os dados persistem ao recarregar a página
* Se o usuário limpar o cache do navegador, os dados serão perdidos

> Em versões futuras, o sistema poderá utilizar um banco de dados (ex: Supabase).

---

## 🧪 Scripts Disponíveis

```bash
npm run dev      # Ambiente de desenvolvimento
npm run build    # Build de produção
npm run preview  # Preview do build
```

---

## 🔒 Segurança

* `node_modules/` não é versionado
* Arquivos `.env*` não são versionados
* Use `.env.example` como referência para configuração

---

## 📌 Status do Projeto

🚧 **MVP em evolução**

Funcional para uso local e testes. Melhorias planejadas:

* Persistência em banco de dados
* Autenticação de usuários
* Histórico financeiro
* Dashboard avançado

---

## 👤 Autor

Desenvolvido por **Helber Ferreira**

---

## 📄 Licença


