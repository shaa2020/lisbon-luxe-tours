#!/usr/bin/env node
/**
 * Generates src/lib/database.types.ts from a migrated database, in the same
 * shape as `supabase gen types typescript` (Tables/Views/Functions/Enums with
 * Row/Insert/Update and FK relationships). Works without Docker or the
 * Supabase CLI.
 *
 * Usage: TEST_DATABASE_URL=postgres://... node scripts/gen-db-types.mjs
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:54329/shiftpilot_test";
const out = path.resolve(import.meta.dirname, "../src/lib/database.types.ts");
const client = new pg.Client({ connectionString: url });
await client.connect();

const enums = (
  await client.query(`
    select t.typname as name, array_agg(e.enumlabel::text order by e.enumsortorder)::text[] as labels
    from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' group by t.typname order by t.typname`)
).rows;
const enumNames = new Set(enums.map((e) => e.name));

function tsType(udt, isArray) {
  let base;
  if (enumNames.has(udt)) base = `Database["public"]["Enums"]["${udt}"]`;
  else if (["int2", "int4", "int8", "float4", "float8", "numeric"].includes(udt)) base = "number";
  else if (udt === "bool") base = "boolean";
  else if (["json", "jsonb"].includes(udt)) base = "Json";
  else if (["uuid", "text", "citext", "varchar", "bpchar", "date", "timestamptz", "timestamp", "time", "timetz", "interval", "inet", "name"].includes(udt)) base = "string";
  else base = "unknown";
  return isArray ? `${base}[]` : base;
}

const columns = (
  await client.query(`
    select c.relname as table, c.relkind as kind, a.attname as column, a.attnum,
           not a.attnotnull as nullable,
           (ad.adbin is not null) as has_default,
           a.attidentity <> '' as is_identity,
           a.attgenerated <> '' as is_generated,
           case when t.typcategory = 'A' then et.typname else t.typname end as udt,
           t.typcategory = 'A' as is_array
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    join pg_type t on t.oid = a.atttypid
    left join pg_type et on et.oid = t.typelem
    left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
    where n.nspname = 'public' and c.relkind in ('r', 'v')
    order by c.relname, a.attnum`)
).rows;

const fks = (
  await client.query(`
    select con.conname, c.relname as table, rc.relname as ref_table,
           array(select attname from unnest(con.conkey) with ordinality k(attnum, ord)
                 join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum order by ord)::text[] as cols,
           array(select attname from unnest(con.confkey) with ordinality k(attnum, ord)
                 join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum order by ord)::text[] as ref_cols,
           exists (select 1 from pg_index i where i.indrelid = con.conrelid and i.indisunique
                   and (select array_agg(x order by x) from unnest(i.indkey::int2[]) x) =
                       (select array_agg(x order by x) from unnest(con.conkey) x)) as one_to_one
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_class rc on rc.oid = con.confrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_namespace rn on rn.oid = rc.relnamespace
    where con.contype = 'f' and n.nspname = 'public' and rn.nspname = 'public'
    order by c.relname, con.conname`)
).rows;

const functions = (
  await client.query(`
    select p.proname as name, p.proretset as returns_set,
           coalesce(p.proargnames, '{}')::text[] as arg_names,
           coalesce(p.proargmodes::text[], '{}') as arg_modes,
           coalesce(p.proallargtypes, p.proargtypes::oid[]) as arg_types,
           p.pronargdefaults as n_defaults, p.pronargs as n_args,
           rt.typname as ret_type, rt.typtype as ret_kind, rt.typcategory as ret_cat, ret_elem.typname as ret_elem
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_type rt on rt.oid = p.prorettype
    left join pg_type ret_elem on ret_elem.oid = rt.typelem
    where n.nspname = 'public' and p.prokind = 'f' and rt.typname <> 'trigger'
      and (has_function_privilege('authenticated', p.oid, 'execute')
           or has_function_privilege('service_role', p.oid, 'execute'))
    order by p.proname`)
).rows;
const typeNames = new Map((await client.query("select oid, typname, typcategory, typelem from pg_type")).rows.map((r) => [Number(r.oid), r]));

function oidType(oid) {
  const t = typeNames.get(Number(oid));
  if (!t) return "unknown";
  if (t.typcategory === "A") return tsType(typeNames.get(Number(t.typelem))?.typname, true);
  return tsType(t.typname, false);
}

const byTable = new Map();
for (const c of columns) {
  if (!byTable.has(c.table)) byTable.set(c.table, { kind: c.kind, cols: [] });
  byTable.get(c.table).cols.push(c);
}

const ind = (n) => "  ".repeat(n);
let s = `// Generated by scripts/gen-db-types.mjs — do not edit by hand.
// Regenerate after every migration: npm run db:reset && npm run db:types

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
`;
function rels(table) {
  const list = fks.filter((f) => f.table === table);
  if (!list.length) return "[]";
  return (
    "[\n" +
    list
      .map(
        (f) =>
          `${ind(6)}{\n${ind(7)}foreignKeyName: "${f.conname}";\n${ind(7)}columns: [${f.cols.map((c) => `"${c}"`).join(", ")}];\n${ind(7)}isOneToOne: ${f.one_to_one};\n${ind(7)}referencedRelation: "${f.ref_table}";\n${ind(7)}referencedColumns: [${f.ref_cols.map((c) => `"${c}"`).join(", ")}];\n${ind(6)}},`,
      )
      .join("\n") +
    `\n${ind(5)}]`
  );
}
for (const [table, { kind, cols }] of [...byTable].filter(([, v]) => v.kind === "r")) {
  void kind;
  const row = cols.map((c) => `${ind(5)}${c.column}: ${tsType(c.udt, c.is_array)}${c.nullable ? " | null" : ""};`).join("\n");
  const insert = cols
    .map((c) => {
      if (c.is_generated) return `${ind(5)}${c.column}?: never;`;
      const optional = c.nullable || c.has_default || c.is_identity;
      return `${ind(5)}${c.column}${optional ? "?" : ""}: ${tsType(c.udt, c.is_array)}${c.nullable ? " | null" : ""};`;
    })
    .join("\n");
  const update = cols
    .map((c) => (c.is_generated ? `${ind(5)}${c.column}?: never;` : `${ind(5)}${c.column}?: ${tsType(c.udt, c.is_array)}${c.nullable ? " | null" : ""};`))
    .join("\n");
  s += `${ind(3)}${table}: {\n${ind(4)}Row: {\n${row}\n${ind(4)}};\n${ind(4)}Insert: {\n${insert}\n${ind(4)}};\n${ind(4)}Update: {\n${update}\n${ind(4)}};\n${ind(4)}Relationships: ${rels(table)};\n${ind(3)}};\n`;
}
s += `${ind(2)}};\n${ind(2)}Views: {\n`;
for (const [table, { cols }] of [...byTable].filter(([, v]) => v.kind === "v")) {
  const row = cols.map((c) => `${ind(5)}${c.column}: ${tsType(c.udt, c.is_array)} | null;`).join("\n");
  s += `${ind(3)}${table}: {\n${ind(4)}Row: {\n${row}\n${ind(4)}};\n${ind(4)}Relationships: [];\n${ind(3)}};\n`;
}
s += `${ind(2)}};\n${ind(2)}Functions: {\n`;
for (const fn of functions) {
  const modes = fn.arg_modes.length ? fn.arg_modes : fn.arg_types.map(() => "i");
  const inArgs = [];
  const outCols = [];
  fn.arg_types.forEach((oid, i) => {
    const mode = modes[i];
    const name = fn.arg_names[i] ?? `arg${i}`;
    if (mode === "i" || mode === "b") inArgs.push({ name, type: oidType(oid) });
    if (mode === "t" || mode === "o" || mode === "b") outCols.push({ name, type: oidType(oid) });
  });
  const firstDefault = fn.n_args - fn.n_defaults;
  const args = inArgs.length
    ? `{ ${inArgs.map((a, i) => `${a.name}${i >= firstDefault ? "?" : ""}: ${a.type}`).join("; ")} }`
    : "never";
  let ret;
  if (outCols.length) ret = `{ ${outCols.map((c) => `${c.name}: ${c.type}`).join("; ")} }[]`;
  else if (fn.ret_kind === "c" && byTable.has(fn.ret_type)) ret = `Database["public"]["Tables"]["${fn.ret_type}"]["Row"]${fn.returns_set ? "[]" : ""}`;
  else if (fn.ret_type === "void") ret = "undefined";
  else ret = (fn.ret_cat === "A" ? tsType(fn.ret_elem, true) : tsType(fn.ret_type, false)) + (fn.returns_set ? "[]" : "");
  s += `${ind(3)}${fn.name}: { Args: ${args}; Returns: ${ret} };\n`;
}
s += `${ind(2)}};\n${ind(2)}Enums: {\n`;
for (const e of enums) s += `${ind(3)}${e.name}: ${e.labels.map((l) => `"${l}"`).join(" | ")};\n`;
s += `${ind(2)}};\n${ind(2)}CompositeTypes: { [_ in never]: never };\n${ind(1)}};\n};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
`;
fs.writeFileSync(out, s);
await client.end();
console.log(`Wrote ${out} (${byTable.size} relations, ${functions.length} functions, ${enums.length} enums)`);
