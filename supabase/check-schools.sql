-- =====================================================================
-- Polyvo: check schools and teacher sign-up, Phase 1 (2026-11-10)
-- Run AFTER polyvo-schools-phase1.sql. Read-only: everything it makes (schools, throwaway accounts
-- zz-school-check-…, classes, requests) is rolled back at the end, so nothing in the database changes.
--
-- Nothing to fill in. Run the whole file. The result is one row per check: PASS or FAIL.
-- Every row should say PASS.
--
-- What it builds (all throwaway, all rolled back):
--   school A (approved, domain zz-a-check.example, auto-approve OFF), school B (approved, domain
--   zz-b-check.example), school D (approved, NO domain);
--   A: admin tA1, teacher tA2, student sA (class cA), student sOld (only in an ARCHIVED class),
--      class cA2 taught only by tA2;   B: admin tB, student sB (class cB);   D: teacher tD (class cD);
--   applicants (Google accounts): app1 / app2 on A's domain, appSub on a SUBDOMAIN of it, appX
--   elsewhere; pw = a username / password account; pa = a throwaway platform admin.
-- =====================================================================

do $$
declare
  v_out   text := '';
  v_check record;
  v_txt   text;
  v_got   text;
  v_ok    boolean;
  v_sA uuid := 'f1000000-0000-4000-8000-00000000000a';   -- fixed throwaway ids (rolled back)
  v_sB uuid := 'f1000000-0000-4000-8000-00000000000b';
  v_sD uuid := 'f1000000-0000-4000-8000-00000000000d';
  v_scX uuid;  -- school registered by appX
  -- accounts
  v_tA1 uuid := gen_random_uuid(); v_tA2 uuid := gen_random_uuid(); v_tB uuid := gen_random_uuid();
  v_tD uuid := gen_random_uuid();  v_stA uuid := gen_random_uuid(); v_stOld uuid := gen_random_uuid();
  v_stB uuid := gen_random_uuid(); v_app1 uuid := gen_random_uuid(); v_app2 uuid := gen_random_uuid();
  v_appSub uuid := gen_random_uuid(); v_appX uuid := gen_random_uuid(); v_pw uuid := gen_random_uuid();
  v_pa uuid := gen_random_uuid();
  -- classes
  v_cA uuid; v_cA2 uuid; v_cOld uuid; v_cB uuid; v_cB2 uuid; v_cD uuid;
  v_entry uuid;
  v_acc record;
