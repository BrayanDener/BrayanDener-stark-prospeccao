/**
 * Os nichos ficam em supabase/functions/_shared/niches.ts para que o app e as
 * Edge Functions usem exatamente a mesma lista (o deploy do Supabase só empacota
 * arquivos dentro de supabase/functions). Edite a lista lá.
 */
export * from "../../supabase/functions/_shared/niches";
