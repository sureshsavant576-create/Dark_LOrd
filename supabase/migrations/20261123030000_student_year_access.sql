alter table public.users
  add column if not exists study_year integer not null default 1
  check (study_year between 1 and 4);

update public.users set study_year = case id
  when 1 then 3
  when 2 then 4
  when 3 then 1
  when 4 then 2
  else study_year
end
where id between 1 and 4 and role = 'student';