begin
  begin   -- everything in here is rolled back at the end

    -- Throwaway accounts (Google ones get a confirmed email + a google identity, like a real sign-in)
    for v_acc in select * from (values
        (v_tA1, 'zz-school-check-ta1@zz-a-check.example', true),
        (v_tA2, 'zz-school-check-ta2@zz-a-check.example', true),
        (v_tB,  'zz-school-check-tb@zz-b-check.example', true),
        (v_tD,  'zz-school-check-td@zz-d-check.example', true),
        (v_stA, 'zz-school-check-sa@zz-a-check.example', true),
        (v_stOld, 'zz-school-check-sold@zz-a-check.example', true),
        (v_stB, 'zz-school-check-sb@zz-b-check.example', true),
        (v_app1, 'zz-school-check-app1@zz-a-check.example', true),
        (v_app2, 'zz-school-check-app2@zz-a-check.example', true),
        (v_appSub, 'zz-school-check-appsub@sub.zz-a-check.example', true),
        (v_appX, 'zz-school-check-appx@zz-x-check.example', true),
        (v_pw,  'zz-school-check-pw@polycards.test', false),
        (v_pa,  'zz-school-check-pa@zz-p-check.example', true)) a(id, email, google)
    loop
      insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data)
      values (v_acc.id, 'authenticated', 'authenticated', v_acc.email, now(),
              case when v_acc.google then jsonb_build_object('full_name', 'zzchk ' || split_part(v_acc.email, '@', 1))
                   else jsonb_build_object('username', 'zzchk-pw') end);
      if v_acc.google then
        insert into auth.identities (provider_id, user_id, identity_data, provider)
        values (v_acc.id::text, v_acc.id, jsonb_build_object('sub', v_acc.id::text, 'email', v_acc.email), 'google');
      end if;
    end loop;
    insert into public.platform_admins (user_id) values (v_pa);

    -- Schools
    insert into public.schools (id, name, prefecture, school_type, status) values
      (v_sA, 'ZZチェック学園A', 'saga', 'jhs_hs', 'approved'),
      (v_sB, 'ZZチェック学園B', 'saga', 'jhs_hs', 'approved'),
      (v_sD, 'ZZチェック学園D', 'tokyo', 'hs', 'approved');
    insert into public.school_domains (domain, school_id) values
      ('zz-a-check.example', v_sA), ('zz-b-check.example', v_sB);
    insert into public.teachers (user_id, display_name) values
      (v_tA1, 'A1先生'), (v_tA2, 'A2先生'), (v_tB, 'B先生'), (v_tD, 'D先生');
    insert into public.school_teachers (school_id, user_id, role, status) values
      (v_sA, v_tA1, 'admin', 'approved'), (v_sA, v_tA2, 'teacher', 'approved'),
      (v_sB, v_tB, 'admin', 'approved'), (v_sD, v_tD, 'admin', 'approved');

    -- Classes
    insert into public.classes (name, school_year, join_code, school_id) values ('zz A', 2026, public.new_join_code(), v_sA) returning id into v_cA;
    insert into public.classes (name, school_year, join_code, school_id) values ('zz A2', 2026, public.new_join_code(), v_sA) returning id into v_cA2;
    insert into public.classes (name, school_year, join_code, school_id, archived) values ('zz A old', 2025, public.new_join_code(), v_sA, true) returning id into v_cOld;
    insert into public.classes (name, school_year, join_code, school_id) values ('zz B', 2026, public.new_join_code(), v_sB) returning id into v_cB;
    insert into public.classes (name, school_year, join_code, school_id) values ('zz D', 2026, public.new_join_code(), v_sD) returning id into v_cD;
    insert into public.class_teachers (class_id, teacher_id) values
      (v_cA, v_tA1), (v_cA2, v_tA2), (v_cOld, v_tA1), (v_cB, v_tB), (v_cD, v_tD);
    -- A left-over link: tA1 is still listed as a teacher of school B's class (e.g. taught there
    -- before moving schools). Being in another school must still give no access to it.
    insert into public.classes (name, school_year, join_code, school_id) values ('zz B left-over', 2026, public.new_join_code(), v_sB) returning id into v_cB2;
    insert into public.class_teachers (class_id, teacher_id) values (v_cB2, v_tB), (v_cB2, v_tA1);
    insert into public.class_members (class_id, student_id, real_name) values (v_cB2, v_stB, 'Student B');
    insert into public.ticket_awards (batch_id, class_id, teacher_id, student_id, amount) values (gen_random_uuid(), v_cB2, v_tB, v_stB, 1);
    insert into public.class_members (class_id, student_id, real_name) values
      (v_cA, v_stA, 'Student A'), (v_cOld, v_stOld, 'Old Student'), (v_cB, v_stB, 'Student B');
    insert into public.class_roster_entries (class_id, email, real_name) values
      (v_cA, 'zz-school-check-pending@zz-a-check.example', 'Pending') returning id into v_entry;

    -- ------------------------------------------------------------------
    -- Single checks: each runs as the given account and is undone straight away.
    -- expect: 'err:<code>' (that error), 'ok' (no error) or 'val:<text>' (the first column, as text)
    -- ------------------------------------------------------------------
    for v_check in select * from (values
      -- Cross-school: teacher of A can't reach B
      (v_tA1, 'search_users: finds my school''s students (archived classes too), not school B''s',
              format('select count(*) filter (where id in (%L, %L)) || ''/'' || count(*) filter (where id = %L) from public.search_users(''zzchk'', false)', v_stA, v_stOld, v_stB),
              'val:2/0'),
      (v_tA1, 'search_users: never returns an email',
              'select count(*) from public.search_users(''zzchk'', false) where email is not null', 'val:0'),
      (v_tA1, 'search_users: an email typed in full finds nothing outside my school',
              'select count(*) from public.search_users(''zz-school-check-sb@zz-b-check.example'', false)', 'val:0'),
      (v_tA1, 'search_users (teachers): my school''s teachers only',
              format('select count(*) filter (where id = %L) || ''/'' || count(*) filter (where id = %L) from public.search_users(''zzchk'', true)', v_tA2, v_tB),
              'val:1/0'),
      (v_tA1, 'add_student_to_class: a school B student', format('select public.add_student_to_class(%L, %L, ''X'')', v_cA, v_stB), 'err:student_not_in_school'),
      (v_tA1, 'add_student_to_class: an account in no class (unknown to my school)', format('select public.add_student_to_class(%L, %L, ''X'')', v_cA, v_app1), 'err:student_not_in_school'),
      (v_tA1, 'add_student_to_class: last year''s student (archived class of my school)', format('select public.add_student_to_class(%L, %L, ''X'')', v_cA, v_stOld), 'ok'),
      (v_tA1, 'add_co_teacher: a school B teacher', format('select public.add_co_teacher(%L, %L)', v_cA, v_tB), 'err:target_not_teacher'),
      (v_tA1, 'add_co_teacher: a teacher of my school', format('select public.add_co_teacher(%L, %L)', v_cA, v_tA2), 'ok'),
      (v_tA1, 'class_detail: a school B class', format('select public.class_detail(%L)', v_cB), 'err:not_class_teacher'),
      (v_tA1, 'award_tickets: a school B class', format('select public.award_tickets(%L, array[%L]::uuid[], 1, null)', v_cB, v_stB), 'err:not_class_teacher'),
      (v_tA1, 'read school B''s class_members directly', format('select count(*) from public.class_members where class_id = %L', v_cB), 'val:0'),
      (v_tA1, 'read school B''s classes directly', format('select count(*) from public.classes where id = %L', v_cB), 'val:0'),
      (v_tA1, 'teacher_classes: only my school''s classes', format('select count(*) filter (where id = %L) || ''/'' || count(*) filter (where id = %L) from public.teacher_classes(false)', v_cA, v_cB), 'val:1/0'),
      (v_tA1, 'left-over link to a school B class: teacher_classes leaves it out', format('select count(*) from public.teacher_classes(false) where id = %L', v_cB2), 'val:0'),
      (v_tA1, 'left-over link to a school B class: class_detail', format('select public.class_detail(%L)', v_cB2), 'err:not_class_teacher'),
      (v_tA1, 'left-over link to a school B class: award_tickets', format('select public.award_tickets(%L, array[%L]::uuid[], 1, null)', v_cB2, v_stB), 'err:not_class_teacher'),
      (v_tA1, 'left-over link to a school B class: its roster (class_members)', format('select count(*) from public.class_members where class_id = %L', v_cB2), 'val:0'),
      (v_tA1, 'left-over link to a school B class: its student''s awards (ticket_awards)', format('select count(*) from public.ticket_awards where student_id = %L', v_stB), 'val:0'),
      (v_tB,  'left-over link: school B''s own teacher still sees the class', format('select count(*) from public.class_members where class_id = %L', v_cB2), 'val:1'),
      -- Roster paste: verified domain, exact match only
      (v_tA1, 'add_roster_entries: my domain ok, gmail / subdomain / look-alike refused',
              format('select string_agg(r->>''status'' || coalesce('':'' || (r->>''reason''), ''''), '' '' order by (r->>''row'')::int) from jsonb_array_elements(public.add_roster_entries(%L, %L::jsonb, true)) r', v_cA,
                     '[{"real_name":"A","email":"zz-new@zz-a-check.example"},{"real_name":"B","email":"zz-new@gmail.com"},{"real_name":"C","email":"zz-new@sub.zz-a-check.example"},{"real_name":"D","email":"zz-new@xzz-a-check.example"},{"real_name":"E","email":"zz-new@zz-a-check.example.evil.example"}]'),
              'val:added_pending error:outside_school_domain error:outside_school_domain error:outside_school_domain error:outside_school_domain'),
      (v_tD,  'add_roster_entries: a school with no verified domain', format('select public.add_roster_entries(%L, %L::jsonb, true)', v_cD, '[{"real_name":"A","email":"a@zz-d-check.example"}]'), 'err:school_not_verified'),
      (v_tA1, 'update_roster_entry: change to an address outside my domain', format('select public.update_roster_entry(%L, ''Pending'', null, ''zz@gmail.com'')', v_entry), 'err:outside_school_domain'),
      (v_tA1, 'update_roster_entry: an address on my domain', format('select public.update_roster_entry(%L, ''Pending'', null, ''zz-other@zz-a-check.example'')', v_entry), 'ok'),
      -- Admin rights
      (v_tA2, 'my_school: a non-admin sees no requests', 'select (public.my_school()->>''is_admin'') || ''/'' || jsonb_array_length(public.my_school()->''requests'')', 'val:false/0'),
      (v_tA2, 'set_school_admin: a non-admin', format('select public.set_school_admin(%L, true)', v_tA2), 'err:not_school_admin'),
      (v_tA2, 'remove_school_teacher: a non-admin removes someone else', format('select public.remove_school_teacher(%L)', v_tA1), 'err:not_school_admin'),
      (v_tA1, 'set_school_admin: a teacher of another school', format('select public.set_school_admin(%L, true)', v_tB), 'err:teacher_not_in_school'),
      (v_tA1, 'remove_school_teacher: a teacher of another school', format('select public.remove_school_teacher(%L)', v_tB), 'err:teacher_not_in_school'),
      (v_tB,  'set_school_admin: the last admin removes their own admin role', format('select public.set_school_admin(%L, false)', v_tB), 'err:last_admin'),
      (v_tB,  'remove_school_teacher: the last admin leaves', format('select public.remove_school_teacher(%L)', v_tB), 'err:last_admin'),
      (v_tA1, 'set_school_auto_approve: another school', format('select public.set_school_auto_approve(%L, true)', v_sB), 'err:not_school_admin'),
      (v_tD,  'set_school_auto_approve: on, with no verified domain', format('select public.set_school_auto_approve(%L, true)', v_sD), 'err:school_not_verified'),
      -- Platform admin only
      (v_tA1, 'admin_schools: a school admin is not a platform admin', 'select public.admin_schools()', 'err:not_platform_admin'),
      (v_tA1, 'admin_decide_school: a school admin', format('select public.admin_decide_school(%L, true, null)', v_sD), 'err:not_platform_admin'),
      (v_tA1, 'admin_set_school_domains: a school admin', format('select public.admin_set_school_domains(%L, array[''zz-a2.example''])', v_sA), 'err:not_platform_admin'),
      (v_pa,  'admin_set_school_domains: gmail.com', format('select public.admin_set_school_domains(%L, array[''gmail.com''])', v_sD), 'err:free_mail_domain'),
      (v_pa,  'admin_set_school_domains: @Yahoo.co.jp (any case, with @)', format('select public.admin_set_school_domains(%L, array[''@Yahoo.co.jp''])', v_sD), 'err:free_mail_domain'),
      (v_pa,  'admin_set_school_domains: a subdomain of a phone domain', format('select public.admin_set_school_domains(%L, array[''mail.docomo.ne.jp''])', v_sD), 'err:free_mail_domain'),
      (v_pa,  'admin_set_school_domains: another school''s domain', format('select public.admin_set_school_domains(%L, array[''zz-b-check.example''])', v_sD), 'err:domain_taken'),
      (v_pa,  'admin_set_school_domains: not a domain', format('select public.admin_set_school_domains(%L, array[''not a domain''])', v_sD), 'err:bad_domain'),
      (v_pa,  'admin_set_school_domains: a school domain', format('select public.admin_set_school_domains(%L, array[''ZZ-D-Check.example''])', v_sD), 'ok'),
      -- Registering
      (v_pw,  'request_join_school: a username / password account', format('select public.request_join_school(%L, ''X先生'')', v_sA), 'err:google_only'),
      (v_pw,  'register_school: a username / password account', 'select public.register_school(''ZZ新しい学校'', null, ''saga'', ''hs'', ''X先生'')', 'err:google_only'),
      (v_tA1, 'request_join_school: already a teacher of a school', format('select public.request_join_school(%L, ''X先生'')', v_sB), 'err:already_in_school'),
      (v_app1, 'register_school: the same name in the same prefecture (full-width spaces)', 'select public.register_school(''ＺＺチェック学園　Ａ'', null, ''saga'', ''jhs_hs'', ''X先生'')', 'err:school_exists'),
      (v_app1, 'register_school: a bad prefecture', 'select public.register_school(''ZZ新しい学校'', null, ''atlantis'', ''hs'', ''X先生'')', 'err:bad_prefecture'),
      (v_app1, 'register_school: no display name', 'select public.register_school(''ZZ新しい学校'', null, ''saga'', ''hs'', ''   '')', 'err:bad_display_name'),
      (v_app1, 'search_schools: finds A by part of the name, half-width / kana-insensitive',
               format('select count(*) filter (where id = %L) from public.search_schools(''ｚｚちぇっく'', ''saga'')', v_sA), 'val:1'),
      (v_app1, 'search_schools: the prefecture filter', format('select count(*) filter (where id = %L) from public.search_schools(''zzチェック'', ''tokyo'')', v_sA), 'val:0'),
      (v_app1, 'decide_school_request: not an admin', format('select public.decide_school_request(%L, true)', v_app2), 'err:not_school_admin'),
      -- Students
      (v_stA, 'student: my_school', 'select public.my_school()', 'err:not_teacher'),
      (v_stA, 'student: admin_schools', 'select public.admin_schools()', 'err:not_platform_admin'),
      (v_stA, 'student: read schools', 'select count(*) from public.schools', 'err:permission denied'),
      (v_stA, 'student: read school_teachers', 'select count(*) from public.school_teachers', 'err:permission denied'),
      (v_stA, 'student: make myself an approved teacher directly',
              format('insert into public.school_teachers (school_id, user_id, role, status) values (%L, %L, ''admin'', ''approved'')', v_sA, v_stA), 'err:permission denied'),
      (v_stA, 'student: make myself a platform admin', format('insert into public.platform_admins (user_id) values (%L)', v_stA), 'err:permission denied'),
      (v_stA, 'student: call internal user_school_id', format('select public.user_school_id(%L)', v_tA1), 'err:permission denied'),
      (v_stA, 'student: call internal student_in_school', format('select public.student_in_school(%L, %L)', v_stA, v_sA), 'err:permission denied'),
      (v_stA, 'student: call internal replace_school_domains', format('select public.replace_school_domains(%L, array[''x.example''])', v_sA), 'err:permission denied')
    ) as c(who, label, stmt, expect)
    loop
      begin
        perform set_config('request.jwt.claims', json_build_object('sub', v_check.who, 'role', 'authenticated')::text, true);
        set local role authenticated;
        execute v_check.stmt into v_txt;
        reset role;
        raise exception 'zz_check_value:%', coalesce(v_txt, 'null');
      exception when others then
        reset role;
        if sqlerrm like 'zz_check_value:%' then
          v_got := substr(sqlerrm, length('zz_check_value:') + 1);
          v_ok := v_check.expect = 'ok' or v_check.expect = 'val:' || v_got;
          v_out := v_out || (case when v_ok then 'PASS  ' else 'FAIL  ' end) || v_check.label
                || (case when v_ok then '' else ' (got ' || v_got || ', expected ' || v_check.expect || ')' end) || E'\n';
        else
          v_ok := v_check.expect like 'err:%' and position(substr(v_check.expect, 5) in sqlerrm) > 0;
          v_out := v_out || (case when v_ok then 'PASS  ' else 'FAIL  ' end) || v_check.label || ' (' || sqlerrm || ')'
                || (case when v_ok then '' else ' expected ' || v_check.expect end) || E'\n';
        end if;
      end;
    end loop;

    -- ------------------------------------------------------------------
    -- Step-by-step flows (state carries over; all rolled back at the end)
    -- ------------------------------------------------------------------

    -- 1. Same domain, auto-approve OFF (Ryukoku's setting): the request waits
    perform set_config('request.jwt.claims', json_build_object('sub', v_app1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_txt := public.request_join_school(v_sA, 'アプリ先生')->>'status';
    v_ok := public.is_teacher();
    v_got := public.my_school_status()->'membership'->>'status';
    reset role;
    v_out := v_out || (case when v_txt = 'pending' and not v_ok and v_got = 'pending' then 'PASS' else 'FAIL' end)
          || format('  same domain, auto-approve OFF: request waits, no teacher powers (%s, teacher %s, status %s)', v_txt, v_ok, v_got) || E'\n';

    -- A pending teacher can't use any teacher function
    perform set_config('request.jwt.claims', json_build_object('sub', v_app1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    begin
      perform public.create_class('zz pending', 2026);
      v_txt := 'no_error';
    exception when others then v_txt := sqlerrm;
    end;
    reset role;
    v_out := v_out || (case when position('not_teacher' in v_txt) > 0 then 'PASS' else 'FAIL' end)
          || '  a pending teacher can''t create a class (' || v_txt || ')' || E'\n';

    -- Another school's admin can't approve it; a non-admin of A can't either
    perform set_config('request.jwt.claims', json_build_object('sub', v_tB, 'role', 'authenticated')::text, true);
    set local role authenticated;
    begin
      perform public.decide_school_request(v_app1, true);
      v_txt := 'no_error';
    exception when others then v_txt := sqlerrm;
    end;
    reset role;
    v_out := v_out || (case when position('request_not_found' in v_txt) > 0 then 'PASS' else 'FAIL' end)
          || '  another school''s admin can''t approve the request (' || v_txt || ')' || E'\n';
    perform set_config('request.jwt.claims', json_build_object('sub', v_tA2, 'role', 'authenticated')::text, true);
    set local role authenticated;
    begin
      perform public.decide_school_request(v_app1, true);
      v_txt := 'no_error';
    exception when others then v_txt := sqlerrm;
    end;
    reset role;
    v_out := v_out || (case when position('not_school_admin' in v_txt) > 0 then 'PASS' else 'FAIL' end)
          || '  a non-admin teacher can''t approve the request (' || v_txt || ')' || E'\n';

    -- A's admin sees the request (with the email) and approves it
    perform set_config('request.jwt.claims', json_build_object('sub', v_tA1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_txt := (select r->>'email' from jsonb_array_elements(public.my_school()->'requests') r where (r->>'user_id')::uuid = v_app1);
    perform public.decide_school_request(v_app1, true);
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', v_app1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_ok := public.is_teacher();
    reset role;
    v_out := v_out || (case when v_txt = 'zz-school-check-app1@zz-a-check.example' and v_ok then 'PASS' else 'FAIL' end)
          || format('  the school admin sees the request and approves it: now a teacher (%s, %s)', v_txt, v_ok) || E'\n';
    select display_name into v_txt from public.teachers where user_id = v_app1;
    v_out := v_out || (case when v_txt = 'アプリ先生' then 'PASS' else 'FAIL' end)
          || '  approval saved the display name students see (' || coalesce(v_txt, 'null') || ')' || E'\n';

    -- 2. Auto-approve ON: same domain → approved at once; a SUBDOMAIN still waits
    perform set_config('request.jwt.claims', json_build_object('sub', v_tA1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_school_auto_approve(v_sA, true);
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', v_app2, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_txt := public.request_join_school(v_sA, 'アプリ2先生')->>'status';
    v_ok := public.is_teacher();
    reset role;
    v_out := v_out || (case when v_txt = 'approved' and v_ok then 'PASS' else 'FAIL' end)
          || format('  same domain, auto-approve ON: approved at once (%s, teacher %s)', v_txt, v_ok) || E'\n';
    perform set_config('request.jwt.claims', json_build_object('sub', v_appSub, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_txt := public.request_join_school(v_sA, 'サブ先生')->>'status';
    v_ok := public.is_teacher();
    reset role;
    v_out := v_out || (case when v_txt = 'pending' and not v_ok then 'PASS' else 'FAIL' end)
          || format('  auto-approve ON, but a subdomain (sub.zz-a-check.example) is not an exact match: waits (%s)', v_txt) || E'\n';

    -- Cancelling my request
    perform set_config('request.jwt.claims', json_build_object('sub', v_appSub, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.cancel_school_request();
    v_got := coalesce(public.my_school_status()->>'membership', 'null');
    reset role;
    v_out := v_out || (case when v_got = 'null' then 'PASS' else 'FAIL' end)
          || '  cancel_school_request: no request left (' || v_got || ')' || E'\n';

    -- 3. A new school: pending, no powers; only a platform admin approves it
    perform set_config('request.jwt.claims', json_build_object('sub', v_appX, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_scX := (public.register_school('ZZ新設チェック高校', 'ぜっとぜっとしんせつ', 'okinawa', 'hs', 'X先生')->>'school_id')::uuid;
    v_ok := public.is_teacher();
    v_got := (select count(*)::text from public.search_schools('ZZ新設', null));
    reset role;
    v_out := v_out || (case when v_scX is not null and not v_ok and v_got = '0' then 'PASS' else 'FAIL' end)
          || format('  register_school: pending, not a teacher yet, not in school search (search hits %s)', v_got) || E'\n';
    perform set_config('request.jwt.claims', json_build_object('sub', v_pa, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_got := (select s->>'status' from jsonb_array_elements(public.admin_schools()) s where (s->>'id')::uuid = v_scX);
    begin
      perform public.admin_decide_school(v_scX, true, array['gmail.com']);
      v_txt := 'no_error';
    exception when others then v_txt := sqlerrm;
    end;
    perform public.admin_decide_school(v_scX, true, array['zz-x-check.example']);
    reset role;
    v_out := v_out || (case when v_got = 'pending' and position('free_mail_domain' in v_txt) > 0 then 'PASS' else 'FAIL' end)
          || format('  platform admin: sees the waiting school; approving with gmail.com is refused (%s)', v_txt) || E'\n';
    perform set_config('request.jwt.claims', json_build_object('sub', v_appX, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_ok := public.is_teacher();
    v_got := (public.my_school()->>'is_admin') || '/' || (public.my_school()->'domains'->>0)
             || '/' || (public.my_school()->'school'->>'auto_approve_domain');
    reset role;
    v_out := v_out || (case when v_ok and v_got = 'true/zz-x-check.example/false' then 'PASS' else 'FAIL' end)
          || format('  approved: the registrant is the school''s first admin, domain saved, auto-approve OFF (%s)', v_got) || E'\n';

    -- 4. Removing a teacher: they lose the school's classes at once, and no class is left without a teacher
    perform set_config('request.jwt.claims', json_build_object('sub', v_tA1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.remove_school_teacher(v_tA2);
    reset role;
    select string_agg(ct.teacher_id::text, ',') into v_txt from public.class_teachers ct where ct.class_id = v_cA2;
    perform set_config('request.jwt.claims', json_build_object('sub', v_tA2, 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_ok := public.is_teacher();
    begin
      perform public.class_detail(v_cA2);
      v_got := 'no_error';
    exception when others then v_got := sqlerrm;
    end;
    reset role;
    v_out := v_out || (case when v_txt = v_tA1::text and not v_ok and position('not_teacher' in v_got) > 0 then 'PASS' else 'FAIL' end)
          || format('  remove_school_teacher: the class goes to the admin, the removed teacher loses access (%s)', v_got) || E'\n';

    -- 5. The migration: every class belongs to a school, every teacher profile has a school
    select count(*) into v_txt from public.classes where school_id is null;
    v_out := v_out || (case when v_txt = '0' then 'PASS' else 'FAIL' end) || '  every class has a school (' || v_txt || ' without)' || E'\n';
    select count(*) into v_txt from public.teachers t
    where t.user_id not in (v_app1, v_app2) and not exists (select 1 from public.school_teachers st where st.user_id = t.user_id);
    v_out := v_out || (case when v_txt = '0' then 'PASS' else 'FAIL' end) || '  every teacher has a school membership (' || v_txt || ' without)' || E'\n';
    select count(*) into v_txt from public.schools s
    where s.id = 'f0000000-0000-4000-8000-000000000001' and s.status = 'approved' and not s.auto_approve_domain
      and exists (select 1 from public.school_domains d where d.school_id = s.id and d.domain = 'ryukokurg.ed.jp');
    v_out := v_out || (case when v_txt = '1' then 'PASS' else 'FAIL' end) || '  Ryukoku: approved, domain ryukokurg.ed.jp, auto-approve OFF' || E'\n';

    raise exception 'polycards_check_done';
  exception when others then
    reset role;
    if sqlerrm <> 'polycards_check_done' then
      v_out := v_out || 'FAIL  the check itself stopped: ' || sqlerrm || E'\n';
    end if;
  end;

  perform set_config('polycards.check_result', v_out, false);
  raise notice '%', v_out;
end;
$$;

select line as result
from unnest(string_to_array(rtrim(current_setting('polycards.check_result'), E'\n'), E'\n')) as line;
