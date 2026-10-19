-- WhatsApps oficiais das unidades Casa do Pão de Queijo
update public.menu_stores
set whatsapp = case slug
  when 'norte-sul' then '5569993539150'
  when 'cidade-alta' then '5569993652228'
  else whatsapp
end
where slug in ('norte-sul', 'cidade-alta');
