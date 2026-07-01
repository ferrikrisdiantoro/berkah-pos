-- ============================================================================
-- Berkah POS — Trigger kalkulasi, RPC share publik, dan RLS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Recalc total & status header dari item + pembayaran
-- ---------------------------------------------------------------------------
create or replace function recalc_purchase(p_id uuid)
returns void language plpgsql as $$
declare
  v_subtotal numeric(14,2);
  v_total    numeric(14,2);
  v_discount numeric(14,2);
  v_paid     numeric(14,2);
  v_status   text;
begin
  select
    coalesce(sum(round(qty * unit_price * (1 - coalesce(discount_pct,0)/100), 2)), 0),
    coalesce(sum(line_total), 0),
    coalesce(sum(round(qty * unit_price * coalesce(discount_pct,0)/100, 2)), 0)
  into v_subtotal, v_total, v_discount
  from purchase_items where purchase_id = p_id;

  select coalesce(sum(amount), 0) into v_paid from payments where purchase_id = p_id;

  select status into v_status from purchases where id = p_id;
  if v_status is distinct from 'draft' then
    v_status := case
      when v_total > 0 and v_paid >= v_total then 'paid'
      when v_paid > 0 then 'partial'
      else 'unpaid'
    end;
  end if;

  update purchases set
    subtotal = v_subtotal,
    discount_total = v_discount,
    tax_total = v_total - v_subtotal,
    total = v_total,
    paid_total = v_paid,
    status = v_status
  where id = p_id;
end;
$$;

create or replace function recalc_sale(p_id uuid)
returns void language plpgsql as $$
declare
  v_subtotal numeric(14,2);
  v_total    numeric(14,2);
  v_discount numeric(14,2);
  v_paid     numeric(14,2);
  v_status   text;
begin
  select
    coalesce(sum(round(qty * unit_price * (1 - coalesce(discount_pct,0)/100), 2)), 0),
    coalesce(sum(line_total), 0),
    coalesce(sum(round(qty * unit_price * coalesce(discount_pct,0)/100, 2)), 0)
  into v_subtotal, v_total, v_discount
  from sale_items where sale_id = p_id;

  select coalesce(sum(amount), 0) into v_paid from payments where sale_id = p_id;

  select status into v_status from sales where id = p_id;
  if v_status is distinct from 'draft' then
    v_status := case
      when v_total > 0 and v_paid >= v_total then 'paid'
      when v_paid > 0 then 'partial'
      else 'unpaid'
    end;
  end if;

  update sales set
    subtotal = v_subtotal,
    discount_total = v_discount,
    tax_total = v_total - v_subtotal,
    total = v_total,
    paid_total = v_paid,
    status = v_status
  where id = p_id;
end;
$$;

-- Trigger wrappers
create or replace function trg_recalc_purchase_items()
returns trigger language plpgsql as $$
begin
  perform recalc_purchase(coalesce(new.purchase_id, old.purchase_id));
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_purchase_items_recalc on purchase_items;
create trigger trg_purchase_items_recalc
  after insert or update or delete on purchase_items
  for each row execute function trg_recalc_purchase_items();

create or replace function trg_recalc_sale_items()
returns trigger language plpgsql as $$
begin
  perform recalc_sale(coalesce(new.sale_id, old.sale_id));
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_sale_items_recalc on sale_items;
create trigger trg_sale_items_recalc
  after insert or update or delete on sale_items
  for each row execute function trg_recalc_sale_items();

create or replace function trg_recalc_payment()
returns trigger language plpgsql as $$
begin
  if coalesce(new.kind, old.kind) = 'purchase' then
    perform recalc_purchase(coalesce(new.purchase_id, old.purchase_id));
  else
    perform recalc_sale(coalesce(new.sale_id, old.sale_id));
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_payments_recalc on payments;
create trigger trg_payments_recalc
  after insert or update or delete on payments
  for each row execute function trg_recalc_payment();

-- ---------------------------------------------------------------------------
-- Stok: mutasi otomatis dari item pembelian (masuk) & penjualan (keluar)
-- ---------------------------------------------------------------------------
create or replace function apply_stock_delta(p_product uuid, p_delta numeric)
returns void language plpgsql as $$
begin
  if p_product is null or p_delta = 0 then return; end if;
  update products set stock = stock + p_delta
   where id = p_product and track_stock = true;
end;
$$;

create or replace function trg_stock_purchase_items()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    perform apply_stock_delta(new.product_id, new.qty);
  elsif tg_op = 'DELETE' then
    perform apply_stock_delta(old.product_id, -old.qty);
  elsif tg_op = 'UPDATE' then
    perform apply_stock_delta(old.product_id, -old.qty);
    perform apply_stock_delta(new.product_id, new.qty);
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_purchase_items_stock on purchase_items;
create trigger trg_purchase_items_stock
  after insert or update or delete on purchase_items
  for each row execute function trg_stock_purchase_items();

create or replace function trg_stock_sale_items()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    perform apply_stock_delta(new.product_id, -new.qty);
  elsif tg_op = 'DELETE' then
    perform apply_stock_delta(old.product_id, old.qty);
  elsif tg_op = 'UPDATE' then
    perform apply_stock_delta(old.product_id, old.qty);
    perform apply_stock_delta(new.product_id, -new.qty);
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_sale_items_stock on sale_items;
create trigger trg_sale_items_stock
  after insert or update or delete on sale_items
  for each row execute function trg_stock_sale_items();

-- ---------------------------------------------------------------------------
-- RPC share publik (SECURITY DEFINER — dipanggil anon dengan share_token)
-- ---------------------------------------------------------------------------
create or replace function get_shared_purchase(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  select jsonb_build_object(
    'doc_type', 'purchase',
    'business', (select to_jsonb(b) from business_settings b where id = 1),
    'purchase', to_jsonb(p) - 'created_by',
    'contact', (select to_jsonb(c) from contacts c where c.id = p.contact_id),
    'items', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.position)
      from purchase_items i where i.purchase_id = p.id
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', pay.date, 'amount', pay.amount, 'method', pay.method,
        'account', (select ba.name from bank_accounts ba where ba.id = pay.account_id)))
      from payments pay where pay.purchase_id = p.id
    ), '[]'::jsonb)
  )
  into v_result
  from purchases p
  where p.share_token = p_token;
  return v_result;
end;
$$;

create or replace function get_shared_sale(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  select jsonb_build_object(
    'doc_type', 'sale',
    'business', (select to_jsonb(b) from business_settings b where id = 1),
    'sale', to_jsonb(s) - 'created_by',
    'contact', (select to_jsonb(c) from contacts c where c.id = s.contact_id),
    'items', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.position)
      from sale_items i where i.sale_id = s.id
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', pay.date, 'amount', pay.amount, 'method', pay.method,
        'account', (select ba.name from bank_accounts ba where ba.id = pay.account_id)))
      from payments pay where pay.sale_id = s.id
    ), '[]'::jsonb)
  )
  into v_result
  from sales s
  where s.share_token = p_token;
  return v_result;
end;
$$;

grant execute on function get_shared_purchase(uuid) to anon, authenticated;
grant execute on function get_shared_sale(uuid) to anon, authenticated;
grant execute on function next_doc_number(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS — single-tenant: semua user login (authenticated) punya akses penuh.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','business_settings','bank_accounts','units','product_categories',
    'products','contacts','document_counters','purchases','purchase_items',
    'sales','sale_items','payments','stock_movements'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I on %I;', t || '_auth_all', t);
    execute format(
      'create policy %I on %I for all to authenticated using (true) with check (true);',
      t || '_auth_all', t);
  end loop;
end $$;
