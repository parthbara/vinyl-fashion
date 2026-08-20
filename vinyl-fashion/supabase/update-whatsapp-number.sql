-- Route the order line to the new WhatsApp number.
--
-- src/config.js carries this number as the boot default, but
-- src/lib/settings.js merges site_settings['site'].contact OVER it a
-- moment after load — so if that row exists and still holds the old
-- number, the live buttons keep pointing at the old line no matter
-- what the code says. Run this so both agree.
--
-- Same thing is editable by hand in the admin console under
-- SETTINGS → WHATSAPP; this file is just the scripted version.
--
--   wa.me needs the full international number, no + and no spaces:
--   +977 97-4771-6756  →  9779747716756

insert into site_settings (key, value)
values (
  'site',
  jsonb_build_object('contact', jsonb_build_object(
    'whatsapp',        '9779747716756',
    'whatsappDisplay', '+977 97-4771-6756'
  ))
)
on conflict (key) do update
set value = coalesce(site_settings.value, '{}'::jsonb)
            || jsonb_build_object('contact',
                 coalesce(site_settings.value -> 'contact', '{}'::jsonb)
                 || jsonb_build_object(
                      'whatsapp',        '9779747716756',
                      'whatsappDisplay', '+977 97-4771-6756'
                    ));

-- Check — both lines should read the new number.
select value -> 'contact' ->> 'whatsapp'        as wa_link_number,
       value -> 'contact' ->> 'whatsappDisplay' as shown_on_site
from site_settings
where key = 'site';
