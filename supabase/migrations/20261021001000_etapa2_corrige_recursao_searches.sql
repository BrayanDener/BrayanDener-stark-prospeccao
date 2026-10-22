-- Stark Prospecção · Etapa 2 · correção
-- A checagem de source_search_id consultava a própria tabela searches dentro da política de searches
-- (recursão infinita no RLS). Ela também era desnecessária: apontar para uma busca de outra conta
-- não expõe nada, porque ler a origem continua passando pelo RLS.
alter policy "searches: inserir os próprios" on public.searches
  with check ((select auth.uid()) = user_id);
