# Pizzaria — pedido via WhatsApp

SPA vanilla + Vite + Supabase para catálogo de pizzas e checkout sem pagamento integrado.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Variáveis

Copie `.env.example` para `.env.local` e ajuste:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_WHATSAPP_NUMBER` (DDI + DDD + número)

Há valores de fallback em `src/config.js` para facilitar a validação inicial. O número de WhatsApp padrão é apenas placeholder e deve ser substituído antes de produção.

## Banco

A migration em `supabase/migrations/20261003000100_initial_schema.sql` cria:

- `public.pizzas`
- `public.orders`

Também habilita RLS, disponibiliza leitura pública somente para pizzas disponíveis e permite apenas INSERT anônimo em pedidos.

## Fluxo

1. Cliente escolhe pizzas.
2. Carrinho persiste em `localStorage`.
3. Cliente informa nome, telefone, horário e pagamento.
4. Pedido é inserido em `orders`.
5. WhatsApp abre com a mensagem pronta.
6. Carrinho é limpo após sucesso.

O pagamento não é processado nesta aplicação.
